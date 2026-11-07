import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, ViewWillEnter } from '@ionic/angular';

import { forkJoin, catchError, of } from 'rxjs';
import { LedgerService } from '../services/accountsLedger.service';
import { DispatchService } from '../services/dispatch.service';
import { SalesService, PendingOrder } from '../services/sales.service';
import { Toast } from '../services/toast';
import { HapticService } from '../services/haptic.service';
import { Auth } from '../services/auth';
import { AclDirective } from '../acl/acl.directive';

/* ── Display model ── */
interface PIOrderTile {
  invoice: PendingOrder;
  distributorName: string;
  orderNo: string;
  amount: number;
  distributorId: number;
  isDispatched?: boolean;
}

@Component({
  selector: 'app-pi-update',
  standalone: true,
  templateUrl: './pi-update.page.html',
  styleUrls: ['./pi-update.page.scss'],
  imports: [
    CommonModule, FormsModule, RouterModule, IonicModule, AclDirective
  ]
})
export class PiUpdatePage implements OnInit, ViewWillEnter {

  /** Feature key used for CRUD button gating on this page. */
  readonly FEATURE = 'ACCOUNTS_PI_UPDATE';

  /* ── Data ── */
  orders: PIOrderTile[] = [];
  filteredOrders: PIOrderTile[] = [];

  /* ── UI State ── */
  isLoading = false;
  searchTerm = '';
  errorMessage = '';

  /* ── Approve Order Modal (unified: ledger balance + credit balance) ── */
  isApproveModalOpen = false;
  selectedOrder: PIOrderTile | null = null;
  selectedLedgerBalance: number = 0;
  selectedCreditBalance: number = 0;
  isApproving = false;
  isLoadingBalance = false;
  balanceLoadFailed = false;

  /** Ledger + credit — what the order can be paid from. */
  get combinedBalance(): number {
    return this.selectedLedgerBalance + this.selectedCreditBalance;
  }

  /** How much the order exceeds the combined balance (0 when covered). */
  get balanceShortfall(): number {
    return Math.max(0, (this.selectedOrder?.amount ?? 0) - this.combinedBalance);
  }

  /** Approve is only allowed once balances loaded and ledger + credit covers the order amount. */
  get isBalanceSufficient(): boolean {
    return !!this.selectedOrder && !this.isLoadingBalance && !this.balanceLoadFailed
      && this.combinedBalance >= this.selectedOrder.amount;
  }

  /* ── Reject Modal ── */
  isRejectModalOpen = false;
  rejectOrder: PIOrderTile | null = null;
  rejectReason = '';
  isRejecting = false;

  private haptic = inject(HapticService);
  Math = Math; // Expose to template

  constructor(
    private salesService: SalesService,
    private ledgerService: LedgerService,
    private dispatchService: DispatchService,
    private toast: Toast,
    private auth: Auth,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  /* ══════════════════════════════════════════════════════════════ */
  /*  LOAD DATA                                                    */
  /* ══════════════════════════════════════════════════════════════ */
  loadData() {
    this.isLoading = true;
    this.errorMessage = '';

    this.salesService.getApproveCarts().subscribe({
      next: (carts) => {
        const list: PendingOrder[] = Array.isArray(carts) ? carts : (carts as any)?.data || [];
        this.orders = list
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(cart => ({
            invoice: cart,
            distributorName: cart.distributorName || `Distributor #${cart.distributorId}`,
            orderNo: `ORD-${cart.id}`,
            amount: cart.totalCartAmount,
            distributorId: cart.distributorId ?? 0,
            isDispatched: false
          }));
        this.filterOrders();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading PI requests:', err);
        this.errorMessage = 'Failed to load data. Please try again.';
        this.isLoading = false;
        this.toast.present('Error loading PI requests', 'danger');
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════ */
  /*  SEARCH / FILTER                                              */
  /* ══════════════════════════════════════════════════════════════ */
  onSearchChange(event: any) {
    this.searchTerm = (event?.detail?.value || event?.target?.value || '').toLowerCase();
    this.filterOrders();
  }

  filterOrders() {
    if (!this.searchTerm) {
      this.filteredOrders = [...this.orders];
      return;
    }
    this.filteredOrders = this.orders.filter(o =>
      o.orderNo.toLowerCase().includes(this.searchTerm) ||
      o.distributorName.toLowerCase().includes(this.searchTerm) ||
      o.amount.toString().includes(this.searchTerm) ||
      o.distributorId.toString().includes(this.searchTerm)
    );
  }

  /* ══════════════════════════════════════════════════════════════ */
  /*  APPROVE ORDER MODAL (unified ledger + credit)                */
  /* ══════════════════════════════════════════════════════════════ */
  openApproveModal(order: PIOrderTile) {
    this.haptic.medium();
    this.selectedOrder = order;
    this.selectedLedgerBalance = 0;
    this.selectedCreditBalance = 0;
    this.balanceLoadFailed = false;
    this.isApproving = false;
    this.isLoadingBalance = true;
    this.isApproveModalOpen = true;
    this.loadBalances(order);
  }

  /** Fetches ledger (netBalance, excludes credit-line entries) and remaining credit, then shows them combined. */
  loadBalances(order: PIOrderTile) {
    this.balanceLoadFailed = false;
    this.isLoadingBalance = true;

    forkJoin({
      ledger: this.ledgerService.getPaymentHistory(order.distributorId),
      credit: this.dispatchService.getDistributorCreditBalance(order.distributorId)
    }).subscribe({
      next: ({ ledger, credit }) => {
        if (this.selectedOrder !== order) return; // modal closed / switched while loading
        const net = Number((ledger as any)?.data?.netBalance);
        const creditBal = Number(credit?.creditBalance);
        if (!(ledger as any)?.success || !Number.isFinite(net) || !Number.isFinite(creditBal)) {
          this.failBalanceLoad();
          return;
        }
        this.selectedLedgerBalance = net;
        this.selectedCreditBalance = creditBal;
        this.isLoadingBalance = false;
      },
      error: (err) => {
        console.error('Error loading balances for approval:', err);
        if (this.selectedOrder !== order) return;
        this.failBalanceLoad();
      }
    });
  }

  private failBalanceLoad() {
    this.selectedLedgerBalance = 0;
    this.selectedCreditBalance = 0;
    this.balanceLoadFailed = true;
    this.isLoadingBalance = false;
    this.toast.present('Failed to fetch ledger / credit balance', 'warning');
  }

  retryLoadBalances() {
    if (this.selectedOrder) this.loadBalances(this.selectedOrder);
  }

  closeApproveModal() {
    this.haptic.light();
    this.isApproveModalOpen = false;
    this.selectedOrder = null;
    this.isApproving = false;
    this.isLoadingBalance = false;
    this.balanceLoadFailed = false;
  }

  confirmApproveOrder() {
    if (!this.selectedOrder || !this.isBalanceSufficient || this.isApproving) return;
    this.haptic.medium();
    this.isApproving = true;

    // distributorId is derived server-side from the order — only the cart/order id is sent.
    const orderId = this.selectedOrder.invoice.id;

    this.dispatchService.approveOrderUnified(orderId).subscribe({
      next: (res) => {
        this.isApproving = false;
        const status = (res?.status || '').toUpperCase();

        if (status === 'APPROVED') {
          this.closeApproveModal();
          this.toast.present(res?.message || 'Order approved successfully!', 'success');
          this.loadData();
          setTimeout(() => {
            this.router.navigate(['/dispatch']);
          }, 350);
        } else if (status === 'PENDING') {
          // Server says ledger + credit can't cover it — order stays in the list.
          this.closeApproveModal();
          this.toast.present(`Insufficient balance — shortfall ${this.formatAmount(res?.shortfall ?? 0)}`, 'warning');
        } else if (status === 'ALREADY_APPROVED') {
          this.closeApproveModal();
          this.toast.present(res?.message || 'This order is already approved', 'warning');
          this.loadData();
        } else {
          this.closeApproveModal();
          this.toast.present(res?.message || 'Unexpected approval response', 'warning');
          this.loadData();
        }
      },
      error: (err) => {
        console.error('Error approving order:', err);
        this.isApproving = false;
        const msg = err?.error?.message || err?.error?.error || err?.message || 'Failed to approve order';
        this.toast.present(msg, 'danger');
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════ */
  /*  REJECT MODAL                                                 */
  /* ══════════════════════════════════════════════════════════════ */
  openRejectModal(order: PIOrderTile) {
    this.haptic.medium();
    this.rejectOrder = order;
    this.rejectReason = '';
    this.isRejectModalOpen = true;
  }

  closeRejectModal() {
    this.haptic.light();
    this.isRejectModalOpen = false;
    this.rejectOrder = null;
    this.rejectReason = '';
    this.isRejecting = false;
  }

  confirmReject() {
    if (!this.rejectOrder || !this.rejectReason.trim()) return;
    this.haptic.medium();
    this.isRejecting = true;

    const cartId = this.rejectOrder.invoice.id;

    this.dispatchService.dismissOrder(cartId, this.rejectReason.trim()).subscribe({
      next: () => {
        this.isRejecting = false;
        this.toast.present('Order rejected successfully', 'success');
        /* Remove from list */
        const rejectedId = this.rejectOrder?.invoice.id;
        this.closeRejectModal();
        this.orders = this.orders.filter(o => o.invoice.id !== rejectedId);
        this.filterOrders();
      },
      error: (err) => {
        console.error('Error rejecting order:', err);
        this.isRejecting = false;
        const serverMsg = err?.error?.message || err?.message || 'Failed to reject order';
        const msg = `${serverMsg} — Reason: ${this.rejectReason.trim()}`;
        this.toast.present(msg, 'danger');
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════ */
  /*  HELPERS                                                      */
  /* ══════════════════════════════════════════════════════════════ */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  refresh() {
    this.loadData();
  }

  handlePullRefresh(event: any) {
    this.loadData();
    setTimeout(() => event.target.complete(), 1500);
  }

  get approvedCount(): number {
    return this.orders.length;
  }
}
