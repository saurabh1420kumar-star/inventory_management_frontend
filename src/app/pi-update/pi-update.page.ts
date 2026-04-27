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
    CommonModule, FormsModule, RouterModule, IonicModule
  ]
})
export class PiUpdatePage implements OnInit, ViewWillEnter {

  /* ── Data ── */
  orders: PIOrderTile[] = [];
  filteredOrders: PIOrderTile[] = [];

  /* ── UI State ── */
  isLoading = false;
  searchTerm = '';
  errorMessage = '';

  /* ── Approve Dispatch Modal ── */
  isApproveModalOpen = false;
  selectedOrder: PIOrderTile | null = null;
  selectedLedgerBalance: number = 0;
  isBalanceSufficient = false;
  isApproving = false;
  isLoadingBalance = false;

  /* ── Approve by Credit Modal ── */
  isApproveCreditModalOpen = false;
  selectedOrderCredit: PIOrderTile | null = null;
  isApprovingCredit = false;

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
  /*  APPROVE DISPATCH MODAL                                       */
  /* ══════════════════════════════════════════════════════════════ */
  openApproveModal(order: PIOrderTile) {
    this.haptic.medium();
    this.selectedOrder = order;
    this.selectedLedgerBalance = 0;
    this.isBalanceSufficient = false;
    this.isLoadingBalance = true;
    this.isApproveModalOpen = true;

    /* Fetch real closing balance from payment history API */
    this.ledgerService.getPaymentHistory(order.distributorId).subscribe({
      next: (response: any) => {
        const closingBalance = response?.data?.closingBalance ?? 0;
        this.selectedLedgerBalance = Number(closingBalance);
        this.isBalanceSufficient = this.selectedLedgerBalance >= order.amount;
        this.isLoadingBalance = false;
      },
      error: () => {
        this.selectedLedgerBalance = 0;
        this.isBalanceSufficient = false;
        this.isLoadingBalance = false;
        this.toast.present('Failed to fetch ledger balance', 'warning');
      }
    });
  }

  closeApproveModal() {
    this.haptic.light();
    this.isApproveModalOpen = false;
    this.selectedOrder = null;
    this.isApproving = false;
    this.isLoadingBalance = false;
  }

  confirmApproveDispatch() {
    if (!this.selectedOrder || !this.isBalanceSufficient) return;
    this.haptic.medium();
    this.isApproving = true;

    // approve-PI expects the cart id
    const orderId = this.selectedOrder.invoice.id;
    const distributorId = this.selectedOrder.invoice.distributorId ?? this.selectedOrder.distributorId;

    this.dispatchService.approvePayment(orderId, distributorId).subscribe({
      next: (res) => {
        this.isApproving = false;
        this.closeApproveModal();
        const successMsg = res?.message || 'Dispatch approved successfully!';
        this.toast.present(successMsg, 'success');
        this.loadData();
        setTimeout(() => {
          this.router.navigate(['/dispatch']);
        }, 350);
      },
      error: (err) => {
        console.error('Error approving dispatch:', err);
        this.isApproving = false;
        const msg = err?.error?.message || err?.message || 'Failed to approve dispatch';
        this.toast.present(msg, 'danger');
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════ */
  /*  APPROVE BY CREDIT MODAL                                      */
  /* ══════════════════════════════════════════════════════════════ */
  openApproveCreditModal(order: PIOrderTile) {
    this.haptic.medium();
    this.selectedOrderCredit = order;
    this.isApprovingCredit = false;
    this.isApproveCreditModalOpen = true;
  }

  closeApproveCreditModal() {
    this.haptic.light();
    this.isApproveCreditModalOpen = false;
    this.selectedOrderCredit = null;
    this.isApprovingCredit = false;
  }

  confirmApproveCredit() {
    if (!this.selectedOrderCredit) return;
    this.haptic.medium();
    this.isApprovingCredit = true;

    const cartId = this.selectedOrderCredit.invoice.id;
    const distributorId = this.selectedOrderCredit.invoice.distributorId ?? this.selectedOrderCredit.distributorId;

    this.ledgerService.approvePIUsingCredit(cartId, distributorId).subscribe({
      next: (res) => {
        this.isApprovingCredit = false;
        this.closeApproveCreditModal();
        this.toast.present('Proforma invoice approved by credit successfully!', 'success');
        this.loadData();
        setTimeout(() => {
          this.router.navigate(['/dispatch']);
        }, 350);
      },
      error: (err) => {
        console.error('Error approving by credit:', err);
        this.isApprovingCredit = false;
        const rawMsg: string = err?.error?.error || err?.error?.message || err?.message || 'Failed to approve by credit';
        const match = rawMsg.match(/Credit not available for distributor/i);
        const msg = match ? 'Credit not available for distributor' : rawMsg;
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
