import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SalesService, PendingOrder } from '../services/sales.service';

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
  pendingOrders: PendingOrder[] = [];
  isOrdersLoading = false;

  orderFilterTab: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
  orderSearchTerm = '';
  expandedOrderIds = new Set<number>();
  
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
    this.loadPendingOrders();
  }

  loadPendingOrders() {
    this.isOrdersLoading = true;
    this.salesService.getPendingOrderApprovals().subscribe({
      next: (data) => {
        this.pendingOrders = data;
        this.isOrdersLoading = false;
      },
      error: (error) => {
        console.error('Error loading pending orders:', error);
        this.isOrdersLoading = false;
      },
    });
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
  get filteredOrderSummaries(): PendingOrder[] {
    let filtered: PendingOrder[];
    if (this.orderFilterTab === 'all') {
      filtered = this.pendingOrders;
    } else if (this.orderFilterTab === 'pending') {
      filtered = this.pendingOrders.filter(o => o.status === 'ACTIVE');
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

  refreshSales() {
    this.loadDistributors();
    this.loadPendingOrders();
  }
}
