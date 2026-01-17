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
  IonSelectOption
} from '@ionic/angular/standalone';

import { ModalController } from '@ionic/angular';
import { InventoryService, InventoryItem as ApiInventoryItem } from '../services/inventory';

/* ---------- TYPES ---------- */
type ItemStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
type ItemCategory = 'raw_material' | 'finished_product';

interface DisplayInventoryItem extends ApiInventoryItem {
  status: ItemStatus;
  category: ItemCategory;
  lowStock?: boolean;
  imageUrl?: string;
  price?: number;
  description?: string;
  sku?: string;
}

/* ---------- COMPONENT ---------- */
@Component({
  selector: 'app-master-inventory',
  standalone: true,
  templateUrl: './master-inventory.page.html',
  styleUrls: ['./master-inventory.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

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
    IonSpinner,

    // REQUIRED FOR TEMPLATE
    IonGrid,
    IonRow,
    IonCol,
    IonFab,
    IonFabButton,
    IonSelect,
    IonSelectOption
  ]
})
export class MasterInventoryPage implements OnInit {

  /* ---------- UI STATE ---------- */
  activeTab: 'all' | 'raw_material' | 'finished_product' = 'all';
  searchTerm = '';
  isAddModalOpen = false;
  isEditModalOpen = false;
  isLoading = false;
  errorMessage = '';
  selectedItem: DisplayInventoryItem | null = null;
  /* ---------- FORM ---------- */
  addForm: FormGroup;
  editForm: FormGroup;

  previewImage: string | ArrayBuffer | null = null;
  selectedImageFile: File | null = null;

  /* ---------- DATA ---------- */
  inventory: DisplayInventoryItem[] = [];

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private inventoryService: InventoryService
  ) {
    this.addForm = this.fb.group({
      name: ['', Validators.required],
      materialCode: ['', Validators.required],
      unit: ['KG', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      minimumThreshold: [0, [Validators.required, Validators.min(0)]]
    });

    this.editForm = this.fb.group({
      name: ['', Validators.required],
      materialCode: ['', Validators.required],
      unit: ['KG', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      minimumThreshold: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit() {
    this.loadInventory();
  }

  /* ---------- LOAD INVENTORY ---------- */
  loadInventory() {
    this.isLoading = true;
    this.errorMessage = '';

    this.inventoryService.getAllItems().subscribe({
      next: (data) => {
        this.inventory = data.map(item => this.mapToDisplayItem(item));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading inventory:', error);
        this.errorMessage =
          'Failed to load inventory. Please check if the backend is running.';
        this.isLoading = false;
      }
    });
  }

  /* ---------- MAP API ITEM ---------- */
  mapToDisplayItem(item: ApiInventoryItem): DisplayInventoryItem {
    let status: ItemStatus = 'in_stock';

    const isLowStock = (item as any).lowStock === true;
    const minimumThreshold = (item as any).minimumThreshold || 0;

    if (item.quantity === 0) {
      status = 'out_of_stock';
    } else if (isLowStock || item.quantity <= minimumThreshold) {
      status = 'low_stock';
    }

    // ❌ REMOVE hard-coded category
    // const category: ItemCategory = 'raw_material';

    // ✔ USE category from API (set in service)
    const category = (item as any).category as ItemCategory;

    return {
      ...item,
      status,
      category,          // <— correct tag
      lowStock: isLowStock,
      materialCode: (item as any).materialCode,
      minimumThreshold,
      imageUrl: 'https://via.placeholder.com/300x300.png?text=No+Image'
    };
  }


  /* ---------- STATS ---------- */
  get stats() {
    return {
      totalItems: this.inventory.length,
      rawMaterials: this.inventory.filter(i => i.category === 'raw_material').length,
      finishedProducts: this.inventory.filter(i => i.category === 'finished_product').length,
      lowStock: this.inventory.filter(i => i.status === 'low_stock').length,
      outOfStock: this.inventory.filter(i => i.status === 'out_of_stock').length,
      totalValue: this.inventory.reduce(
        (sum, i) => sum + (i.price ?? 0) * i.quantity,
        0
      )
    };
  }

  get statCards() {
    return [
      { label: 'Total Items', value: this.stats.totalItems },
      { label: 'Raw Materials', value: this.stats.rawMaterials },
      { label: 'Finished Products', value: this.stats.finishedProducts },
      { label: 'Total Value', value: '₹' + this.stats.totalValue.toFixed(2) }
    ];
  }

  /* ---------- FILTER ---------- */
  get filteredInventory(): DisplayInventoryItem[] {
    const q = this.searchTerm?.toLowerCase();

    return this.inventory.filter(item => {
      const match =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q);

      if (this.activeTab === 'raw_material') {
        return match && item.category === 'raw_material';
      }

      if (this.activeTab === 'finished_product') {
        return match && item.category === 'finished_product';
      }

      return match;
    });
  }

  /* ---------- BADGE ---------- */
  badgeClass(status: ItemStatus) {
    return {
      'badge-in-stock': status === 'in_stock',
      'badge-low-stock': status === 'low_stock',
      'badge-out-of-stock': status === 'out_of_stock'
    };
  }

  /* ---------- IMAGE ---------- */
  onImageSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.selectedImageFile = file;

    const reader = new FileReader();
    reader.onload = () => (this.previewImage = reader.result);
    reader.readAsDataURL(file);
  }

  /* ---------- MODAL ---------- */
  openAddModal() {
    this.isAddModalOpen = true;
  }

  closeAddModal() {
    this.isAddModalOpen = false;
    this.previewImage = null;
    this.selectedImageFile = null;

    this.addForm.reset({
      unit: 'KG',
      quantity: 0,
      minimumThreshold: 0
    });
  }

  /* ---------- ADD ITEM ---------- */
  addItem() {
    if (this.addForm.invalid) return;

    const payload = this.addForm.value;

    this.inventoryService.createItem(payload).subscribe({
      next: (created) => {
        this.inventory.unshift(this.mapToDisplayItem(created));
        this.closeAddModal();
        alert('Item added successfully!');
      },
      error: (err) => {
        console.error(err);
        alert('Failed to create item.');
      }
    });
  }

  /* ---------- ACTIONS ---------- */
  viewItem(item: DisplayInventoryItem) {
    alert(
      `Name: ${item.name}\nMaterial Code: ${item.materialCode}\nUnit: ${item.unit}\nQuantity: ${item.quantity}\nMin Threshold: ${item.minimumThreshold}`
    );
  }

  editItem(item: DisplayInventoryItem) {
    this.selectedItem = item;
    this.editForm.patchValue({
      name: item.name,
      materialCode: item.materialCode,
      unit: item.unit,
      quantity: item.quantity,
      minimumThreshold: item.minimumThreshold
    });
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selectedItem = null;
    this.editForm.reset({
      unit: 'KG',
      quantity: 0,
      minimumThreshold: 0
    });
  }

  updateItem() {
    if (this.editForm.invalid || !this.selectedItem) return;

    const payload = this.editForm.value;

    this.inventoryService.updateItem(this.selectedItem.id, payload).subscribe({
      next: (updated) => {
        const index = this.inventory.findIndex(i => i.id === this.selectedItem!.id);
        if (index !== -1) {
          this.inventory[index] = this.mapToDisplayItem(updated);
        }
        this.closeEditModal();
        alert('Item updated successfully!');
      },
      error: (err) => {
        console.error(err);
        alert('Failed to update item.');
      }
    });
  }

  deleteItem(id: number, category: ItemCategory) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    this.inventoryService.deleteItem(id, category).subscribe({
      next: () => {
        this.inventory = this.inventory.filter(i => i.id !== id);
        alert('Item deleted successfully!');
      },
      error: () => alert('Delete failed')
    });
  }

  refreshInventory() {
    this.loadInventory();
  }
}