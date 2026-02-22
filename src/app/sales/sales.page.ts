import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../services/sales.service';

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
  errorMessage = '';
  searchTerm = '';
  
  isAddModalOpen = false;
  isEditModalOpen = false;
  selectedDistributor: Distributor | null = null;
  
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
    this.isLoading = true;
    this.errorMessage = '';
    
    this.salesService.getAllDistributors().subscribe({
      next: (data) => {
        this.distributors = data;
        this.updateStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading distributors:', error);
        this.errorMessage = 'Failed to load distributors. Please try again.';
        this.isLoading = false;
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

    this.isLoading = true;
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
        this.isLoading = false;
      },
    });
  }

  updateDistributor() {
    if (!this.selectedDistributor || this.editForm.invalid) return;

    this.isLoading = true;
    const formData = this.editForm.value;

    this.salesService.updateDistributor(this.selectedDistributor.id, formData).subscribe({
      next: () => {
        this.loadDistributors();
        this.closeEditModal();
      },
      error: (error) => {
        console.error('Error updating distributor:', error);
        this.errorMessage = 'Failed to update distributor. Please try again.';
        this.isLoading = false;
      },
    });
  }

  deleteDistributor(id: string) {
    if (confirm('Are you sure you want to delete this distributor?')) {
      this.isLoading = true;
      this.salesService.deleteDistributor(id).subscribe({
        next: () => {
          this.loadDistributors();
        },
        error: (error) => {
          console.error('Error deleting distributor:', error);
          this.errorMessage = 'Failed to delete distributor. Please try again.';
          this.isLoading = false;
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

  refreshSales() {
    this.loadDistributors();
  }
}
