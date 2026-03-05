import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../services/sales.service';

export interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  distributorName: string;
  salesPersonName: string;
  orderDate: string;
  totalAmount: number;
  items: OrderItem[];
  status: 'pending' | 'approved' | 'rejected' | 'pi-ready';
  remarks?: string;
  processedAt?: string;
  piNumber?: string;
  piDate?: string;
}

interface Distributor {
  id: string;
  name: string;
  salesPersonName: string;
  salesPerMonth: number;
  salesPerQuarter: number;
  salesPerYear: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-sales',
  templateUrl: './sales.page.html',
  styleUrls: ['./sales.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class SalesPage implements OnInit {
  distributors: Distributor[] = [];
  isLoading = false;
  isDistributorsLoading = false;
  errorMessage = '';
  searchTerm = '';
  
  isAddModalOpen = false;
  isEditModalOpen = false;
  selectedDistributor: Distributor | null = null;

  // ── Order Approval ──────────────────────────────────────
  orderSummaries: OrderSummary[] = [
    {
      id: 'ord-1',
      orderNumber: 'ORD-2026-001',
      distributorName: 'test-5 created',
      salesPersonName: 'Rahul Sharma',
      orderDate: '2026-02-15',
      totalAmount: 45000,
      items: [
        { productName: 'Nectar Premium Mix', quantity: 10, unitPrice: 2500 },
        { productName: 'Organic Blend Pack', quantity: 5, unitPrice: 3000 },
        { productName: 'Wellness Supplement', quantity: 8, unitPrice: 1875 },
      ],
      status: 'pending',
    },
    {
      id: 'ord-2',
      orderNumber: 'ORD-2026-002',
      distributorName: 'New Distributor',
      salesPersonName: 'Vikram Singh',
      orderDate: '2026-02-10',
      totalAmount: 32000,
      items: [
        { productName: 'Standard Mix Pack', quantity: 20, unitPrice: 1600 },
      ],
      status: 'pending',
    },
    {
      id: 'ord-3',
      orderNumber: 'ORD-2026-003',
      distributorName: 'test-3-edited',
      salesPersonName: 'Rahul Sharma',
      orderDate: '2026-01-28',
      totalAmount: 78000,
      items: [
        { productName: 'Premium Wellness Pack', quantity: 15, unitPrice: 5200 },
      ],
      status: 'pending',
    },
  ];

  orderFilterTab: 'all' | 'pending' | 'approved' | 'rejected' | 'pi-ready' = 'pending';
  orderSearchTerm = '';
  expandedOrderIds = new Set<string>();
  isRejectModalOpen = false;
  rejectRemarks = '';
  orderBeingRejected: OrderSummary | null = null;
  
  addForm: FormGroup;
  editForm: FormGroup;

  statCards = [
    { label: 'Total Distributors', value: 0, icon: 'storefront-outline', color: 'emerald' },
    { label: 'Total Monthly Sales', value: '$0', icon: 'trending-up-outline', color: 'green' },
    { label: 'Active', value: 0, icon: 'checkmark-circle-outline', color: 'slate' },
  ];

  constructor(
    private salesService: SalesService,
    private fb: FormBuilder,
    private modalController: ModalController
  ) {
    this.addForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      salesPersonName: ['', [Validators.required, Validators.minLength(2)]],
      salesPerMonth: [0, [Validators.required, Validators.min(0)]],
      salesPerQuarter: [0, [Validators.required, Validators.min(0)]],
      salesPerYear: [0, [Validators.required, Validators.min(0)]],
      status: ['ACTIVE', Validators.required],
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      salesPersonName: ['', [Validators.required, Validators.minLength(2)]],
      salesPerMonth: [0, [Validators.required, Validators.min(0)]],
      salesPerQuarter: [0, [Validators.required, Validators.min(0)]],
      salesPerYear: [0, [Validators.required, Validators.min(0)]],
      status: ['ACTIVE', Validators.required],
    });
  }

  ngOnInit() {
    this.loadDistributors();
  }

  loadDistributors() {
    this.isDistributorsLoading = true;
    this.errorMessage = '';
    
    this.salesService.getAllDistributors().subscribe({
      next: (data) => {
        this.distributors = data;
        this.updateStats();
        this.isDistributorsLoading = false;
      },
      error: (error) => {
        console.error('Error loading distributors:', error);
        this.errorMessage = 'Failed to load distributors. Please try again.';
        this.isDistributorsLoading = false;
      },
    });
  }

  updateStats() {
    const totalMonthly = this.distributors.reduce((sum, d) => sum + d.salesPerMonth, 0);
    const active = this.distributors.filter(d => d.status === 'ACTIVE').length;

    this.statCards = [
      { label: 'Total Distributors', value: this.distributors.length, icon: 'storefront-outline', color: 'emerald' },
      { label: 'Total Monthly Sales', value: `$${totalMonthly.toLocaleString()}`, icon: 'trending-up-outline', color: 'green' },
      { label: 'Active', value: active, icon: 'checkmark-circle-outline', color: 'slate' },
    ];
  }

  openAddModal() {
    this.addForm.reset({ status: 'ACTIVE' });
    this.isAddModalOpen = true;
  }

  closeAddModal() {
    this.isAddModalOpen = false;
  }

  openEditModal(distributor: Distributor) {
    this.selectedDistributor = distributor;
    this.editForm.patchValue({
      name: distributor.name,
      salesPersonName: distributor.salesPersonName,
      salesPerMonth: distributor.salesPerMonth,
      salesPerQuarter: distributor.salesPerQuarter,
      salesPerYear: distributor.salesPerYear,
      status: distributor.status,
    });
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selectedDistributor = null;
  }

  addDistributor() {
    if (this.addForm.invalid) return;

    this.isDistributorsLoading = true;
    const formData = this.addForm.value;

    this.salesService.createDistributor(formData).subscribe({
      next: () => {
        this.loadDistributors();
        this.closeAddModal();
        this.addForm.reset({ status: 'ACTIVE' });
      },
      error: (error) => {
        console.error('Error creating distributor:', error);
        this.errorMessage = 'Failed to create distributor. Please try again.';
        this.isDistributorsLoading = false;
      },
    });
  }

  updateDistributor() {
    if (!this.selectedDistributor || this.editForm.invalid) return;

    this.isDistributorsLoading = true;
    const formData = this.editForm.value;

    this.salesService.updateDistributor(this.selectedDistributor.id, formData).subscribe({
      next: () => {
        this.loadDistributors();
        this.closeEditModal();
      },
      error: (error) => {
        console.error('Error updating distributor:', error);
        this.errorMessage = 'Failed to update distributor. Please try again.';
        this.isDistributorsLoading = false;
      },
    });
  }

  deleteDistributor(id: string) {
    if (confirm('Are you sure you want to delete this distributor?')) {
      this.isDistributorsLoading = true;
      this.salesService.deleteDistributor(id).subscribe({
        next: () => {
          this.loadDistributors();
        },
        error: (error) => {
          console.error('Error deleting distributor:', error);
          this.errorMessage = 'Failed to delete distributor. Please try again.';
          this.isDistributorsLoading = false;
        },
      });
    }
  }

  toggleStatus(id: string) {
    this.salesService.toggleDistributorStatus(id).subscribe({
      next: () => {
        this.loadDistributors();
      },
      error: (error) => {
        console.error('Error toggling status:', error);
      },
    });
  }

  get filteredDistributors() {
    if (!this.searchTerm.trim()) return this.distributors;
    const term = this.searchTerm.toLowerCase();
    return this.distributors.filter(d =>
      d.name.toLowerCase().includes(term) ||
      d.salesPersonName.toLowerCase().includes(term)
    );
  }

  // ── Order Approval Helpers ───────────────────────────────
  get filteredOrderSummaries(): OrderSummary[] {
    let filtered = this.orderFilterTab === 'all'
      ? this.orderSummaries
      : this.orderSummaries.filter(o => o.status === this.orderFilterTab);

    if (this.orderSearchTerm.trim()) {
      const term = this.orderSearchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(term) ||
        o.distributorName.toLowerCase().includes(term) ||
        o.salesPersonName.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  get orderTabCounts(): Record<string, number> {
    return {
      all: this.orderSummaries.length,
      pending: this.orderSummaries.filter(o => o.status === 'pending').length,
      approved: this.orderSummaries.filter(o => o.status === 'approved').length,
      'pi-ready': this.orderSummaries.filter(o => o.status === 'pi-ready').length,
      rejected: this.orderSummaries.filter(o => o.status === 'rejected').length,
    };
  }

  approveOrder(order: OrderSummary) {
    order.status = 'approved';
    order.processedAt = new Date().toISOString();
    order.remarks = 'Approved by Sales Manager';
  }

  generateProformaInvoice(order: OrderSummary) {
    const now = new Date();
    order.status = 'pi-ready';
    order.piNumber = `PI-${now.getFullYear()}-${order.orderNumber.split('-').pop()}`;
    order.piDate = now.toISOString().split('T')[0];
  }

  openRejectModal(order: OrderSummary) {
    this.orderBeingRejected = order;
    this.rejectRemarks = '';
    this.isRejectModalOpen = true;
  }

  confirmReject() {
    if (this.orderBeingRejected) {
      this.orderBeingRejected.status = 'rejected';
      this.orderBeingRejected.remarks = this.rejectRemarks || 'Rejected by Sales Manager';
      this.orderBeingRejected.processedAt = new Date().toISOString();
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

  toggleOrderExpand(id: string) {
    if (this.expandedOrderIds.has(id)) {
      this.expandedOrderIds.delete(id);
    } else {
      this.expandedOrderIds.add(id);
    }
  }

  isOrderExpanded(id: string): boolean {
    return this.expandedOrderIds.has(id);
  }

  getLineTotal(item: OrderItem): number {
    return item.quantity * item.unitPrice;
  }

  downloadProformaInvoice(order: OrderSummary) {
    // TODO: Integrate PI download API here
    // e.g. this.salesService.downloadPi(order.piNumber).subscribe(blob => saveAs(blob, order.piNumber + '.pdf'));
    console.log('Downloading PI:', order.piNumber);
  }

  refreshSales() {
    this.loadDistributors();
  }
}
