import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// ── Interfaces ──────────────────────────────────────

export interface DispatchItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  batchNumber?: string;
}

export interface DispatchOrder {
  id: string;
  orderNumber: string;
  distributorName: string;
  distributorContact: string;
  salesPersonName: string;
  orderDate: string;
  totalAmount: number;
  items: DispatchItem[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalDate?: string;
  approvalRemarks?: string;
  gdnStatus: 'not-generated' | 'generated' | 'dispatched';
  gdnNumber?: string;
  gdnDate?: string;
  dispatchDate?: string;
  vehicleNumber?: string;
  transporterName?: string;
  shippingAddress?: string;
}

@Component({
  selector: 'app-dispatch',
  templateUrl: './dispatch.page.html',
  styleUrls: ['./dispatch.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class DispatchPage implements OnInit {
  // ── Data ──────────────────────────────────────────
  orders: DispatchOrder[] = [];
  searchTerm = '';
  activeTab: 'pending' | 'approved' | 'gdn' | 'dispatched' = 'pending';

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
  orderBeingRejected: DispatchOrder | null = null;

  isDetailModalOpen = false;
  selectedOrder: DispatchOrder | null = null;

  expandedIds = new Set<string>();

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    // Sample data — in production this would come from an API
    this.orders = [
      {
        id: 'dsp-1',
        orderNumber: 'ORD-2026-001',
        distributorName: 'test-5 created',
        distributorContact: '+91 98765 43210',
        salesPersonName: 'Rahul Sharma',
        orderDate: '2026-02-15',
        totalAmount: 45000,
        items: [
          { productName: 'Nectar Premium Mix', quantity: 10, unitPrice: 2500, batchNumber: 'BN-2026-0100' },
          { productName: 'Organic Blend Pack', quantity: 5, unitPrice: 3000, batchNumber: 'BN-2026-0101' },
          { productName: 'Wellness Supplement', quantity: 8, unitPrice: 1875, batchNumber: 'BN-2026-0102' },
        ],
        approvalStatus: 'pending',
        gdnStatus: 'not-generated',
        shippingAddress: '45, MG Road, Bengaluru, Karnataka 560001',
      },
      {
        id: 'dsp-2',
        orderNumber: 'ORD-2026-002',
        distributorName: 'New Distributor',
        distributorContact: '+91 87654 32109',
        salesPersonName: 'Vikram Singh',
        orderDate: '2026-02-10',
        totalAmount: 32000,
        items: [
          { productName: 'Standard Mix Pack', quantity: 20, unitPrice: 1600, batchNumber: 'BN-2026-0200' },
        ],
        approvalStatus: 'pending',
        gdnStatus: 'not-generated',
        shippingAddress: '12, Civil Lines, Delhi 110054',
      },
      {
        id: 'dsp-3',
        orderNumber: 'ORD-2026-003',
        distributorName: 'test-3-edited',
        distributorContact: '+91 76543 21098',
        salesPersonName: 'Rahul Sharma',
        orderDate: '2026-01-28',
        totalAmount: 78000,
        items: [
          { productName: 'Premium Wellness Pack', quantity: 15, unitPrice: 5200, batchNumber: 'BN-2026-0300' },
        ],
        approvalStatus: 'approved',
        approvalDate: '2026-01-30',
        approvalRemarks: 'Approved by Sales Manager',
        gdnStatus: 'not-generated',
        shippingAddress: '78, Station Road, Jaipur, Rajasthan 302001',
      },
      {
        id: 'dsp-4',
        orderNumber: 'ORD-2026-004',
        distributorName: 'Metro Distributors Pvt. Ltd.',
        distributorContact: '+91 65432 10987',
        salesPersonName: 'Priya Patel',
        orderDate: '2026-01-20',
        totalAmount: 125000,
        items: [
          { productName: 'Nectar Premium Mix', quantity: 20, unitPrice: 2500, batchNumber: 'BN-2026-0400' },
          { productName: 'Wellness Supplement', quantity: 30, unitPrice: 1875, batchNumber: 'BN-2026-0401' },
          { productName: 'Immunity Booster', quantity: 10, unitPrice: 3375, batchNumber: 'BN-2026-0402' },
        ],
        approvalStatus: 'approved',
        approvalDate: '2026-01-22',
        approvalRemarks: 'Approved by Sales Manager',
        gdnStatus: 'generated',
        gdnNumber: 'GDN-2026-004',
        gdnDate: '2026-01-23',
        vehicleNumber: 'KA-01-AB-1234',
        transporterName: 'Express Logistics',
        shippingAddress: '100, Industrial Area, Pune, Maharashtra 411019',
      },
      {
        id: 'dsp-5',
        orderNumber: 'ORD-2026-005',
        distributorName: 'Southern Supplies Co.',
        distributorContact: '+91 54321 09876',
        salesPersonName: 'Amit Verma',
        orderDate: '2026-01-10',
        totalAmount: 92000,
        items: [
          { productName: 'Organic Blend Pack', quantity: 12, unitPrice: 3000, batchNumber: 'BN-2026-0500' },
          { productName: 'Premium Wellness Pack', quantity: 10, unitPrice: 5600, batchNumber: 'BN-2026-0501' },
        ],
        approvalStatus: 'approved',
        approvalDate: '2026-01-12',
        approvalRemarks: 'Verified and approved',
        gdnStatus: 'dispatched',
        gdnNumber: 'GDN-2026-005',
        gdnDate: '2026-01-13',
        dispatchDate: '2026-01-14',
        vehicleNumber: 'TN-04-CD-5678',
        transporterName: 'Swift Transport',
        shippingAddress: '23, Anna Nagar, Chennai, Tamil Nadu 600040',
      },
    ];
  }

  // ── Filtering ─────────────────────────────────────
  get filteredOrders(): DispatchOrder[] {
    let filtered = this.orders;

    // Tab filter
    switch (this.activeTab) {
      case 'pending':
        filtered = filtered.filter((o) => o.approvalStatus === 'pending');
        break;
      case 'approved':
        filtered = filtered.filter((o) => o.approvalStatus === 'approved' && o.gdnStatus === 'not-generated');
        break;
      case 'gdn':
        filtered = filtered.filter((o) => o.gdnStatus === 'generated');
        break;
      case 'dispatched':
        filtered = filtered.filter((o) => o.gdnStatus === 'dispatched');
        break;
    }

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

  get tabCounts() {
    return {
      pending: this.orders.filter((o) => o.approvalStatus === 'pending').length,
      approved: this.orders.filter((o) => o.approvalStatus === 'approved' && o.gdnStatus === 'not-generated').length,
      gdn: this.orders.filter((o) => o.gdnStatus === 'generated').length,
      dispatched: this.orders.filter((o) => o.gdnStatus === 'dispatched').length,
    };
  }

  // ── Actions ───────────────────────────────────────
  approveOrder(order: DispatchOrder) {
    order.approvalStatus = 'approved';
    order.approvalDate = new Date().toISOString().split('T')[0];
    order.approvalRemarks = 'Approved by Dispatch Manager';
  }

  openRejectModal(order: DispatchOrder) {
    this.orderBeingRejected = order;
    this.rejectRemarks = '';
    this.isRejectModalOpen = true;
  }

  confirmReject() {
    if (this.orderBeingRejected) {
      this.orderBeingRejected.approvalStatus = 'rejected';
      this.orderBeingRejected.approvalDate = new Date().toISOString().split('T')[0];
      this.orderBeingRejected.approvalRemarks = this.rejectRemarks || 'Rejected by Dispatch Manager';
    }
    this.isRejectModalOpen = false;
    this.orderBeingRejected = null;
    this.rejectRemarks = '';
  }

  cancelReject() {
    this.isRejectModalOpen = false;
    this.orderBeingRejected = null;
    this.rejectRemarks = '';
  }

  // ── GDN Generation ────────────────────────────────
  generateGdn(order: DispatchOrder) {
    // TODO: Integrate GDN generation API here
    // e.g. this.dispatchService.generateGdn(order.id).subscribe(res => { order.gdnStatus = 'generated'; order.gdnNumber = res.gdnNumber; });
    console.log('Generating GDN for order:', order.orderNumber);
  }

  markDispatched(order: DispatchOrder) {
    order.gdnStatus = 'dispatched';
    order.dispatchDate = new Date().toISOString().split('T')[0];
  }

  // ── Detail Modal ──────────────────────────────────
  openDetail(order: DispatchOrder) {
    this.selectedOrder = order;
    this.isDetailModalOpen = true;
  }

  closeDetail() {
    this.isDetailModalOpen = false;
    this.selectedOrder = null;
  }

  // ── Expand/Collapse ───────────────────────────────
  toggleExpand(id: string) {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  getLineTotal(item: DispatchItem): number {
    return item.quantity * item.unitPrice;
  }

  // ── Download GDN (stub) ───────────────────────────
  downloadGdn(order: DispatchOrder) {
    console.log(`Downloading GDN ${order.gdnNumber} for order ${order.orderNumber}`);
    // TODO: hit real API endpoint to download PDF
  }

  refreshData() {
    this.loadOrders();
  }
}
