import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SalesService, PendingOrder } from '../services/sales.service';
import { ProformaInvoiceService, ProformaInvoice } from '../services/proforma-invoice.service';
import { GdnService, GDN } from '../services/gdn.service';
import { ToastController } from '@ionic/angular';
import { Toast } from '../services/toast';
import { DownloadService } from '../services/download.service';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.page.html',
  styleUrls: ['./sales.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class SalesPage implements OnInit {
  isLoading = false;
  errorMessage = '';

  // ── Order Approval ──────────────────────────────────────
  pendingOrders: PendingOrder[] = [];
  approveCarts: PendingOrder[] = [];      // from GET /api/order/approve-carts
  piReadyInvoices: ProformaInvoice[] = []; // from GET /api/order/proforma-invoice/all
  isOrdersLoading = false;

  orderFilterTab: 'all' | 'pending' | 'approved' | 'pi_ready' | 'rejected' = 'pending';
  approvingPaymentId: number | null = null;
  downloadingPIId: number | null = null;

  // ── Reject Modal ─────────────────────────────────
  isRejectModalOpen = false;
  rejectRemarks = '';
  orderBeingRejected: PendingOrder | null = null;
  isRejectSubmitting = false;
  isApprovingOrderId: number | null = null;
  orderSearchTerm = '';
  expandedOrderIds = new Set<number>();

  statCards = [
    { label: 'Total Orders', value: 0, icon: 'cart-outline', color: 'emerald' },
    { label: 'Pending', value: 0, icon: 'time-outline', color: 'green' },
    { label: 'Approved', value: 0, icon: 'checkmark-circle-outline', color: 'slate' },
  ];

  // ── Proforma Invoices ───────────────────────────────────────
  allInvoices: ProformaInvoice[] = [];
  invoicesByOrder: Map<number, ProformaInvoice[]> = new Map();
  showInvoicesByOrder: Map<number, boolean> = new Map();
  downloadingInvoiceId: number | null = null;

  // ── GDN (Good Delivery Notes) ────────────────────────────
  gdns: GDN[] = [];
  gdnsByOrder: Map<number, GDN[]> = new Map();
  showGdnsByOrder: Map<number, boolean> = new Map();
  downloadingGdnId: number | null = null;
  showGdns = false;
  toggleGdnHover = false;
  viewingGdnPdfUrl: SafeResourceUrl | null = null;
  rawGdnPdfUrl: string | null = null;
  expandedGdnId: number | null = null;

  constructor(
    private salesService: SalesService,
    private proformaInvoiceService: ProformaInvoiceService,
    private gdnService: GdnService,
    private toastController: ToastController,
    private sanitizer: DomSanitizer,
    private toast: Toast,
    private downloadService: DownloadService
  ) {}

  ngOnInit() {
    this.loadPendingOrders();
    this.loadApproveCarts();
    this.loadProformaInvoices();
    this.loadGdns();
  }

  ionViewWillEnter() {
    this.loadPendingOrders();
    this.loadApproveCarts();
    this.loadProformaInvoices();
  }

  loadProformaInvoices() {
    this.proformaInvoiceService.getAllInvoices().subscribe({
      next: (data) => {
        this.allInvoices = data;
        this.groupInvoicesByOrder();
        // Newest first for PI Ready tab
        this.piReadyInvoices = [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      },
      error: (error) => {
        console.error('Error loading proforma invoices:', error);
      }
    });
  }

  groupInvoicesByOrder() {
    this.invoicesByOrder.clear();
    this.allInvoices.forEach(invoice => {
      if (!this.invoicesByOrder.has(invoice.cartId)) {
        this.invoicesByOrder.set(invoice.cartId, []);
      }
      this.invoicesByOrder.get(invoice.cartId)!.push(invoice);
    });
  }

  getInvoicesForOrder(orderId: number): ProformaInvoice[] {
    return this.invoicesByOrder.get(orderId) || [];
  }

  toggleInvoicesForOrder(orderId: number) {
    const current = this.showInvoicesByOrder.get(orderId) || false;
    this.showInvoicesByOrder.set(orderId, !current);
  }

  downloadInvoicePdf(invoice: ProformaInvoice) {
    if (invoice.paymentStatus !== 'PAID') {
      this.showToast('Only paid invoices can be downloaded', 'warning');
      return;
    }

    if (!invoice.hasPdf) {
      this.showToast('PDF not available for this invoice', 'warning');
      return;
    }

    this.downloadingInvoiceId = invoice.id;

    if (invoice.pdfUrl) {
      this.downloadService.downloadUrl(invoice.pdfUrl, `${invoice.piNumber}.pdf`);
      this.downloadingInvoiceId = null;
      return;
    }

    this.proformaInvoiceService.downloadInvoicePdf(invoice.cartId).subscribe({
      next: async (blob) => {
        await this.downloadService.downloadBlob(blob, `${invoice.piNumber}.pdf`);
        this.downloadingInvoiceId = null;
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
        this.downloadingInvoiceId = null;
        this.showToast('Failed to download PDF', 'danger');
      }
    });
  }

  // downloadFromBlob and downloadFromUrl replaced by DownloadService

  private async showToast(message: string, color: string = 'dark') {
    const mapped: 'success' | 'danger' | 'warning' =
      color === 'danger' ? 'danger' : color === 'warning' ? 'warning' : 'success';
    await this.toast.present(message, mapped);
  }

  // ── GDN Methods ───────────────────────────────────
  loadGdns() {
    this.gdnService.getAllGdns().subscribe({
      next: (data) => {
        this.gdns = data.sort(
          (a, b) => new Date(b.gdnDate).getTime() - new Date(a.gdnDate).getTime()
        );
        this.groupGdnsByOrder();
      },
      error: (error) => {
        console.error('Error loading GDNs:', error);
      }
    });
  }

  groupGdnsByOrder() {
    this.gdnsByOrder.clear();
    this.gdns.forEach(gdn => {
      if (!this.gdnsByOrder.has(gdn.orderId)) {
        this.gdnsByOrder.set(gdn.orderId, []);
      }
      this.gdnsByOrder.get(gdn.orderId)!.push(gdn);
    });
  }

  getGdnsForOrder(orderId: number): GDN[] {
    return this.gdnsByOrder.get(orderId) || [];
  }

  toggleGdnsForOrder(orderId: number) {
    const current = this.showGdnsByOrder.get(orderId) || false;
    this.showGdnsByOrder.set(orderId, !current);
  }

  downloadGdnPdf(gdn: GDN) {
    if (!gdn.hasPdf || !gdn.pdfUrl) {
      this.showToast('PDF not available for this GDN', 'warning');
      return;
    }

    this.downloadingGdnId = gdn.id;

    if (gdn.pdfUrl) {
      this.downloadService.downloadUrl(gdn.pdfUrl, `${gdn.gdnNumber}.pdf`);
      this.downloadingGdnId = null;
      return;
    }

    this.gdnService.downloadGdnPdf(gdn.id).subscribe({
      next: async (blob) => {
        await this.downloadService.downloadBlob(blob, `${gdn.gdnNumber}.pdf`);
        this.downloadingGdnId = null;
      },
      error: (error) => {
        console.error('Error downloading GDN PDF:', error);
        this.downloadingGdnId = null;
        this.showToast('Failed to download GDN PDF', 'danger');
      }
    });
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  loadPendingOrders() {
    this.isOrdersLoading = true;
    this.salesService.getActiveCarts().subscribe({
      next: (data) => {
        this.pendingOrders = Array.isArray(data) ? data : (data as any)?.data || [];
        this.updateStats();
        this.isOrdersLoading = false;
      },
      error: (error) => {
        console.error('Error loading pending orders:', error);
        this.isOrdersLoading = false;
      },
    });
  }

  loadApproveCarts() {
    this.salesService.getApproveCarts().subscribe({
      next: (data) => {
        const raw: PendingOrder[] = Array.isArray(data) ? data : (data as any)?.data || [];
        // Newest first for Approved tab
        this.approveCarts = raw.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      },
      error: (error) => {
        console.error('Error loading approve-carts:', error);
      }
    });
  }

  updateStats() {
    const pending = this.pendingOrders.filter(o => o.status === 'PLACED').length;
    const approved = this.pendingOrders.filter(o => o.status === 'APPROVED').length;

    this.statCards = [
      { label: 'Total Orders', value: this.pendingOrders.length, icon: 'cart-outline', color: 'emerald' },
      { label: 'Pending', value: pending, icon: 'time-outline', color: 'green' },
      { label: 'Approved', value: approved, icon: 'checkmark-circle-outline', color: 'slate' },
    ];
  }

  // ── Order Helpers ───────────────────────────────
  get filteredOrderSummaries(): PendingOrder[] {
    let filtered: PendingOrder[];
    if (this.orderFilterTab === 'all') {
      filtered = this.pendingOrders;
    } else if (this.orderFilterTab === 'pending') {
      filtered = this.pendingOrders.filter(o => o.status === 'PLACED');
    } else if (this.orderFilterTab === 'approved') {
      // Powered by GET /api/order/approve-carts
      filtered = this.approveCarts;
    } else if (this.orderFilterTab === 'rejected') {
      filtered = this.pendingOrders.filter(o => o.status === 'DISMISSED');
    } else {
      filtered = this.pendingOrders;
    }

    if (this.orderSearchTerm.trim()) {
      const term = this.orderSearchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        String(o.id).includes(term) ||
        (o.distributorName || '').toLowerCase().includes(term) ||
        (o.salespersonName || '').toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  get filteredPIReadyInvoices(): ProformaInvoice[] {
    if (!this.orderSearchTerm.trim()) return this.piReadyInvoices;
    const term = this.orderSearchTerm.toLowerCase();
    return this.piReadyInvoices.filter(inv =>
      String(inv.cartId).includes(term) ||
      String(inv.piNumber || '').toLowerCase().includes(term) ||
      String(inv.distributorId).includes(term)
    );
  }

  get orderTabCounts(): Record<string, number> {
    return {
      all: this.pendingOrders.length,
      pending: this.pendingOrders.filter(o => o.status === 'ACTIVE' || o.status === 'PLACED').length,
      approved: this.approveCarts.length,
      pi_ready: this.piReadyInvoices.length,
      rejected: this.pendingOrders.filter(o => o.status === 'DISMISSED').length,
    };
  }

  approveOrder(order: PendingOrder) {
    this.isApprovingOrderId = order.id;
    this.salesService.approveOrder(order.id).subscribe({
      next: () => {
        this.isApprovingOrderId = null;
        // Reload both lists fresh from API so Approved tab shows newest-first
        this.loadPendingOrders();
        this.loadApproveCarts();
        this.orderFilterTab = 'approved';
      },
      error: (error) => {
        this.isApprovingOrderId = null;
        console.error('Error approving order:', error);
        this.errorMessage = 'Failed to approve order. Please try again.';
      },
    });
  }

  generateAndDownloadPI(order: PendingOrder) {
    // Legacy stub – superseded by approvePI
    this.approvePI(order);
  }

  approvePI(order: PendingOrder) {
    if (!order.distributorId) {
      this.showToast('Distributor ID not found for this order.', 'warning');
      return;
    }

    this.approvingPaymentId = order.id;
    this.salesService.approvePayment(order.id, order.distributorId).subscribe({
      next: async () => {
        // Remove from approveCarts local list
        this.approveCarts = this.approveCarts.filter(o => o.id !== order.id);
        this.approvingPaymentId = null;
        this.updateStats();
        // Refresh PI list from /api/order/proforma-invoice/all so the new entry appears
        this.loadProformaInvoices();
        this.orderFilterTab = 'pi_ready';
        this.showToast('Proforma Invoice approved successfully', 'success');
      },
      error: (err) => {
        console.error('Error approving payment:', err);
        this.approvingPaymentId = null;
        this.showToast(err?.error?.message || 'Failed to approve Proforma Invoice. Please try again.', 'danger');
      }
    });
  }

  downloadPIFromInvoice(invoice: ProformaInvoice) {
    this.downloadingPIId = invoice.id;
    const filename = invoice.piNumber ? `${invoice.piNumber}.pdf` : `PI-${invoice.cartId}.pdf`;
    this.proformaInvoiceService.downloadInvoicePdf(invoice.cartId).subscribe({
      next: async (blob) => {
        await this.downloadService.downloadBlob(blob, filename);
        this.downloadingPIId = null;
      },
      error: (err) => {
        console.error('Error downloading PI:', err);
        this.downloadingPIId = null;
        this.showToast('Failed to download Proforma Invoice', 'danger');
      }
    });
  }

  openRejectModal(order: PendingOrder) {
    this.orderBeingRejected = order;
    this.rejectRemarks = '';
    this.isRejectModalOpen = true;
  }

  cancelReject() {
    this.isRejectModalOpen = false;
    this.orderBeingRejected = null;
    this.rejectRemarks = '';
  }

  confirmReject() {
    if (!this.orderBeingRejected) return;
    const order = this.orderBeingRejected;
    this.isRejectSubmitting = true;
    this.salesService.dismissOrder(order.id, this.rejectRemarks.trim()).subscribe({
      next: () => {
        const idx = this.pendingOrders.findIndex(o => o.id === order.id);
        if (idx !== -1) {
          this.pendingOrders[idx] = { ...this.pendingOrders[idx], status: 'DISMISSED' };
          this.pendingOrders = [...this.pendingOrders];
        }
        this.isRejectSubmitting = false;
        this.cancelReject();
        this.orderFilterTab = 'rejected';
      },
      error: (error) => {
        this.isRejectSubmitting = false;
        console.error('Error dismissing order:', error);
        this.errorMessage = 'Failed to reject order. Please try again.';
      },
    });
  }

  toggleOrderExpand(id: number) {
    if (this.expandedOrderIds.has(id)) {
      this.expandedOrderIds.delete(id);
    } else {
      this.expandedOrderIds.add(id);
    }
  }

  isOrderExpanded(id: number): boolean {
    return this.expandedOrderIds.has(id);
  }

  // ── GDN View Methods ─────────────────────────────
  viewGdnPdfModal(gdn: GDN) {
    if (!gdn.hasPdf || !gdn.pdfUrl) {
      return;
    }
    this.rawGdnPdfUrl = gdn.pdfUrl;
    this.viewingGdnPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(gdn.pdfUrl);
  }

  closeGdnPdfModal() {
    this.viewingGdnPdfUrl = null;
    this.rawGdnPdfUrl = null;
  }

  toggleGdnDetails(gdnId: number) {
    if (this.expandedGdnId === gdnId) {
      this.expandedGdnId = null;
    } else {
      this.expandedGdnId = gdnId;
    }
  }

  getGdnStatusColor(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'emerald';
      case 'PENDING':
        return 'amber';
      case 'CANCELLED':
        return 'rose';
      default:
        return 'slate';
    }
  }

  getGdnStatusBgColor(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-50';
      case 'PENDING':
        return 'bg-amber-50';
      case 'CANCELLED':
        return 'bg-rose-50';
      default:
        return 'bg-slate-50';
    }
  }

  getGdnStatusBadgeColor(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-200 text-emerald-800';
      case 'PENDING':
        return 'bg-amber-200 text-amber-800';
      case 'CANCELLED':
        return 'bg-rose-200 text-rose-800';
      default:
        return 'bg-slate-200 text-slate-800';
    }
  }

  getGdnStatusAccentGradient(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'from-emerald-500 to-teal-600';
      case 'PENDING':
        return 'from-amber-500 to-orange-600';
      case 'CANCELLED':
        return 'from-rose-500 to-pink-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  }

  refreshSales() {
    this.loadPendingOrders();
  }
}
