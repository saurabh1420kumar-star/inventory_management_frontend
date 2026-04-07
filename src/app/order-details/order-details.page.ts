import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  cartOutline,
  timeOutline,
  checkmarkCircle,
  closeCircle,
  ellipseOutline,
  documentTextOutline,
  cashOutline,
  cubeOutline,
  checkmarkDoneCircleOutline,
  chevronDownOutline,
  chevronUpOutline,
  personOutline,
  calendarOutline,
  businessOutline,
  filterOutline,
  downloadOutline,
  callOutline,
  mailOutline,
  shieldCheckmarkOutline,
  carOutline,
  receiptOutline,
  walletOutline,
  checkboxOutline,
  navigateOutline,
  refreshOutline
} from 'ionicons/icons';
import { SalesService, OrderTrackingItem, OrderTrackingStep } from '../services/sales.service';
import { GdnService } from '../services/gdn.service';
import { DownloadService } from '../services/download.service';
import { DistributorService } from '../services/distributor.service';
import { InvoiceService } from '../services/invoice.service';
import { Auth } from '../services/auth';

export interface AssignedPerson {
  name: string;
  role?: string;
  contact?: string;
  email?: string;
}

export interface OrderStep {
  label: string;
  status: 'completed' | 'pending' | 'cancelled' | 'in-progress';
  date?: string;
  remarks?: string;
  assignedPerson?: AssignedPerson;
  hasDownload?: boolean;
  downloadLabel?: string;
  hasAction?: boolean;
  actionResponse?: 'yes' | 'no' | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  distributorName: string;
  distributorId?: number;
  orderDate: string;
  totalAmount: number;
  steps: OrderStep[];
  expanded?: boolean;
}

@Component({
  selector: 'app-order-details',
  templateUrl: './order-details.page.html',
  styleUrls: ['./order-details.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
  ],
  standalone: true,
})
export class OrderDetailsPage implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  searchQuery: string = '';
  filterStatus: string = 'all';
  isLoading: boolean = false;
  loadError: string = '';
  downloadingGdnOrderId: string | null = null;
  downloadingInvoiceOrderId: string | null = null;

  // Confirm Order Received Modal
  showConfirmModal: boolean = false;
  confirmingOrder: Order | null = null;
  confirmForm = { remarks: '', feedback: '', status: 'RECEIVED_COMPLETE' };
  isConfirming: boolean = false;

  // Stats
  totalOrders: number = 0;
  pendingOrders: number = 0;
  completedOrders: number = 0;

  constructor(
    private salesService: SalesService,
    private gdnService: GdnService,
    private downloadService: DownloadService,
    private distributorService: DistributorService,
    private invoiceService: InvoiceService,
    private auth: Auth,
    private toastController: ToastController
  ) {
    addIcons({
      'search-outline': searchOutline,
      'cart-outline': cartOutline,
      'time-outline': timeOutline,
      'checkmark-circle': checkmarkCircle,
      'close-circle': closeCircle,
      'ellipse-outline': ellipseOutline,
      'document-text-outline': documentTextOutline,
      'cash-outline': cashOutline,
      'cube-outline': cubeOutline,
      'checkmark-done-circle-outline': checkmarkDoneCircleOutline,
      'chevron-down-outline': chevronDownOutline,
      'chevron-up-outline': chevronUpOutline,
      'person-outline': personOutline,
      'calendar-outline': calendarOutline,
      'business-outline': businessOutline,
      'filter-outline': filterOutline,
      'download-outline': downloadOutline,
      'call-outline': callOutline,
      'mail-outline': mailOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline,
      'car-outline': carOutline,
      'receipt-outline': receiptOutline,
      'wallet-outline': walletOutline,
      'checkbox-outline': checkboxOutline,
      'navigate-outline': navigateOutline,
      'refresh-outline': refreshOutline,
    });
  }

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    this.loadError = '';
    const role = this.auth.getRoleType();
    const distributorId = role === 'DISTRIBUTOR' ? (this.auth.getUserId() ?? undefined) : undefined;
    this.salesService.getOrderTracking('all', 0, 50, distributorId).subscribe({
      next: (response) => {
        this.orders = (response.orders || []).map((item: OrderTrackingItem, index: number) =>
          this.mapApiOrderToOrder(item, index === 0)
        );
        this.filteredOrders = [...this.orders];
        this.updateStats();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load order tracking data', err);
        this.loadError = 'Failed to load orders. Please try again.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Maps the API OrderTrackingItem to the local Order interface.
   *
   * MAPPED fields:
   *   id, orderNumber, distributorName, distributorId, orderDate, totalAmount
   *   steps[].label, status, date, remarks, hasDownload, downloadLabel, hasAction, actionResponse
   *   steps[].assignedPerson → mapped as { name } only (role/contact/email NOT available from API)
   *
   * NOT MAPPED (not in API response):
   *   AssignedPerson.role    – API does not return the person's role
   *   AssignedPerson.contact – API does not return the person's phone number
   *   AssignedPerson.email   – API does not return the person's email address
   */
  private mapApiOrderToOrder(item: OrderTrackingItem, expandFirst: boolean = false): Order {
    return {
      id: String(item.id),
      orderNumber: item.orderNumber,
      distributorName: item.distributorName,
      distributorId: item.distributorId,
      orderDate: item.orderDate,
      totalAmount: item.totalAmount,
      expanded: expandFirst,
      steps: (item.steps || [])
        .slice()
        .sort((a, b) => a.stepSequence - b.stepSequence)
        .map((s) => ({
          label: s.label,
          status: s.status,
          date: s.date || undefined,
          remarks: s.remarks || undefined,
          assignedPerson: s.assignedPerson
            ? { name: s.assignedPerson.name, role: s.assignedPerson.role, contact: s.assignedPerson.contact, email: s.assignedPerson.email }
            : undefined,
          hasDownload: s.hasDownload,
          downloadLabel: s.downloadLabel || undefined,
          hasAction: s.hasAction,
          actionResponse: (s.actionResponse as 'yes' | 'no' | null) ?? null,
        })),
    };
  }

  updateStats() {
    this.totalOrders = this.orders.length;
    this.completedOrders = this.orders.filter(o => 
      o.steps.every(s => s.status === 'completed')
    ).length;
    this.pendingOrders = this.orders.filter(o => 
      o.steps.some(s => s.status === 'pending' || s.status === 'in-progress')
    ).length;
  }

  onSearchChange(event: any) {
    this.searchQuery = event.target.value?.toLowerCase() || '';
    this.applyFilters();
  }

  onFilterChange(status: string) {
    this.filterStatus = status;
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.orders];

    if (this.searchQuery) {
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(this.searchQuery) ||
        o.distributorName.toLowerCase().includes(this.searchQuery)
      );
    }

    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(o => {
        if (this.filterStatus === 'completed') return o.steps.every(s => s.status === 'completed');
        if (this.filterStatus === 'cancelled') return o.steps.some(s => s.status === 'cancelled');
        if (this.filterStatus === 'pending') return o.steps.some(s => s.status === 'pending' || s.status === 'in-progress');
        return true;
      });
    }

    this.filteredOrders = filtered;
  }

  toggleOrder(order: Order) {
    order.expanded = !order.expanded;
  }

  getOrderStatus(order: Order): string {
    if (order.steps.some(s => s.status === 'cancelled')) return 'Cancelled';
    if (order.steps.every(s => s.status === 'completed')) return 'Completed';
    const inProgress = order.steps.find(s => s.status === 'in-progress');
    if (inProgress) return inProgress.label;
    return 'Pending';
  }

  getShortStatus(order: Order): string {
    const full = this.getOrderStatus(order);
    const shortMap: { [key: string]: string } = {
      'Order Placed': 'Placed',
      'Order Confirmed': 'Confirmed',
      'Proforma Invoice Generated': 'PI Gen.',
      'Payment Verified': 'Paid',
      'Production Started': 'Prod.',
      'Quality Check': 'QC',
      'Goods Dispatch Note': 'GDN',
      'Shipped': 'Shipped',
      'Out for Delivery': 'Delivery',
      'Order Received': 'Received',
      'Completed': 'Done',
      'Cancelled': 'Cancelled',
      'Pending': 'Pending',
    };
    return shortMap[full] || (full.length > 10 ? full.substring(0, 8) + '...' : full);
  }

  getOrderStatusColor(order: Order): string {
    if (order.steps.some(s => s.status === 'cancelled')) return 'text-red-500 bg-red-50';
    if (order.steps.every(s => s.status === 'completed')) return 'text-emerald-500 bg-emerald-50';
    return 'text-amber-500 bg-amber-50';
  }

  getStepIcon(step: OrderStep): string {
    switch (step.status) {
      case 'completed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      case 'in-progress': return 'time-outline';
      default: return 'ellipse-outline';
    }
  }

  getStepColor(step: OrderStep): string {
    switch (step.status) {
      case 'completed': return 'text-emerald-500';
      case 'cancelled': return 'text-red-500';
      case 'in-progress': return 'text-blue-500';
      default: return 'text-gray-300';
    }
  }

  getStepLineColor(step: OrderStep): string {
    switch (step.status) {
      case 'completed': return 'bg-emerald-400';
      case 'cancelled': return 'bg-red-300';
      case 'in-progress': return 'bg-blue-300';
      default: return 'bg-gray-200';
    }
  }

  getCompletedSteps(order: Order): number {
    return order.steps.filter(s => s.status === 'completed').length;
  }

  getProgressPercentage(order: Order): number {
    return Math.round((this.getCompletedSteps(order) / order.steps.length) * 100);
  }

  onDownloadDocument(step: OrderStep, order: Order) {
    console.log(`Downloading ${step.downloadLabel} for order ${order.orderNumber}`);
    // TODO: Implement actual download logic via API
  }

  onOrderReceivedAction(order: Order, response: 'yes' | 'no') {
    this.confirmingOrder = order;
    this.confirmForm = { remarks: '', feedback: '', status: 'RECEIVED_COMPLETE' };
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.confirmingOrder = null;
    this.isConfirming = false;
  }

  extractOrderId(orderNumber: string): number {
    // e.g. "ORD-58-20260407" → 58
    const parts = orderNumber.split('-');
    return parts.length >= 2 ? Number(parts[1]) : 0;
  }

  async submitConfirmOrder() {
    if (!this.confirmingOrder || !this.confirmingOrder.distributorId) return;
    this.isConfirming = true;
    const orderId = this.extractOrderId(this.confirmingOrder.orderNumber);
    const payload = {
      orderId,
      gdnNumber: '',
      status: this.confirmForm.status,
      overallRating: 1,
      feedback: this.confirmForm.feedback,
      remarks: this.confirmForm.remarks,
      itemConfirmations: []
    };
    this.distributorService.confirmOrder(this.confirmingOrder.distributorId, payload).subscribe({
      next: async () => {
        const receivedStep = this.confirmingOrder!.steps.find(s => s.label === 'Order Received');
        if (receivedStep) {
          receivedStep.actionResponse = 'yes';
          receivedStep.status = 'completed';
          receivedStep.remarks = this.confirmForm.remarks || 'Order received and confirmed by distributor';
          receivedStep.date = new Date().toISOString().split('T')[0];
        }
        this.updateStats();
        this.closeConfirmModal();
        const toast = await this.toastController.create({
          message: 'Order confirmed successfully!',
          duration: 3000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      },
      error: async (err) => {
        console.error('Error confirming order receipt:', err);
        this.isConfirming = false;
        const toast = await this.toastController.create({
          message: err?.error?.message || 'Failed to confirm order. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

  getStepLabelIcon(step: OrderStep): string {
    const label = step.label.toLowerCase();
    if (label.includes('order placed')) return 'cart-outline';
    if (label.includes('pending approval from sales') || label.includes('approved from sales')) return 'person-outline';
    if (label.includes('proforma invoice')) return 'document-text-outline';
    if (label.includes('awaiting payment') || label.includes('approved from accounts')) return 'wallet-outline';
    if (label.includes('awaiting confirmation from logistics') || label.includes('approved from logistics')) return 'cube-outline';
    if (label.includes('gdn generated')) return 'receipt-outline';
    if (label.includes('on the way')) return 'car-outline';
    if (label.includes('order received')) return 'checkbox-outline';
    return 'ellipse-outline';
  }

  isOnTheWayCompleted(order: Order): boolean {
    const step = order.steps.find(s => s.label.toLowerCase().includes('on the way'));
    return step?.status === 'completed';
  }

  downloadGdnForOrder(order: Order) {
    this.downloadingGdnOrderId = order.id;
    this.gdnService.downloadGdnPdf(order.orderNumber).subscribe({
      next: async (blob) => {
        await this.downloadService.downloadBlob(blob, `GDN-${order.orderNumber}.pdf`);
        this.downloadingGdnOrderId = null;
      },
      error: (err) => {
        console.error('Error downloading GDN:', err);
        this.downloadingGdnOrderId = null;
      }
    });
  }

  isOrderComplete(order: Order): boolean {
    return order.steps.length > 0 && order.steps.every(s => s.status === 'completed');
  }

  downloadInvoiceForOrder(order: Order) {
    const orderId = this.extractOrderId(order.orderNumber);
    this.downloadingInvoiceOrderId = order.id;
    this.invoiceService.downloadInvoicePdf(orderId).subscribe({
      next: async (blob) => {
        await this.downloadService.downloadBlob(blob, `Invoice-${order.orderNumber}.pdf`);
        this.downloadingInvoiceOrderId = null;
      },
      error: async (err) => {
        console.error('Error downloading invoice:', err);
        this.downloadingInvoiceOrderId = null;
        const toast = await this.toastController.create({
          message: err?.error?.message || 'Failed to download invoice. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }
}
