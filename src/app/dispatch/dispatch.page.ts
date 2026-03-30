import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Toast } from '../services/toast';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DispatchService, DispatchOrder, GdnGenerateRequest } from '../services/dispatch.service';
import { ProformaInvoiceService, ProformaInvoice } from '../services/proforma-invoice.service';
import { GdnService, GDN } from '../services/gdn.service';
import { DownloadService } from '../services/download.service';
import { HapticService } from '../services/haptic.service';

// ── Local Display Interface ──────────────────────────────────────

export interface DispatchItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  batchNumber?: string;
}

export interface DispatchOrderDisplay {
  id: number;
  orderNumber: string;
  distributorName: string;
  distributorContact: string;
  distributorId: number | null;
  salesPersonName: string;
  orderDate: string;
  totalAmount: number;
  items: DispatchItem[];
  approvalStatus: 'pending' | 'approved' | 'payment_approved' | 'rejected';
  approvalDate?: string;
  approvalRemarks?: string;
  gdnStatus: 'not-generated' | 'generated' | 'dispatched';
  gdnNumber?: string;
  gdnDate?: string;
  dispatchDate?: string;
  vehicleNumber?: string;
  transporterName?: string;
  shippingAddress?: string;
  originalOrder?: DispatchOrder;
}

@Component({
  selector: 'app-dispatch',
  templateUrl: './dispatch.page.html',
  styleUrls: ['./dispatch.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, RouterModule],
})
export class DispatchPage implements OnInit {
  // ── Data ──────────────────────────────────────────
  orders: DispatchOrderDisplay[] = [];
  paymentApprovedCarts: DispatchOrderDisplay[] = [];
  searchTerm = '';
  activeTab: 'payment_approved' | 'download_gdn' = 'payment_approved';
  isLoading = false;
  isLoadingOrders = true;
  errorMessage = '';

  // ── Proforma Invoices ─────────────────────────────
  proformaInvoices: ProformaInvoice[] = [];
  paidInvoices: ProformaInvoice[] = [];
  isLoadingInvoices = false;
  downloadingInvoiceId: number | null = null;
  showProformaInvoices = false;
  invoicesByOrder: Map<number, ProformaInvoice[]> = new Map();
  showInvoicesByOrder: Map<number, boolean> = new Map();

  // ── GDN (Good Delivery Notes) ──────────────────────
  gdns: GDN[] = [];
  gdnsByOrder: Map<number, GDN[]> = new Map();
  showGdnsByOrder: Map<number, boolean> = new Map();
  isLoadingGdns = false;
  downloadingGdnId: number | null = null;
  showGdns = false;
  viewingGdnPdfUrl: SafeResourceUrl | null = null;
  rawGdnPdfUrl: string | null = null;
  expandedGdnId: number | null = null;

  // ── Stats ─────────────────────────────────────────
  get pendingCount(): number {
    return this.orders.filter((o) => o.approvalStatus === 'pending').length;
  }
  get approvedCount(): number {
    return this.orders.filter((o) => o.approvalStatus === 'approved').length;
  }
  get gdnGeneratedCount(): number {
    return this.orders.filter((o) => o.gdnStatus === 'generated' || o.gdnStatus === 'dispatched').length;
  }
  get dispatchedCount(): number {
    return this.orders.filter((o) => o.gdnStatus === 'dispatched').length;
  }

  // ── Modals ────────────────────────────────────────
  isRejectModalOpen = false;
  rejectRemarks = '';
  orderBeingRejected: DispatchOrderDisplay | null = null;

  isDetailModalOpen = false;
  selectedOrder: DispatchOrderDisplay | null = null;

  // ── GDN Modal ─────────────────────────────────────
  isGdnModalOpen = false;
  orderForGdn: DispatchOrderDisplay | null = null;
  gdnForm: FormGroup;
  useCustomShippingAddress = false;

  // ── GDN Reject Modal ──────────────────────────────
  isGdnRejectModalOpen = false;
  gdnRejectReason = '';
  orderForGdnReject: DispatchOrderDisplay | null = null;

  expandedIds = new Set<number>();

  private haptic = inject(HapticService);

  constructor(
    private dispatchService: DispatchService,
    private proformaInvoiceService: ProformaInvoiceService,
    private gdnService: GdnService,
    private fb: FormBuilder,
    private toastController: ToastController,
    private sanitizer: DomSanitizer,
    private toast: Toast,
    private downloadService: DownloadService
  ) {
    this.gdnForm = this.fb.group({
      dispatchFromAddress: ['', Validators.required],
      shippingAddress: ['', Validators.required],
      vehicleNo: ['', Validators.required],
      transportName: ['', Validators.required],
      driverName: ['', Validators.required],
      driverMobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    });
  }

  ngOnInit() {
    this.loadOrders();
    this.loadPaymentApprovedCarts();
    this.loadProformaInvoices();
    this.loadGdns();
  }

  loadOrders() {
    this.isLoading = true;
    this.errorMessage = '';

    this.dispatchService.getActiveCarts().subscribe({
      next: (data) => {
        this.orders = data
          .map((order) => this.mapApiOrderToDisplay(order))
          .sort((a, b) => b.id - a.id);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.errorMessage = 'Failed to load orders. Please try again.';
        this.isLoading = false;
      },
    });
  }

  loadPaymentApprovedCarts() {
    this.isLoadingOrders = true;
    this.dispatchService.getPaymentApprovedCarts().subscribe({
      next: (data) => {
        this.paymentApprovedCarts = data
          .map((order) => this.mapApiOrderToDisplay(order))
          .sort((a, b) => b.id - a.id);
        this.isLoadingOrders = false;
      },
      error: (err) => {
        console.error('Error loading payment-approved carts:', err);
        this.isLoadingOrders = false;
      },
    });
  }

  private mapApiOrderToDisplay(order: DispatchOrder): DispatchOrderDisplay {
    // Handle invalid order data
    if (!order || !order.id) {
      console.warn('Invalid order data received:', order);
      throw new Error('Order data is invalid or missing ID');
    }
    
    // Map API status to display status
    let approvalStatus: 'pending' | 'approved' | 'payment_approved' | 'rejected' = 'pending';
    
    console.log(`Mapping order ${order.id} with status: "${order.status}"`);
    
    if (order.status === 'PAYMENT_APPROVED') {
      approvalStatus = 'payment_approved';
    } else if (order.status === 'APPROVED') {
      approvalStatus = 'approved';
    } else if (order.status === 'DISMISSED') {
      approvalStatus = 'rejected';
    } else if (order.status === 'PLACED') {
      approvalStatus = 'pending';
    }

    // Determine GDN status
    let gdnStatus: 'not-generated' | 'generated' | 'dispatched' = 'not-generated';
    if (order.gdnNumber) {
      gdnStatus = order.dispatchDate ? 'dispatched' : 'generated';
    }

    const result = {
      id: order.id,
      orderNumber: `ORD-${order.id}`,
      distributorName: order.distributorName || 'Unknown Distributor',
      distributorContact: '',
      distributorId: order.distributorId,
      salesPersonName: order.salespersonName || 'Unknown',
      orderDate: order.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      totalAmount: order.totalCartAmount ||
        (order.cartItems || []).reduce((sum, item) => sum + (item.totalPrice || item.price * item.quantity || 0), 0),
      items: (order.cartItems || []).map((item) => ({
        productName: item.itemName || 'Unknown Product',
        quantity: item.quantity,
        unitPrice: item.price ?? item.priceAtTime ?? 0,
        batchNumber: item.itemSku,
      })),
      approvalStatus,
      gdnStatus,
      gdnNumber: order.gdnNumber,
      gdnDate: order.gdnDate,
      dispatchDate: order.dispatchDate,
      vehicleNumber: order.vehicleNumber,
      transporterName: order.transporterName,
      shippingAddress: order.shippingAddress || order.address || '',
      originalOrder: order,
    };
    
    if (order.id === 75 || order.id === 52) {
      console.log(`Order ${order.id} detailed mapping:`, result);
    }
    
    return result;
  }

  // ── Filtering ─────────────────────────────────────
  get filteredOrders(): DispatchOrderDisplay[] {
    // Generate GDN tab uses dedicated payment-approved API data
    let filtered = this.paymentApprovedCarts;

    // Search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(term) ||
          o.distributorName.toLowerCase().includes(term) ||
          o.salesPersonName.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  get filteredGdns(): GDN[] {
    if (!this.searchTerm.trim()) return this.gdns;
    const term = this.searchTerm.toLowerCase();
    return this.gdns.filter(gdn =>
      gdn.gdnNumber.toLowerCase().includes(term) ||
      String(gdn.orderId).includes(term) ||
      (gdn.transportName || '').toLowerCase().includes(term) ||
      (gdn.driverName || '').toLowerCase().includes(term)
    );
  }

  get tabCounts() {
    return {
      pending: this.orders.filter((o) => o.approvalStatus === 'pending').length,
      approved: this.orders.filter((o) => o.approvalStatus === 'approved').length,
      payment_approved: this.paymentApprovedCarts.length,
      download_gdn: this.gdns.length,
    };
  }

  // ── Actions ───────────────────────────────────────
  approveOrder(order: DispatchOrderDisplay) {
    this.isLoading = true;

    this.dispatchService.approveOrder(order.id).subscribe({
      next: async (response) => {
        // Reload orders from API (most reliable — avoid partial-response patching)
        this.loadOrders();

        // Show success toast
        await this.toast.present(`Order ${order.orderNumber} approved successfully`, 'success');

        // Switch to Generate GDN tab so the order is immediately visible
        this.activeTab = 'payment_approved';
      },
      error: async (err) => {
        console.error('Approve order error:', err);
        this.errorMessage = err?.error?.message || 'Failed to approve order. Please try again.';
        this.isLoading = false;

        await this.toast.present(this.errorMessage, 'danger');
      },
    });
  }

  approvePayment(order: DispatchOrderDisplay) {
    if (!order.distributorId) {
      this.errorMessage = 'Distributor ID not found for this order.';
      return;
    }
    
    this.isLoading = true;
    console.log('Approving payment for order:', order.id);
    this.dispatchService.approvePayment(order.id, order.distributorId).subscribe({
      next: async (response) => {
        console.log('Payment API Response:', response);
        
        // Check if response contains an error status
        if (response && (response.status === 'INSUFFICIENT_BALANCE' || response.status === 'PAYMENT_FAILED' || response.message?.includes('Insufficient'))) {
          console.error('Payment approval failed:', response.message);
          this.errorMessage = response.message || 'Payment approval failed. Please check distributor balance.';
          this.isLoading = false;
          
          // Show error toast
          await this.toast.present(this.errorMessage, 'danger');
          return;
        }
        
        // Only update order if payment was approved successfully
        if (response && response.status === 'PAYMENT_APPROVED') {
          console.log('Payment approved successfully for order:', order.id);
          console.log('API returned orderId:', response.orderId);
          
          // Update the local order object with the response data
          if (response.status) {
            // Transform API response to have 'id' field (API returns 'orderId')
            const transformedResponse = {
              ...response,
              id: response.orderId || order.id,  // API returns orderId, but mapper expects id
              cartItems: order.originalOrder?.cartItems || []  // Preserve original cart items from the order object
            };
            console.log('Transformed response - id:', transformedResponse.id, 'orderId:', response.orderId);
            console.log('Preserving items count:', transformedResponse.cartItems?.length);
            const updatedOrder = this.mapApiOrderToDisplay(transformedResponse);
            const index = this.orders.findIndex(o => o.id === order.id);
            if (index !== -1) {
              this.orders[index] = updatedOrder;
              console.log('Order updated to status:', updatedOrder.approvalStatus);
              console.log('Updated order id:', updatedOrder.id);
              console.log('Updated order items count:', updatedOrder.items.length);
            }
          }
          
          // Show success toast
          await this.toast.present(`Payment for Order #${order.orderNumber} approved successfully`, 'success');
          
          // Switch to Generate GDN tab
          this.activeTab = 'payment_approved';
        } else {
          console.warn('Unexpected response status:', response?.status);
        }
        
        this.isLoading = false;
        console.log('Tab Counts:', this.tabCounts);
      },
      error: async (err) => {
        console.error('Error approving payment:', err);
        this.errorMessage = err?.error?.message || 'Failed to approve payment. Please try again.';
        this.isLoading = false;
        await this.toast.present(this.errorMessage, 'danger');
      },
    });
  }

  openRejectModal(order: DispatchOrderDisplay) {
    this.haptic.medium();
    this.orderBeingRejected = order;
    this.rejectRemarks = '';
    this.isRejectModalOpen = true;
  }

  confirmReject() {
    this.haptic.heavy();
    if (this.orderBeingRejected) {
      this.isLoading = true;
      this.dispatchService.dismissOrder(this.orderBeingRejected.id).subscribe({
        next: async (response) => {
          console.log('Order rejected:', this.orderBeingRejected?.id);
          
          // Update the local order object with the response data
          if (this.orderBeingRejected && response && response.status) {
            // Transform API response to have 'id' field (API returns 'orderId')
            const transformedResponse = {
              ...response,
              id: response.orderId || this.orderBeingRejected.id,
              cartItems: this.orderBeingRejected.originalOrder?.cartItems || []  // Preserve items
            };
            const updatedOrder = this.mapApiOrderToDisplay(transformedResponse);
            const index = this.orders.findIndex(o => o.id === this.orderBeingRejected!.id);
            if (index !== -1) {
              this.orders[index] = updatedOrder;
              console.log('Order updated to status:', updatedOrder.approvalStatus);
              console.log('Updated order items count:', updatedOrder.items.length);
            }
          }
          
          this.isRejectModalOpen = false;
          this.orderBeingRejected = null;
          this.rejectRemarks = '';
          this.isLoading = false;
          
          // Show success toast
          await this.toast.present('Order rejected successfully', 'success');
        },
        error: async (err) => {
          console.error('Error rejecting order:', err);
          this.errorMessage = 'Failed to reject order. Please try again.';
          this.isLoading = false;
          await this.toast.present(this.errorMessage, 'danger');
        },
      });
    }
  }

  cancelReject() {
    this.haptic.light();
    this.isRejectModalOpen = false;
    this.orderBeingRejected = null;
    this.rejectRemarks = '';
  }

  // ── GDN Generation ────────────────────────────────
  openGdnModal(order: DispatchOrderDisplay) {
    this.haptic.medium();
    console.log('Opening GDN Modal for order:', order);
    console.log('Order ID:', order?.id);
    console.log('Order number:', order?.orderNumber);
    this.orderForGdn = order;
    this.useCustomShippingAddress = false;
    this.gdnForm.reset();
    // Always pre-fill shipping address with distributor's address
    this.gdnForm.patchValue({ shippingAddress: order.shippingAddress || '' });
    this.isGdnModalOpen = true;
  }

  onShippingToggle() {
    if (!this.useCustomShippingAddress) {
      // Restore distributor's address when unchecking
      this.gdnForm.patchValue({ shippingAddress: this.orderForGdn?.shippingAddress || '' });
    } else {
      // Clear for custom input
      this.gdnForm.patchValue({ shippingAddress: '' });
    }
  }

  closeGdnModal() {
    this.haptic.light();
    this.isGdnModalOpen = false;
    this.orderForGdn = null;
    this.gdnForm.reset();
  }

  submitGdnGeneration() {
    this.haptic.heavy();
    if (this.gdnForm.invalid || !this.orderForGdn) {
      Object.keys(this.gdnForm.controls).forEach(key => {
        this.gdnForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Check if order ID exists
    if (!this.orderForGdn.id) {
      console.error('Order ID is missing!');
      console.error('orderForGdn:', this.orderForGdn);
      this.errorMessage = 'Order ID is missing. Cannot generate GDN.';
      return;
    }

    this.isLoading = true;
    console.log('=== VERIFY INVENTORY START ===');
    console.log('Order ID:', this.orderForGdn.id);

    // STEP 1: Verify inventory before generating GDN
    this.dispatchService.verifyInventory(this.orderForGdn.id).subscribe({
      next: async (verifyResponse) => {
        console.log('=== INVENTORY VERIFICATION SUCCESS ===');
        console.log('Verify Response:', verifyResponse);
        
        // Show verification success toast
        await this.toast.present('Inventory verified successfully. Generating GDN...', 'success');
        
        // Wait a moment, then proceed with GDN generation
        setTimeout(() => {
          this.proceedWithGdnGeneration();
        }, 500);
      },
      error: async (err) => {
        console.error('=== INVENTORY VERIFICATION FAILED ===');
        console.error('Verify Error:', err);
        console.error('Error URL:', err?.url);
        console.error('Error Status:', err?.status);
        const errorMsg = err?.error?.message || err?.error?.error || 'Inventory verification failed.';
        this.errorMessage = errorMsg;
        this.isLoading = false;
        
        // Show warning toast with option to proceed anyway
        const warningToast = await this.toastController.create({
          message: `${errorMsg} — Proceed anyway?`,
          duration: 8000,
          position: 'top',
          animated: false,
          cssClass: 'modern-toast modern-toast-warning',
          icon: 'alert-circle',
          buttons: [
            {
              text: 'Proceed',
              handler: () => {
                console.log('User chose to proceed without inventory verification');
                this.proceedWithGdnGeneration();
              }
            },
            {
              icon: 'close-outline',
              role: 'cancel',
              side: 'end',
            }
          ]
        });
        await warningToast.present();
      },
    });
  }

  /**
   * Proceed with GDN generation (called after inventory verification or skip)
   */
  private proceedWithGdnGeneration() {
    if (!this.orderForGdn) return;

    const payload: GdnGenerateRequest = this.gdnForm.value;
    const orderId = this.orderForGdn.id;
    this.isLoading = true;

    console.log('GDN Order ID:', orderId);
    console.log('GDN Payload:', JSON.stringify(payload));

    this.dispatchService.generateGdn(orderId, payload).subscribe({
      next: async (response) => {
        console.log('GDN generated successfully:', response);
        console.log('orderForGdn before update:', this.orderForGdn);
        console.log('orderForGdn items before update:', this.orderForGdn?.items?.length);
        
        // Update the local order object with GDN data
        if (this.orderForGdn) {
          this.orderForGdn.gdnStatus = 'generated';
          this.orderForGdn.gdnNumber = response.gdnNumber || `GDN-${this.orderForGdn.id}`;
          this.orderForGdn.gdnDate = new Date().toISOString().split('T')[0];
          this.orderForGdn.vehicleNumber = payload.vehicleNo;
          this.orderForGdn.transporterName = payload.transportName;
          this.orderForGdn.shippingAddress = payload.shippingAddress;
          
          console.log('orderForGdn after update:', this.orderForGdn);
          console.log('orderForGdn items after update:', this.orderForGdn?.items?.length);
          
          // IMPORTANT: Also update the order in the main orders array
          const index = this.orders.findIndex(o => o.id === this.orderForGdn!.id);
          if (index !== -1) {
            // Create a new object preserving all properties including items
            const updatedOrder = {
              ...this.orderForGdn,
              items: this.orderForGdn.items || []  // Ensure items are preserved
            };
            this.orders[index] = updatedOrder;
            console.log('Order updated in array at index:', index);
            console.log('Updated order items count:', this.orders[index].items.length);
            console.log('Updated order gdnStatus:', this.orders[index].gdnStatus);
          }
        }
        
        this.closeGdnModal();
        this.isLoading = false;

        // Refresh both lists so the new GDN appears immediately
        this.loadPaymentApprovedCarts();
        this.loadGdns();
        // Switch to Download GDN tab so user can immediately download
        this.activeTab = 'download_gdn';

        // Show success toast
        await this.toast.present('GDN generated successfully!', 'success');
      },
      error: async (err) => {
        console.error('Error generating GDN:', err);
        console.error('Error response:', JSON.stringify(err?.error));
        this.errorMessage = err?.error?.message || err?.error?.error || 'Failed to generate GDN. Please try again.';
        this.isLoading = false;
        // Close modal immediately regardless of error response
        this.closeGdnModal();
        // Reload GDNs to verify if generation actually succeeded despite the error
        this.gdnService.getAllGdns().subscribe({
          next: (data) => {
            this.gdns = data.sort(
              (a, b) => new Date(b.gdnDate).getTime() - new Date(a.gdnDate).getTime()
            );
            this.groupGdnsByOrder();
            this.isLoadingGdns = false;
            const gdnCreated = this.gdns.find(g => g.orderId === orderId);
            if (gdnCreated) {
              // GDN was created despite the error response from backend
              this.loadPaymentApprovedCarts();
              this.activeTab = 'download_gdn';
              this.toast.present('GDN generated successfully!', 'success');
            } else {
              this.toast.present(this.errorMessage, 'danger');
            }
          },
          error: () => {
            this.isLoadingGdns = false;
            this.toast.present(this.errorMessage, 'danger');
          },
        });
      },
    });
  }

  // Legacy method for backward compatibility
  generateGdn(order: DispatchOrderDisplay) {
    this.openGdnModal(order);
  }

  markDispatched(order: DispatchOrderDisplay) {
    this.isLoading = true;
    this.dispatchService.markDispatchedOrder(order.id).subscribe({
      next: (response) => {
        console.log('Order marked as dispatched:', order.id);
        this.isLoading = false;
        this.loadPaymentApprovedCarts();
        console.log('Tab Counts:', this.tabCounts);
      },
      error: (err) => {
        console.error('Error marking order as dispatched:', err);
        this.errorMessage = err?.error?.message || 'Failed to mark order as dispatched. Please try again.';
        this.isLoading = false;
      },
    });
  }

  // ── Detail Modal ──────────────────────────────────
  openDetail(order: DispatchOrderDisplay) {
    this.haptic.medium();
    this.selectedOrder = order;
    this.isDetailModalOpen = true;
  }

  closeDetail() {
    this.haptic.light();
    this.isDetailModalOpen = false;
  }

  onDetailModalDismissed() {
    this.isDetailModalOpen = false;
    this.selectedOrder = null;
  }

  // ── GDN Reject Modal ──────────────────────────────
  openGdnRejectModal(order: DispatchOrderDisplay) {
    this.haptic.medium();
    this.orderForGdnReject = order;
    this.gdnRejectReason = '';
    this.isGdnRejectModalOpen = true;
  }

  cancelGdnReject() {
    this.haptic.light();
    this.isGdnRejectModalOpen = false;
    this.orderForGdnReject = null;
    this.gdnRejectReason = '';
  }

  confirmGdnReject() {
    this.haptic.heavy();
    if (!this.orderForGdnReject || !this.gdnRejectReason.trim()) return;
    this.isLoading = true;
    this.dispatchService.rejectGdn(this.orderForGdnReject.id, this.gdnRejectReason.trim()).subscribe({
      next: async () => {
        this.isLoading = false;
        this.cancelGdnReject();
        this.loadPaymentApprovedCarts();
        await this.toast.present('GDN rejected successfully', 'success');
      },
      error: async (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Failed to reject GDN. Please try again.';
        this.errorMessage = msg;
        await this.toast.present(msg, 'danger');
      },
    });
  }

  // ── Expand/Collapse ───────────────────────────────
  toggleExpand(id: number) {
    this.haptic.light();
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedIds.has(id);
  }

  getLineTotal(item: DispatchItem): number {
    return item.quantity * item.unitPrice;
  }

  // ── Download GDN ──────────────────────────────────
  downloadGdn(order: DispatchOrderDisplay) {
    console.log(`Downloading GDN ${order.gdnNumber} for order ${order.orderNumber}`);
    // TODO: Implement download GDN PDF API
  }

  refreshData() {
    this.loadOrders();
    this.loadPaymentApprovedCarts();
    this.loadGdns();
  }

  handlePullRefresh(event: any) {
    this.refreshData();
    setTimeout(() => event.target.complete(), 1500);
  }

  // ── Form Helpers ──────────────────────────────────
  getGdnFieldError(fieldName: string): string {
    const control = this.gdnForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('pattern')) {
      return 'Invalid format';
    }
    return '';
  }

  // ── Proforma Invoices ─────────────────────────────
  loadProformaInvoices() {
    this.isLoadingInvoices = true;

    this.proformaInvoiceService.getAllInvoices().subscribe({
      next: (data) => {
        this.proformaInvoices = data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        // Filter for paid invoices only (first 5)
        this.paidInvoices = this.proformaInvoices
          .filter(inv => inv.paymentStatus === 'PAID')
          .slice(0, 5);
        
        // Group invoices by order/cart ID
        this.groupInvoicesByOrder();
        this.isLoadingInvoices = false;
      },
      error: (error) => {
        console.error('Error loading proforma invoices:', error);
        this.isLoadingInvoices = false;
      }
    });
  }

  groupInvoicesByOrder() {
    this.invoicesByOrder.clear();
    this.proformaInvoices.forEach(invoice => {
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
      return;
    }

    this.downloadingInvoiceId = invoice.id;

    this.proformaInvoiceService.downloadInvoicePdf(invoice.id).subscribe({
      next: async (blob) => {
        await this.downloadService.downloadBlob(blob, `${invoice.piNumber}.pdf`);
        this.downloadingInvoiceId = null;
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
        this.downloadingInvoiceId = null;
      }
    });
  }

  // ── GDN Methods ───────────────────────────────────
  loadGdns() {
    this.isLoadingGdns = true;

    this.gdnService.getAllGdns().subscribe({
      next: (data) => {
        this.gdns = data.sort(
          (a, b) => new Date(b.gdnDate).getTime() - new Date(a.gdnDate).getTime()
        );
        this.groupGdnsByOrder();
        this.isLoadingGdns = false;
      },
      error: (error) => {
        console.error('Error loading GDNs:', error);
        this.isLoadingGdns = false;
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
      return;
    }

    this.downloadingGdnId = gdn.id;

    this.gdnService.downloadGdnPdf(gdn.orderId).subscribe({
      next: async (blob) => {
        await this.downloadService.downloadBlob(blob, `${gdn.gdnNumber}.pdf`);
        this.downloadingGdnId = null;
      },
      error: (error) => {
        console.error('Error downloading GDN PDF:', error);
        this.downloadingGdnId = null;
      }
    });
  }

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
}
