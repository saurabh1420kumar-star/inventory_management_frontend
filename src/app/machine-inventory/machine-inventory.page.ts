import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonModal,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner
} from '@ionic/angular/standalone';

import { InventoryService, InventoryItem } from '../services/inventory';

@Component({
  selector: 'app-machine-inventory',
  standalone: true,
  templateUrl: './machine-inventory.page.html',
  styleUrls: ['./machine-inventory.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonMenuButton, IonButton, IonIcon,
    IonFab, IonFabButton, IonModal, IonInput,
    IonItem, IonLabel, IonSelect, IonSelectOption,
    IonSpinner
  ],
})
export class MachineInventoryPage implements OnInit {

  searchTerm = '';
  activeFilter = 'all';

  isAddModalOpen = false;
  isEditModalOpen = false;
  addForm!: FormGroup;
  editForm!: FormGroup;
  selectedPartId: number | null = null;

  filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'TOOL', label: 'Tools' },
    { key: 'SPARE_PART', label: 'Spare Parts' },
    { key: 'MACHINE', label: 'Machines' }
  ];

  machineParts: InventoryItem[] = [];
  filteredMachines: InventoryItem[] = [];

  constructor(private inventoryService: InventoryService, private fb: FormBuilder) {}

  ngOnInit() {
    this.loadMachines();
    this.createForm();
    this.createEditForm();
  }

  loadMachines() {
    this.inventoryService.getMachineParts().subscribe({
      next: (parts) => {
        this.machineParts = parts;
        this.applyFilters();
      },
      error: () => alert('Unable to fetch machine parts.')
    });
  }

  refreshMachines() {
    this.loadMachines();
  }

  applyFilters() {
    const q = this.searchTerm.toLowerCase();

    this.filteredMachines = this.machineParts.filter(m => {
      const s =
        m.name.toLowerCase().includes(q) ||
        m.partNumber?.toLowerCase().includes(q);

      const c =
        this.activeFilter === 'all' ||
        m.category === this.activeFilter;

      return s && c;
    });
  }

  get statCards() {
    return [
      { label: 'Total', value: this.machineParts.length, icon: 'server-outline' },
      { label: 'Tools', value: this.machineParts.filter(i => i.category === 'TOOL').length, icon: 'construct-outline' },
      { label: 'Spare Parts', value: this.machineParts.filter(i => i.category === 'SPARE_PART').length, icon: 'cog-outline' },
      { label: 'Machines', value: this.machineParts.filter(i => i.category === 'MACHINE').length, icon: 'build-outline' }
    ];
  }

  /** ---------- ADD PART MODAL ---------- */
  createForm() {
    this.addForm = this.fb.group({
      name: ['', Validators.required],
      partNumber: ['', Validators.required],
      vendor: ['', Validators.required],
      purchaseDate: ['', Validators.required],
      warrantyExpiryDate: ['', Validators.required],
      quantity: [0, Validators.required],
      condition: ['NEW', Validators.required],
      category: ['MACHINE', Validators.required]
    });
  }

  openAddModal() {
    this.isAddModalOpen = true;
  }

  closeAddModal() {
    this.isAddModalOpen = false;
  }

  addMachinePart() {
    const data = this.addForm.value;
    console.log('Creating:', data);

    this.inventoryService.createItem(data).subscribe({
      next: () => {
        this.closeAddModal();
        this.loadMachines();
        this.addForm.reset({
          category: 'MACHINE',
          condition: 'NEW',
          quantity: 0
        });
        alert('Machine part added successfully!');
      },
      error: (err) => {
        console.error(err);
        alert('Unable to add part');
      }
    });
  }

  /** ---------- EDIT PART MODAL ---------- */
  createEditForm() {
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      partNumber: ['', Validators.required],
      vendor: ['', Validators.required],
      purchaseDate: ['', Validators.required],
      warrantyExpiryDate: ['', Validators.required],
      quantity: [0, Validators.required],
      condition: ['NEW', Validators.required],
      category: ['MACHINE', Validators.required]
    });
  }

  editPart(part: InventoryItem) {
    this.selectedPartId = part.id;
    this.editForm.patchValue({
      name: part.name,
      partNumber: part.partNumber,
      vendor: part.vendor,
      purchaseDate: part.purchaseDate,
      warrantyExpiryDate: part.warrantyExpiryDate,
      quantity: part.quantity,
      condition: part.condition || 'NEW',
      category: part.category || 'MACHINE'
    });
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selectedPartId = null;
  }

  updateMachinePart() {
    if (!this.selectedPartId) return;

    const data = this.editForm.value;
    console.log('Updating:', data);

    this.inventoryService.updateItem(this.selectedPartId, data).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadMachines();
        alert('Machine part updated successfully!');
      },
      error: (err) => {
        console.error(err);
        alert('Unable to update part');
      }
    });
  }

  /** ---------- DELETE PART ---------- */
  deletePart(part: InventoryItem) {
    const confirmed = confirm(`Are you sure you want to delete "${part.name}"?`);
    if (!confirmed) return;

    this.inventoryService.deleteItem(part.id, part.category).subscribe({
      next: () => {
        this.loadMachines();
        alert('Machine part deleted successfully!');
      },
      error: (err) => {
        console.error(err);
        alert('Unable to delete part');
      }
    });
  }
}