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
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonButtons,
  IonMenuButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonModal,
  IonInput,
  IonRow,
  IonCol,
  IonGrid,
  IonSpinner,
  IonFab,
  IonFabButton,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonBadge
} from '@ionic/angular/standalone';

import { ModalController } from '@ionic/angular';
import { UnitService, Unit } from '../services/unit.service';

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
    IonItem,
    IonIcon,
    IonButton,
    IonButtons,
    IonMenuButton,
    IonModal,
    IonInput,
    IonSpinner,

    IonFab,
    IonFabButton,
    IonSelect,
    IonSelectOption,
    IonBadge
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
  selectedCategory: 'raw_material' | 'finished_product' | null = null;
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
    private unitService: UnitService
  ) {
    this.addForm = this.fb.group({
      category: ['', Validators.required],
      unitType: ['KG', Validators.required],
      subUnit: ['KG'],
      variant: ['', Validators.required],
      size: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      code: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      status: ['ACTIVE', Validators.required]
    });

    this.editForm = this.fb.group({
      category: ['', Validators.required],
      unitType: ['KG', Validators.required],
      subUnit: ['KG'],
      variant: ['', Validators.required],
      size: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      code: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      status: ['ACTIVE', Validators.required]
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
      activeUnits: this.units.filter(u => u.status === 'ACTIVE').length,
      inactiveUnits: this.units.filter(u => u.status === 'INACTIVE').length
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
      const match =
        !q ||
        unit.name.toLowerCase().includes(q) ||
        unit.code.toLowerCase().includes(q) ||
        (unit.description?.toLowerCase().includes(q) ?? false);

      if (this.activeStatusFilter === 'ACTIVE') {
        return match && unit.status === 'ACTIVE';
      }

      if (this.activeStatusFilter === 'INACTIVE') {
        return match && unit.status === 'INACTIVE';
      }

      return match;
    });
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

  onCategoryChange(category: 'raw_material' | 'finished_product') {
    this.selectedCategory = category;
    this.addForm.patchValue({ category });
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
      unitType: 'KG'
    });
  }

  openEditModal(unit: Unit) {
    this.selectedUnit = unit;
    const category = (unit as any).category || 'raw_material';
    const unitType = (unit as any).unitType || 'KG';
    const variant = (unit as any).variant || '';
    
    this.selectedCategory = category;
    this.selectedUnitType = unitType;
    this.selectedVariant = variant;
    
    this.editForm.patchValue({
      category,
      unitType,
      variant,
      name: unit.name,
      code: unit.code,
      description: unit.description || '',
      status: unit.status
    });
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
      unitType: 'KG'
    });
  }

  /* ---------- CREATE UNIT ---------- */
  addUnit() {
    if (this.addForm.invalid) return;

    const payload = this.addForm.value;

    this.unitService.createUnit(payload).subscribe({
      next: (created) => {
        this.units.unshift(created);
        this.resetPagination();
        this.closeAddModal();
        alert('Unit created successfully!');
      },
      error: (err) => {
        console.error(err);
        alert('Failed to create unit.');
      }
    });
  }

  /* ---------- UPDATE UNIT ---------- */
  updateUnit() {
    if (this.editForm.invalid || !this.selectedUnit) return;

    const payload = this.editForm.value;

    this.unitService.updateUnit(this.selectedUnit.id, payload).subscribe({
      next: (updated) => {
        const index = this.units.findIndex(u => u.id === this.selectedUnit!.id);
        if (index !== -1) {
          this.units[index] = updated;
        }
        this.closeEditModal();
        alert('Unit updated successfully!');
      },
      error: (err) => {
        console.error(err);
        alert('Failed to update unit.');
      }
    });
  }

  /* ---------- DELETE UNIT ---------- */
  deleteUnit(id: number) {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    this.unitService.deleteUnit(id).subscribe({
      next: () => {
        this.units = this.units.filter(u => u.id !== id);
        alert('Unit deleted successfully!');
      },
      error: () => alert('Delete failed')
    });
  }

  /* ---------- HELPERS ---------- */
  onSearchChange(event: any) {
    this.searchTerm = event.target.value || '';
    this.resetPagination();
  }

  onStatusFilterChange(status: 'all' | 'ACTIVE' | 'INACTIVE') {
    this.activeStatusFilter = status;
    this.resetPagination();
  }

  refreshUnits() {
    this.loadUnits();
  }

  getStatusBadgeClass(status: string): string {
    return status === 'ACTIVE' ? 'badge-active' : 'badge-inactive';
  }

  Math = Math;
}
