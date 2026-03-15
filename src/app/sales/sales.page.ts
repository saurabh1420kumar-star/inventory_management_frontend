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
  isOrdersLoading = false;

  orderFilterTab: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
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
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadPendingOrders();
    this.loadProformaInvoices();
    this.loadGdns();
  }

  loadProformaInvoices() {
    this.proformaInvoiceService.getAllInvoices().subscribe({
      next: (data) => {
        this.allInvoices = data;
        this.groupInvoicesByOrder();
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
      this.downloadFromUrl(invoice.pdfUrl, `${invoice.piNumber}.pdf`);
      this.downloadingInvoiceId = null;
      return;
    }

    this.proformaInvoiceService.downloadInvoicePdf(invoice.cartId).subscribe({
      next: (blob) => {
        this.downloadFromBlob(blob, `${invoice.piNumber}.pdf`);
        this.downloadingInvoiceId = null;
        this.showToast('PDF downloaded successfully', 'success');
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
        this.downloadingInvoiceId = null;
        this.showToast('Failed to download PDF', 'danger');
      }
    });
  }

  private downloadFromBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private downloadFromUrl(pdfUrl: string, filename: string) {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    link.target = '_blank';
    link.click();
    this.showToast('PDF downloaded successfully', 'success');
  }

  private async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
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
      this.downloadFromUrl(gdn.pdfUrl, `${gdn.gdnNumber}.pdf`);
      this.downloadingGdnId = null;
      return;
    }

    this.gdnService.downloadGdnPdf(gdn.id).subscribe({
      next: (blob) => {
        this.downloadFromBlob(blob, `${gdn.gdnNumber}.pdf`);
        this.downloadingGdnId = null;
        this.showToast('GDN PDF downloaded successfully', 'success');
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
    console.log('Loading active carts...');
    this.salesService.getActiveCarts().subscribe({
      next: (data) => {
        console.log('Active carts response:', data);
        this.pendingOrders = Array.isArray(data) ? data : (data as any)?.data || [];
        console.log('Pending orders:', this.pendingOrders);
        this.updateStats();
        this.isOrdersLoading = false;
      },
      error: (error) => {
        console.error('Error loading pending orders:', error);
        console.error('Error response:', JSON.stringify(error?.error));
        this.isOrdersLoading = false;
      },
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
      filtered = this.pendingOrders.filter(o => o.status === 'APPROVED');
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

  get orderTabCounts(): Record<string, number> {
    return {
      all: this.pendingOrders.length,
      pending: this.pendingOrders.filter(o => o.status === 'ACTIVE').length,
      approved: this.pendingOrders.filter(o => o.status === 'APPROVED').length,
      rejected: this.pendingOrders.filter(o => o.status === 'DISMISSED').length,
    };
  }

  approveOrder(order: PendingOrder) {
    this.salesService.approveOrder(order.id).subscribe({
      next: () => {
        const idx = this.pendingOrders.findIndex(o => o.id === order.id);
        if (idx !== -1) {
          this.pendingOrders[idx] = { ...this.pendingOrders[idx], status: 'APPROVED' };
          this.pendingOrders = [...this.pendingOrders];
        }
        this.orderFilterTab = 'approved';
      },
      error: (error) => {
        console.error('Error approving order:', error);
        this.errorMessage = 'Failed to approve order. Please try again.';
      },
    });
  }

  generateAndDownloadPI(order: PendingOrder) {
    // TODO: Integrate PI generation/download API
    console.log('Generate & Download PI for order:', order.id);
  }

  dismissOrder(order: PendingOrder) {
    this.salesService.dismissOrder(order.id).subscribe({
      next: () => {
        const idx = this.pendingOrders.findIndex(o => o.id === order.id);
        if (idx !== -1) {
          this.pendingOrders[idx] = { ...this.pendingOrders[idx], status: 'DISMISSED' };
          this.pendingOrders = [...this.pendingOrders];
        }
        this.orderFilterTab = 'rejected';
      },
      error: (error) => {
        console.error('Error dismissing order:', error);
        this.errorMessage = 'Failed to dismiss order. Please try again.';
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
