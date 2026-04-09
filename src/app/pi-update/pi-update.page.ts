import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { forkJoin, of, catchError } from 'rxjs';
import { ProformaInvoiceService, ProformaInvoice } from '../services/proforma-invoice.service';
import { LedgerService, LedgerDto } from '../services/accountsLedger.service';
import { DispatchService } from '../services/dispatch.service';
import { Toast } from '../services/toast';
import { HapticService } from '../services/haptic.service';
import { Auth } from '../services/auth';

/* ── Display model ── */
interface PIOrderTile {
  invoice: ProformaInvoice;
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
export class PiUpdatePage implements OnInit {

  /* ── Data ── */
  orders: PIOrderTile[] = [];
  filteredOrders: PIOrderTile[] = [];
  ledgers: LedgerDto[] = [];
  distributorMap: Map<number, string> = new Map();

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

  /* ── Reject Modal ── */
  isRejectModalOpen = false;
  rejectOrder: PIOrderTile | null = null;
  rejectReason = '';
  isRejecting = false;

  private haptic = inject(HapticService);
  Math = Math; // Expose to template

  constructor(
    private proformaInvoiceService: ProformaInvoiceService,
    private ledgerService: LedgerService,
    private dispatchService: DispatchService,
    private toast: Toast,
    private auth: Auth,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  /* ══════════════════════════════════════════════════════════════ */
  /*  LOAD DATA                                                    */
  /* ══════════════════════════════════════════════════════════════ */
  loadData() {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      invoices: this.proformaInvoiceService.getAllInvoices().pipe(
        catchError(err => { console.error('Error fetching invoices:', err); return of([] as ProformaInvoice[]); })
      ),
      ledgers: this.ledgerService.getAllLedgers().pipe(
        catchError(err => { console.error('Error fetching ledgers:', err); return of({ data: [] } as any); })
      ),
      distributors: this.ledgerService.getDistributors().pipe(
        catchError(err => { console.error('Error fetching distributors:', err); return of({ data: [] } as any); })
      )
    }).subscribe({
      next: ({ invoices, ledgers, distributors }) => {
        console.log('PI Update - Raw invoices:', invoices);
        console.log('PI Update - Raw ledgers:', ledgers);
        console.log('PI Update - Raw distributors:', distributors);

        /* Build distributor name map */
        this.distributorMap.clear();
        const distList = Array.isArray(distributors) ? distributors : distributors?.data || [];
        distList.forEach((d: any) => {
          const displayName = d.firstName && d.lastName
            ? `${d.firstName} ${d.lastName}`
            : d.name || d.accountName || `Distributor #${d.id}`;
          this.distributorMap.set(d.id, displayName);
        });

        /* Store ledgers */
        this.ledgers = Array.isArray(ledgers) ? ledgers : ledgers?.data || [];

        /* All proforma invoices = PI approved/ready orders */
        const invoiceList = Array.isArray(invoices) ? invoices : (invoices as any)?.data || [];
        console.log('PI Update - Invoice list (parsed):', invoiceList);
        console.log('PI Update - Invoice statuses:', invoiceList.map((i: any) => i.paymentStatus));

        this.orders = invoiceList
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((inv: any) => ({
            invoice: inv,
            distributorName: this.distributorMap.get(inv.distributorId) || `Distributor #${inv.distributorId}`,
            orderNo: inv.piNumber || `ORD-${inv.cartId}`,
            amount: inv.amount,
            distributorId: inv.distributorId
          }));

        console.log('PI Update - Filtered orders (PAID):', this.orders);
        this.filterOrders();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading PI update data:', err);
        this.errorMessage = 'Failed to load data. Please try again.';
        this.isLoading = false;
        this.toast.present('Error loading PI approved orders', 'danger');
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

    const orderId = this.selectedOrder.invoice.cartId;
    const distributorId = this.selectedOrder.distributorId;

    this.dispatchService.approvePayment(orderId, distributorId).subscribe({
      next: (res) => {
        this.isApproving = false;
        /* Mark the card as dispatched instead of removing */
        const approvedId = this.selectedOrder?.invoice.id;
        this.closeApproveModal();
        this.toast.present('Dispatch approved successfully!', 'success');
        const target = this.orders.find(o => o.invoice.id === approvedId);
        if (target) target.isDispatched = true;
        this.filterOrders();
        // Wait for the modal dismiss animation to finish before navigating
        // to prevent Ionic page transition conflicts that cause the UI to get stuck
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

    const cartId = this.rejectOrder.invoice.cartId;

    this.dispatchService.rejectGdn(cartId, this.rejectReason.trim()).subscribe({
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
        const msg = err?.error?.message || err?.message || 'Failed to reject order';
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
