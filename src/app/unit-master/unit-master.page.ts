import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonModal,
  IonIcon,
  IonButton,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonSpinner,
  IonFab,
  IonFabButton
} from '@ionic/angular/standalone';

import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { UnitService, Unit, RawMaterial, FinishedProduct } from '../services/unit.service';

/* ---------- COMPONENT ---------- */
@Component({
  selector: 'app-unit-master',
  standalone: true,
  templateUrl: './unit-master.page.html',
  styleUrls: ['./unit-master.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonModal,
    IonIcon,
    IonButton,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonSpinner,
    IonFab,
    IonFabButton
  ]
})
export class UnitMasterPage implements OnInit {

  /* ---------- UI STATE ---------- */
  searchTerm = '';
  isAddModalOpen = false;
  isEditModalOpen = false;
  isLoading = false;
  errorMessage = '';
  selectedUnit: Unit | null = null;
  currentPage = 1;
  itemsPerPage = 8;
  selectedCategory: 'Raw Material' | 'Finished Product' | null = null;
  selectedUnitType: 'KG' | 'LITER' | 'PIECE' | 'METER' | null = null;
  selectedVariant: string | null = null;

  /* ---------- FORM ---------- */
  addForm: FormGroup;
  editForm: FormGroup;

  /* ---------- DATA ---------- */
  units: Unit[] = [];

  /* ---------- STATUS FILTER ---------- */
  activeStatusFilter: 'all' | 'ACTIVE' | 'INACTIVE' = 'all';

  /* ---------- UNIT VARIANTS ---------- */
  readonly KG_VARIANTS = ['20 kg', '25 kg', '50 kg'];
  readonly LITER_VARIANTS = ['1 liter', '5 liter', '10 liter'];
  readonly PIECE_VARIANTS = ['1 piece', '5 piece', '10 piece'];
  readonly METER_VARIANTS = ['1 meter', '5 meter', '10 meter'];

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private unitService: UnitService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    // Add Form - supports both Raw Material and Finished Product
    this.addForm = this.fb.group({
      category: ['', Validators.required],
      // Raw Material Fields
      unitName: ['', [Validators.required, Validators.minLength(2)]],
      unitCode: [1000],
      unitType: ['KG'],
      productSize: ['small'],
      // Finished Product Fields
      sku: [''],
      price: [0],
      name: [''],
      quantity: [0],
      minimumThreshold: [0],
      // Common Fields
      description: [''],
      status: ['ACTIVE']
    });

    // Edit Form - same structure
    this.editForm = this.fb.group({
      category: ['', Validators.required],
      // Raw Material Fields
      unitName: ['', [Validators.required, Validators.minLength(2)]],
      unitCode: [1000],
      unitType: ['KG'],
      productSize: ['small'],
      // Finished Product Fields
      sku: [''],
      price: [0],
      name: [''],
      quantity: [0],
      minimumThreshold: [0],
      // Common Fields
      description: [''],
      status: ['ACTIVE']
    });
  }

  ngOnInit() {
    this.loadUnits();
  }

  /* ---------- LOAD UNITS ---------- */
  loadUnits() {
    this.isLoading = true;
    this.errorMessage = '';

    this.unitService.getAllUnits().subscribe({
      next: (data) => {
        this.units = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading units:', error);
        this.errorMessage = 'Failed to load units. Please check if the backend is running.';
        this.isLoading = false;
      }
    });
  }

  /* ---------- STATS ---------- */
  get stats() {
    return {
      totalUnits: this.units.length,
      activeUnits: this.units.filter(u => (u as any).status === 'ACTIVE' || u.active === true).length,
      inactiveUnits: this.units.filter(u => (u as any).status === 'INACTIVE' || u.active === false).length
    };
  }

  get statCards() {
    return [
      { label: 'Total Units', value: this.stats.totalUnits, icon: 'cube-outline', color: 'emerald' },
      { label: 'Active', value: this.stats.activeUnits, icon: 'checkmark-circle-outline', color: 'green' },
      { label: 'Inactive', value: this.stats.inactiveUnits, icon: 'close-circle-outline', color: 'slate' }
    ];
  }

  /* ---------- PAGINATION ---------- */
  get paginatedUnits(): Unit[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredUnits.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUnits.length / this.itemsPerPage);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get showPagination(): boolean {
    return this.filteredUnits.length > this.itemsPerPage;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  resetPagination() {
    this.currentPage = 1;
  }

  /* ---------- FILTER ---------- */
  get filteredUnits(): Unit[] {
    const q = this.searchTerm?.toLowerCase();

    return this.units.filter(unit => {
      // Build searchable text based on category
      const searchText = [
        unit.name,
        unit.category,
        unit.description || '',
        unit.category === 'Raw Material' ? (unit as any).unitName || '' : '',
        unit.category === 'Raw Material' ? (unit as any).unitCode?.toString() || '' : '',
        unit.category === 'Finished Product' ? (unit as any).sku || '' : ''
      ].join(' ').toLowerCase();

      const match = !q || searchText.includes(q);

      if (this.activeStatusFilter === 'ACTIVE') {
        return match && ((unit as any).status === 'ACTIVE' || unit.active === true);
      }

      if (this.activeStatusFilter === 'INACTIVE') {
        return match && ((unit as any).status === 'INACTIVE' || unit.active === false);
      }

      return match;
    });
  }

  // Helper method to check if a unit is raw material
  isRawMaterial(unit: Unit): boolean {
    return this.unitService.isRawMaterial(unit as any);
  }

  // Helper method to check if a unit is finished product
  isFinishedProduct(unit: Unit): boolean {
    return this.unitService.isFinishedProduct(unit as any);
  }

  get getVariantOptions(): string[] {
    switch (this.selectedUnitType) {
      case 'KG':
        return this.KG_VARIANTS;
      case 'LITER':
        return this.LITER_VARIANTS;
      case 'PIECE':
        return this.PIECE_VARIANTS;
      case 'METER':
        return this.METER_VARIANTS;
      default:
        return [];
    }
  }

  onCategoryChange(category: 'Raw Material' | 'Finished Product') {
    this.selectedCategory = category;
    this.addForm.patchValue({ category });
    this.editForm.patchValue({ category });
    // Reset category-specific fields
    if (category === 'Raw Material') {
      this.addForm.patchValue({ sku: '', price: 0, name: '', quantity: 0, minimumThreshold: 0 });
    } else {
      this.addForm.patchValue({ unitName: '', unitCode: 1000, unitType: 'KG', productSize: 'small' });
    }
  }

  /* ---------- SUB-UNIT OPTIONS ---------- */
  subUnitOptionsMap: { [key: string]: { value: string; label: string }[] } = {
    'KG': [
      { value: 'KG', label: 'Kilogram (KG)' },
      { value: 'GRAM', label: 'Gram' },
      { value: 'MILLIGRAM', label: 'Milligram' }
    ],
    'LITER': [
      { value: 'LITER', label: 'Liter' },
      { value: 'MILLILITER', label: 'Milliliter' }
    ]
  };

  getSubUnits(unitType: string): { value: string; label: string }[] {
    return this.subUnitOptionsMap[unitType] || [];
  }

  hasSubUnits(unitType: string): boolean {
    return !!this.subUnitOptionsMap[unitType];
  }

  onUnitTypeChange(unitType: 'KG' | 'LITER' | 'PIECE' | 'METER') {
    this.selectedUnitType = unitType;
    this.selectedVariant = null;
    const subUnits = this.getSubUnits(unitType);
    const defaultSubUnit = subUnits.length > 0 ? subUnits[0].value : '';
    this.addForm.patchValue({ unitType, variant: '', subUnit: defaultSubUnit });
    this.editForm.patchValue({ unitType, subUnit: defaultSubUnit });
  }

  onVariantChange(variant: string) {
    this.selectedVariant = variant;
    this.addForm.patchValue({ variant });
  }

  /* ---------- MODAL ---------- */
  openAddModal() {
    this.isAddModalOpen = true;
  }

  closeAddModal() {
    this.isAddModalOpen = false;
    this.selectedCategory = null;
    this.selectedUnitType = null;
    this.selectedVariant = null;
    this.addForm.reset({
      status: 'ACTIVE',
      unitType: 'KG',
      productSize: 'small',
      unitCode: 1000
    });
  }

  openEditModal(unit: Unit) {
    this.selectedUnit = unit;
    this.selectedCategory = unit.category as 'Raw Material' | 'Finished Product';
    
    if (unit.category === 'Raw Material') {
      const rawMat = unit as any;
      this.editForm.patchValue({
        category: 'Raw Material',
        unitName: rawMat.unitName || rawMat.name || '',
        unitCode: rawMat.unitCode || 1000,
        unitType: rawMat.unitType || rawMat.unit || 'KG',
        productSize: rawMat.productSize || 'small',
        description: unit.description || '',
        status: rawMat.status || (unit.active ? 'ACTIVE' : 'INACTIVE')
      });
    } else {
      const product = unit as any;
      this.editForm.patchValue({
        category: 'Finished Product',
        name: unit.name,
        sku: product.sku,
        price: product.price,
        quantity: unit.quantity,
        minimumThreshold: product.minimumThreshold,
        description: unit.description || '',
        status: product.status || (unit.active ? 'ACTIVE' : 'INACTIVE')
      });
    }
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selectedUnit = null;
    this.selectedCategory = null;
    this.selectedUnitType = null;
    this.selectedVariant = null;
    this.editForm.reset({
      status: 'ACTIVE',
      unitType: 'KG',
      productSize: 'small',
      unitCode: 1000
    });
  }

  /* ---------- CREATE UNIT ---------- */
  addUnit() {
    if (this.addForm.invalid) {
      this.showToast('Please fill all required fields', 'danger');
      return;
    }

    const formValue = this.addForm.value;
    let payload: any;

    // Create payload based on category
    if (formValue.category === 'Raw Material') {
      payload = {
        category: 'Raw Material',
        unitName: formValue.unitName,
        unitCode: formValue.unitCode || 1000,
        unitType: formValue.unitType || 'KG',
        productSize: formValue.productSize || 'small',
        description: formValue.description || '',
        status: formValue.status || 'ACTIVE'
      };
    } else if (formValue.category === 'Finished Product') {
      payload = {
        category: 'Finished Product',
        name: formValue.name,
        sku: formValue.sku,
        price: formValue.price || 0,
        quantity: formValue.quantity || 0,
        description: formValue.description || '',
        minimumThreshold: formValue.minimumThreshold || 0,
        status: formValue.status || 'ACTIVE'
      };
    }

    console.log('Creating unit with payload:', payload);

    this.unitService.createUnit(payload).subscribe({
      next: (response: any) => {
        console.log('Unit created successfully:', response);
        const newUnit = response.data || response;
        this.units.unshift(newUnit);
        this.resetPagination();
        this.closeAddModal();
        this.showSuccessAlert('Unit is created successfully!', 'Unit Created');
      },
      error: (err) => {
        console.error('Failed to create unit:', err);
        const errorMsg = err.error?.message || err.message || 'Failed to create unit';
        this.showToast(errorMsg, 'danger');
      }
    });
  }

  /* ---------- UPDATE UNIT ---------- */
  updateUnit() {
    if (this.editForm.invalid || !this.selectedUnit) return;

    const formValue = this.editForm.value;
    let payload: any;

    // Create payload based on category
    if (formValue.category === 'Raw Material') {
      payload = {
        category: 'Raw Material',
        unitName: formValue.unitName,
        unitCode: formValue.unitCode || 1000,
        unitType: formValue.unitType || 'KG',
        productSize: formValue.productSize || 'small',
        description: formValue.description || '',
        status: formValue.status || 'ACTIVE'
      };
    } else if (formValue.category === 'Finished Product') {
      payload = {
        category: 'Finished Product',
        name: formValue.name,
        sku: formValue.sku,
        price: formValue.price || 0,
        quantity: formValue.quantity || 0,
        description: formValue.description || '',
        minimumThreshold: formValue.minimumThreshold || 0,
        status: formValue.status || 'ACTIVE'
      };
    }

    this.unitService.updateUnit(this.selectedUnit.id, payload).subscribe({
      next: (updated) => {
        const index = this.units.findIndex(u => u.id === this.selectedUnit!.id);
        if (index !== -1) {
          this.units[index] = updated;
        }
        this.closeEditModal();
        this.showSuccessAlert('Unit updated successfully!', 'Unit Updated');
      },
      error: (err) => {
        console.error(err);
        const errorMsg = err.error?.message || err.message || 'Failed to update unit';
        this.showToast(errorMsg, 'danger');
      }
    });
  }

  /* ---------- DELETE UNIT ---------- */
  deleteUnit(id: number) {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    this.unitService.deleteUnit(id).subscribe({
      next: () => {
        this.units = this.units.filter(u => u.id !== id);
        this.showSuccessAlert('Unit deleted successfully!', 'Unit Deleted');
        this.resetPagination();
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.message || 'Failed to delete unit';
        this.showToast(errorMsg, 'danger');
      }
    });
  }

  /* ---------- HELPERS ---------- */
  onSearchChange(event: any) {
    this.searchTerm = event.target.value || '';
    this.resetPagination();
  }

  onStatusFilterChange(status: 'all' | 'ACTIVE' | 'INACTIVE') {
    this.activeStatusFilter = status as 'all' | 'ACTIVE' | 'INACTIVE';
    this.resetPagination();
  }

  refreshUnits() {
    this.loadUnits();
  }

  getStatusBadgeClass(status: string): string {
    return status === 'ACTIVE' ? 'badge-active' : 'badge-inactive';
  }

  /* ---------- NOTIFICATION METHODS ---------- */

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color
    });
    await toast.present();
  }

  async showSuccessAlert(message: string, title: string = 'Success') {
    const alert = await this.alertCtrl.create({
      header: title,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  Math = Math;
}
