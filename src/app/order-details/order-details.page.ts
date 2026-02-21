import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
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
  navigateOutline
} from 'ionicons/icons';

export interface AssignedPerson {
  name: string;
  role: string;
  contact: string;
  email: string;
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

  // Stats
  totalOrders: number = 0;
  pendingOrders: number = 0;
  completedOrders: number = 0;

  constructor() {
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
      'navigate-outline': navigateOutline
    });
  }

  ngOnInit() {
    this.loadSampleOrders();
    this.updateStats();
  }

  loadSampleOrders() {
    this.orders = [
      {
        id: '1',
        orderNumber: 'ORD-2026-001',
        distributorName: 'test-5 created',
        orderDate: '2026-02-15',
        totalAmount: 45000,
        steps: [
          { label: 'Order Placed', status: 'completed', date: '2026-02-15', remarks: 'Order submitted by distributor' },
          {
            label: 'Pending Approval from Sales', status: 'completed', date: '2026-02-16', remarks: 'Sent to sales team for review',
            assignedPerson: { name: 'Rahul Sharma', role: 'Zonal Sales Manager', contact: '+91 98765 43210', email: 'rahul.sharma@nectar.com' }
          },
          {
            label: 'Approved from Sales', status: 'completed', date: '2026-02-17', remarks: 'Approved by Zonal Sales Manager',
            assignedPerson: { name: 'Rahul Sharma', role: 'Zonal Sales Manager', contact: '+91 98765 43210', email: 'rahul.sharma@nectar.com' }
          },
          {
            label: 'Proforma Invoice Generated', status: 'in-progress', date: '2026-02-18', remarks: 'PI #PI-2026-001 being prepared',
            hasDownload: true, downloadLabel: 'Download Proforma Invoice',
            assignedPerson: { name: 'Priya Patel', role: 'Accounts Executive', contact: '+91 87654 32109', email: 'priya.patel@nectar.com' }
          },
          {
            label: 'Awaiting Payment Confirmation from Accounts', status: 'pending',
            assignedPerson: { name: 'Amit Verma', role: 'Accounts Manager', contact: '+91 76543 21098', email: 'amit.verma@nectar.com' }
          },
          {
            label: 'Approved from Accounts', status: 'pending',
            assignedPerson: { name: 'Amit Verma', role: 'Accounts Manager', contact: '+91 76543 21098', email: 'amit.verma@nectar.com' }
          },
          {
            label: 'Awaiting Confirmation from Logistics', status: 'pending',
            assignedPerson: { name: 'Suresh Kumar', role: 'Logistics Head', contact: '+91 65432 10987', email: 'suresh.kumar@nectar.com' }
          },
          {
            label: 'Approved from Logistics', status: 'pending',
            assignedPerson: { name: 'Suresh Kumar', role: 'Logistics Head', contact: '+91 65432 10987', email: 'suresh.kumar@nectar.com' }
          },
          {
            label: 'GDN Generated', status: 'pending',
            hasDownload: true, downloadLabel: 'Download GDN',
            assignedPerson: { name: 'Rajesh Gupta', role: 'Warehouse Manager', contact: '+91 54321 09876', email: 'rajesh.gupta@nectar.com' }
          },
          { label: 'Order is On the Way', status: 'pending' },
          { label: 'Order Received', status: 'pending', hasAction: true, actionResponse: null },
        ],
        expanded: true
      },
      {
        id: '2',
        orderNumber: 'ORD-2026-002',
        distributorName: 'New Distributor',
        orderDate: '2026-02-10',
        totalAmount: 32000,
        steps: [
          { label: 'Order Placed', status: 'completed', date: '2026-02-10', remarks: 'Order submitted' },
          {
            label: 'Pending Approval from Sales', status: 'completed', date: '2026-02-11', remarks: 'Sent to sales team',
            assignedPerson: { name: 'Vikram Singh', role: 'Regional Sales Manager', contact: '+91 99887 76655', email: 'vikram.singh@nectar.com' }
          },
          {
            label: 'Approved from Sales', status: 'cancelled', date: '2026-02-12', remarks: 'Rejected: Insufficient stock',
            assignedPerson: { name: 'Vikram Singh', role: 'Regional Sales Manager', contact: '+91 99887 76655', email: 'vikram.singh@nectar.com' }
          },
          { label: 'Proforma Invoice Generated', status: 'cancelled', hasDownload: true, downloadLabel: 'Download Proforma Invoice' },
          { label: 'Awaiting Payment Confirmation from Accounts', status: 'cancelled' },
          { label: 'Approved from Accounts', status: 'cancelled' },
          { label: 'Awaiting Confirmation from Logistics', status: 'cancelled' },
          { label: 'Approved from Logistics', status: 'cancelled' },
          { label: 'GDN Generated', status: 'cancelled', hasDownload: true, downloadLabel: 'Download GDN' },
          { label: 'Order is On the Way', status: 'cancelled' },
          { label: 'Order Received', status: 'cancelled', hasAction: true, actionResponse: null },
        ],
        expanded: false
      },
      {
        id: '3',
        orderNumber: 'ORD-2026-003',
        distributorName: 'test-3-edited',
        orderDate: '2026-01-28',
        totalAmount: 78000,
        steps: [
          { label: 'Order Placed', status: 'completed', date: '2026-01-28', remarks: 'Order submitted' },
          {
            label: 'Pending Approval from Sales', status: 'completed', date: '2026-01-29', remarks: 'Sent to sales team',
            assignedPerson: { name: 'Rahul Sharma', role: 'Zonal Sales Manager', contact: '+91 98765 43210', email: 'rahul.sharma@nectar.com' }
          },
          {
            label: 'Approved from Sales', status: 'completed', date: '2026-01-30', remarks: 'Approved by Regional Sales Manager',
            assignedPerson: { name: 'Rahul Sharma', role: 'Zonal Sales Manager', contact: '+91 98765 43210', email: 'rahul.sharma@nectar.com' }
          },
          {
            label: 'Proforma Invoice Generated', status: 'completed', date: '2026-02-01', remarks: 'Invoice #PI-2026-003',
            hasDownload: true, downloadLabel: 'Download Proforma Invoice',
            assignedPerson: { name: 'Priya Patel', role: 'Accounts Executive', contact: '+91 87654 32109', email: 'priya.patel@nectar.com' }
          },
          {
            label: 'Awaiting Payment Confirmation from Accounts', status: 'completed', date: '2026-02-03', remarks: 'Payment verified',
            assignedPerson: { name: 'Amit Verma', role: 'Accounts Manager', contact: '+91 76543 21098', email: 'amit.verma@nectar.com' }
          },
          {
            label: 'Approved from Accounts', status: 'completed', date: '2026-02-04', remarks: 'Payment confirmed & approved',
            assignedPerson: { name: 'Amit Verma', role: 'Accounts Manager', contact: '+91 76543 21098', email: 'amit.verma@nectar.com' }
          },
          {
            label: 'Awaiting Confirmation from Logistics', status: 'completed', date: '2026-02-05', remarks: 'Logistics team notified',
            assignedPerson: { name: 'Suresh Kumar', role: 'Logistics Head', contact: '+91 65432 10987', email: 'suresh.kumar@nectar.com' }
          },
          {
            label: 'Approved from Logistics', status: 'completed', date: '2026-02-06', remarks: 'Ready for dispatch',
            assignedPerson: { name: 'Suresh Kumar', role: 'Logistics Head', contact: '+91 65432 10987', email: 'suresh.kumar@nectar.com' }
          },
          {
            label: 'GDN Generated', status: 'completed', date: '2026-02-07', remarks: 'GDN #GDN-2026-003',
            hasDownload: true, downloadLabel: 'Download GDN',
            assignedPerson: { name: 'Rajesh Gupta', role: 'Warehouse Manager', contact: '+91 54321 09876', email: 'rajesh.gupta@nectar.com' }
          },
          { label: 'Order is On the Way', status: 'completed', date: '2026-02-08', remarks: 'Shipped via logistics partner' },
          { label: 'Order Received', status: 'completed', date: '2026-02-12', remarks: 'Delivered successfully', hasAction: true, actionResponse: 'yes' },
        ],
        expanded: false
      }
    ];
    this.filteredOrders = [...this.orders];
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
    const receivedStep = order.steps.find(s => s.label === 'Order Received');
    if (receivedStep) {
      receivedStep.actionResponse = response;
      if (response === 'yes') {
        receivedStep.status = 'completed';
        receivedStep.remarks = 'Order received and confirmed by distributor';
        receivedStep.date = new Date().toISOString().split('T')[0];
      } else {
        receivedStep.status = 'cancelled';
        receivedStep.remarks = 'Distributor reported order not received';
        receivedStep.date = new Date().toISOString().split('T')[0];
      }
      this.updateStats();
    }
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
}
