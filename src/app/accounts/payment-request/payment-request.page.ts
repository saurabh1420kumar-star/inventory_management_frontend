import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AccountsService } from '../../services/accounts.service';
import { Auth } from '../../services/auth';
import { HapticService } from '../../services/haptic.service';
import { Toast } from '../../services/toast';
import { AclDirective } from '../../acl/acl.directive';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  refreshOutline,
  searchOutline,
  filterOutline,
  closeOutline,
  checkmarkCircleOutline,
  checkmarkCircle,
  closeCircleOutline,
  timeOutline,
  cashOutline,
  cardOutline,
  businessOutline,
  calendarOutline,
  documentTextOutline,
  informationCircleOutline,
  arrowForwardOutline,
  arrowBackOutline,
  chevronDownOutline,
  chevronUpOutline,
  funnelOutline,
  receiptOutline,
  trendingUpOutline,
  alertCircleOutline,
  ellipsisVerticalOutline,
  eyeOutline,
  swapVerticalOutline,
  phonePortraitOutline,
  banOutline,
  shieldCheckmarkOutline,
  chatboxEllipsesOutline,
  sparklesOutline,
} from 'ionicons/icons';

export interface PaymentRequest {
  id: number;
  paymentRequestNo: string;
  distributorId: number;
  distributorName: string;
  distributorCode: string;
  orderId: number;
  orderNo: string;
  amount: number;
  transactionType: string;
  paymentMethod: 'RTGS' | 'NEFT' | 'IMPS' | 'UPI' | 'CHEQUE' | string;
  utrNumber?: string;
  chequeNumber?: string;
  bankName?: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  receiptUrl?: string;
}

@Component({
  selector: 'app-payment-request',
  templateUrl: './payment-request.page.html',
  styleUrls: ['./payment-request.page.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, AclDirective],
})
export class PaymentRequestPage implements OnInit {

  /** Feature key used for CRUD button gating on this page. */
  readonly FEATURE = 'ACCOUNTS_PAYMENT_REQUESTS';

  // ── Data ──────────────────────────────────────────────────────────────────
  allPayments: PaymentRequest[] = [];
  filteredPayments: PaymentRequest[] = [];

  // ── UI State ──────────────────────────────────────────────────────────────
  isLoading = false;
  isDetailModalOpen = false;
  isApproveModalOpen = false;
  isRejectModalOpen = false;
  selectedPayment: PaymentRequest | null = null;
  rejectionReason = '';
  approvalNote = '';
  isSubmitting = false;
  rejectionChips = [
    'Duplicate payment',
    'Incorrect amount',
    'UTR / reference not found',
    'Payment not received in bank',
  ];

  // ── Filters ───────────────────────────────────────────────────────────────
  searchQuery = '';
  statusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL';
  methodFilter = 'ALL';
  activeTab: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL';

  // ── Pagination ────────────────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 10;

  errorMessage = '';

  private haptic = inject(HapticService);

  constructor(
    private toast: Toast,
    private accountsService: AccountsService,
    private auth: Auth,
  ) {
    addIcons({
      walletOutline, refreshOutline, searchOutline, filterOutline, closeOutline,
      checkmarkCircleOutline, checkmarkCircle, closeCircleOutline, timeOutline,
      cashOutline, cardOutline, businessOutline, calendarOutline, documentTextOutline,
      informationCircleOutline, arrowForwardOutline, arrowBackOutline,
      chevronDownOutline, chevronUpOutline, funnelOutline, receiptOutline,
      trendingUpOutline, alertCircleOutline, ellipsisVerticalOutline, eyeOutline,
      swapVerticalOutline, phonePortraitOutline, banOutline,
      shieldCheckmarkOutline, chatboxEllipsesOutline, sparklesOutline,
    });
  }

  ngOnInit() {
    this.loadPayments();
  }

  loadPayments() {
    this.isLoading = true;
    this.errorMessage = '';
    this.accountsService.getAllPendingPayments().subscribe({
      next: (data) => {
        this.allPayments = (Array.isArray(data) ? data : (data as any)?.data ?? []).map(
          (raw: any, i: number) => this.mapToPaymentRequest(raw, i)
        );
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load payment requests:', err);
        this.errorMessage = err?.error?.message || 'Failed to load payment requests. Please try again.';
        this.isLoading = false;
      },
    });
  }

  private normalizeStatus(raw: string): 'PENDING' | 'APPROVED' | 'REJECTED' {
    const s = (raw ?? '').toUpperCase().replace(/[\s-]/g, '_');
    if (['PAYMENT_ADDED', 'PENDING'].includes(s)) return 'PENDING';
    if (['PAYMENT_APPROVED', 'APPROVED'].includes(s)) return 'APPROVED';
    if (['PAYMENT_REJECTED', 'REJECTED'].includes(s)) return 'REJECTED';
    return 'PENDING';
  }

  private mapToPaymentRequest(raw: any, index: number): PaymentRequest {
    const id = raw.id ?? raw.paymentId ?? raw.requestId ?? (index + 1);
    return {
      id,
      paymentRequestNo: raw.paymentRequestNo ?? raw.referenceNo ?? raw.requestNo ?? `PR-${id}`,
      distributorId:    raw.distributorId ?? raw.distributor?.id ?? 0,
      distributorName:  raw.distributorName ?? raw.distributor?.name ?? raw.distributor?.fullName ?? 'Unknown',
      distributorCode:  raw.distributorCode ?? raw.distributor?.code ?? '',
      orderId:          raw.orderId ?? raw.cartId ?? raw.order?.id ?? 0,
      orderNo:          raw.orderNo ?? raw.orderNumber ?? (raw.orderId ? `ORD-${raw.orderId}` : (raw.cartId ? `CART-${raw.cartId}` : '')),
      amount:           raw.amount ?? raw.totalAmount ?? raw.paymentAmount ?? 0,
      transactionType:  raw.transactionType ?? 'CREDIT',
      paymentMethod:    (raw.paymentMethod ?? raw.method ?? 'OTHER').toUpperCase(),
      utrNumber:        raw.utrNumber ?? raw.utr ?? raw.transactionReference ?? raw.transactionId,
      chequeNumber:     raw.chequeNumber ?? raw.chequeNo,
      bankName:         raw.bankName ?? raw.bank,
      description:      raw.description ?? raw.remarks ?? raw.note,
      status:           this.normalizeStatus(raw.status ?? 'PENDING'),
      createdAt:        raw.createdAt ?? raw.submittedAt ?? raw.requestedAt ?? new Date().toISOString(),
      approvedAt:       raw.approvedAt,
      approvedBy:       raw.approvedBy,
      rejectedAt:       raw.rejectedAt,
      rejectedBy:       raw.rejectedBy,
      rejectionReason:  raw.rejectionReason ?? raw.rejectReason ?? raw.remarks,
      receiptUrl:       raw.receiptUrl ?? raw.receipt,
    };
  }

  handleRefresh() {
    this.loadPayments();
    this.showToast('Payment requests refreshed', 'success');
  }
  handlePullRefresh(event: any) {
    this.handleRefresh();
    setTimeout(() => event.target.complete(), 1500);
  }
  // ── Tabs & Filters ────────────────────────────────────────────────────────

  selectTab(tab: string) {
    this.haptic.selectionChanged();
    this.activeTab = tab as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
    this.statusFilter = this.activeTab;
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.allPayments];

    if (this.statusFilter !== 'ALL') {
      result = result.filter(p => p.status === this.statusFilter);
    }
    if (this.methodFilter !== 'ALL') {
      result = result.filter(p => p.paymentMethod === this.methodFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.distributorName.toLowerCase().includes(q) ||
        p.paymentRequestNo.toLowerCase().includes(q) ||
        p.orderNo.toLowerCase().includes(q) ||
        (p.utrNumber || '').toLowerCase().includes(q)
      );
    }
    this.filteredPayments = result;
  }

  clearFilters() {
    this.searchQuery = '';
    this.methodFilter = 'ALL';
    this.currentPage = 1;
    this.applyFilters();
  }

  // ── Detail / Actions ──────────────────────────────────────────────────────

  openDetail(payment: PaymentRequest) {
    this.haptic.light();
    this.selectedPayment = payment;
    this.isDetailModalOpen = true;
  }

  openApproveModal(payment: PaymentRequest) {
    this.haptic.medium();
    this.selectedPayment = payment;
    this.approvalNote = '';
    this.isApproveModalOpen = true;
  }

  submitApproval() {
    this.haptic.heavy();
    if (!this.selectedPayment) return;
    const payment = this.selectedPayment;
    const userId = this.auth.getUserId() ?? 0;
    this.isSubmitting = true;

    this.accountsService.approvePayment(payment.id, userId).subscribe({
      next: () => {
        this.isApproveModalOpen = false;
        this.isDetailModalOpen = false;
        this.isSubmitting = false;
        this.approvalNote = '';
        this.selectedPayment = null;
        this.loadPayments();
        this.showToast(`${payment.paymentRequestNo} approved successfully`, 'success');
      },
      error: (err) => {
        // Backend sometimes returns a non-2xx even when the approval was committed.
        // Close modals immediately, then reload data to determine the actual result.
        this.isApproveModalOpen = false;
        this.isDetailModalOpen = false;
        this.isSubmitting = false;
        this.approvalNote = '';
        this.selectedPayment = null;
        this.isLoading = true;
        this.accountsService.getAllPendingPayments().subscribe({
          next: (data) => {
            this.allPayments = (Array.isArray(data) ? data : (data as any)?.data ?? []).map(
              (raw: any, i: number) => this.mapToPaymentRequest(raw, i)
            );
            this.applyFilters();
            this.isLoading = false;
            // If the payment is no longer PENDING it was successfully approved.
            const stillPending = this.allPayments.find(p => p.id === payment.id && p.status === 'PENDING');
            if (!stillPending) {
              this.showToast(`${payment.paymentRequestNo} approved successfully`, 'success');
            } else {
              this.showToast(err?.error?.message || 'Failed to approve payment. Please try again.', 'danger');
            }
          },
          error: () => {
            this.isLoading = false;
            this.showToast(err?.error?.message || 'Failed to approve payment. Please try again.', 'danger');
          },
        });
      },
    });
  }

  openRejectModal(payment: PaymentRequest) {
    this.haptic.medium();
    this.selectedPayment = payment;
    this.rejectionReason = '';
    this.isRejectModalOpen = true;
  }

  submitRejection() {
    this.haptic.heavy();
    if (!this.rejectionReason.trim()) {
      this.showToast('Please provide a rejection reason', 'warning');
      return;
    }
    if (!this.selectedPayment) return;

    const payment = this.selectedPayment;
    const userId = this.auth.getUserId() ?? 0;
    this.isSubmitting = true;

    this.accountsService.rejectPayment(payment.id, userId, this.rejectionReason.trim()).subscribe({
      next: (response) => {
        this.loadPayments();
        this.isRejectModalOpen = false;
        this.isDetailModalOpen = false;
        this.isSubmitting = false;
        this.rejectionReason = '';
        this.selectedPayment = null;
        // Handle both string and object responses
        const message = typeof response === 'string' ? response : (response?.message || 'Payment request rejected successfully');
        this.showToast(message, 'success');
      },
      error: (err) => {
        this.isSubmitting = false;
        // Backend sometimes returns a plain-text 200 body, which Angular's HttpClient
        // fails to JSON.parse (Content-Type: application/json) and routes here instead
        // of `next`, with the raw text preserved on err.error.text.
        const errorMessage = err?.error?.text || err?.error?.message || err?.error || err?.message || 'Failed to reject payment. Please try again.';
        this.loadPayments();
        this.isRejectModalOpen = false;
        this.isDetailModalOpen = false;
        this.rejectionReason = '';
        this.selectedPayment = null;
        this.showToast(errorMessage, 'danger');
      },
    });
  }

  // ── Computed Stats ────────────────────────────────────────────────────────

  get stats() {
    const pending  = this.allPayments.filter(p => p.status === 'PENDING');
    const approved = this.allPayments.filter(p => p.status === 'APPROVED');
    const rejected = this.allPayments.filter(p => p.status === 'REJECTED');
    return {
      total:         this.allPayments.length,
      pendingCount:  pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      pendingAmount:  pending.reduce((s, p) => s + p.amount, 0),
      approvedAmount: approved.reduce((s, p) => s + p.amount, 0),
    };
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  get paginatedPayments(): PaymentRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPayments.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredPayments.length / this.pageSize);
  }

  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getTabCount(tab: string): number {
    if (tab === 'ALL') return this.allPayments.length;
    return this.allPayments.filter(p => p.status === tab).length;
  }

  getTabLabel(tab: string): string {
    const labels: Record<string, string> = {
      ALL: 'All',
      PENDING: 'Payment Added',
      APPROVED: 'Payment Approved',
      REJECTED: 'Payment Rejected',
    };
    return labels[tab] ?? tab;
  }

  getStatusConfig(status: string): { color: string; bg: string; border: string; icon: string; label: string } {
    const map: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
      PENDING:  { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: 'time-outline',              label: 'Payment Added'    },
      APPROVED: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: 'checkmark-circle-outline',  label: 'Payment Approved' },
      REJECTED: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: 'close-circle-outline',      label: 'Payment Rejected' },
    };
    return map[status] ?? map['PENDING'];
  }

  getMethodConfig(method: string): { bg: string; color: string; icon: string } {
    const map: Record<string, { bg: string; color: string; icon: string }> = {
      RTGS:   { bg: '#eff6ff', color: '#1d4ed8', icon: 'business-outline'       },
      NEFT:   { bg: '#f5f3ff', color: '#6d28d9', icon: 'swap-vertical-outline'  },
      IMPS:   { bg: '#ecfdf5', color: '#059669', icon: 'phone-portrait-outline' },
      UPI:    { bg: '#fff7ed', color: '#c2410c', icon: 'phone-portrait-outline' },
      CHEQUE: { bg: '#fefce8', color: '#a16207', icon: 'document-text-outline'  },
    };
    return map[method] ?? { bg: '#f8fafc', color: '#475569', icon: 'card-outline' };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 2,
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  private showToast(message: string, color: 'success' | 'danger' | 'warning') {
    this.toast.present(message, color);
  }
}
