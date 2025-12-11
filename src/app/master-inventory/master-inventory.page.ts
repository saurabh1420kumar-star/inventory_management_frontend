import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// Import from @ionic/angular/standalone instead of @ionic/angular
import { IonHeader } from '@ionic/angular/standalone';
import { IonToolbar } from '@ionic/angular/standalone';
import { IonTitle } from '@ionic/angular/standalone';
import { IonContent } from '@ionic/angular/standalone';
import { IonSplitPane } from '@ionic/angular/standalone';
import { IonMenu } from '@ionic/angular/standalone';
import { IonList } from '@ionic/angular/standalone';
import { IonItem } from '@ionic/angular/standalone';
import { IonLabel } from '@ionic/angular/standalone';
import { IonIcon } from '@ionic/angular/standalone';
import { IonButton } from '@ionic/angular/standalone';
import { IonButtons } from '@ionic/angular/standalone';
import { IonMenuButton } from '@ionic/angular/standalone';
import { IonCard } from '@ionic/angular/standalone';
import { IonCardContent } from '@ionic/angular/standalone';
import { IonSearchbar } from '@ionic/angular/standalone';
import { IonSegment } from '@ionic/angular/standalone';
import { IonSegmentButton } from '@ionic/angular/standalone';
import { IonModal } from '@ionic/angular/standalone';
import { IonSelect } from '@ionic/angular/standalone';
import { IonSelectOption } from '@ionic/angular/standalone';
import { IonInput } from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';

type ItemType = 'raw_material' | 'finished_product';
type ItemStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier?: string;
  reorderLevel: number;
  status: ItemStatus;
  lastUpdated: string;
  materialGrade?: string;
  batchNumber?: string;
  expiryDate?: string;
  sku?: string;
  productionDate?: string;
  warrantyPeriod?: string;
}

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
    IonSplitPane,
    IonMenu,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonButton,
    IonButtons,
    IonMenuButton,
    IonCard,
    IonCardContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonInput
  ]
})
export class MasterInventoryPage {

  sidebarCollapsed = false;
  activeTab: 'all' | 'raw_materials' | 'finished_products' = 'all';
  searchTerm = '';
  isAddModalOpen = false;

  addForm: FormGroup;

  inventory: InventoryItem[] = [
    {
      id: 'RM001',
      name: 'Steel Sheets',
      type: 'raw_material',
      category: 'Metals',
      quantity: 500,
      unit: 'kg',
      unitPrice: 45,
      reorderLevel: 100,
      status: 'in_stock',
      lastUpdated: '2025-12-01'
    },
    {
      id: 'FP001',
      name: 'Finished Chair',
      type: 'finished_product',
      category: 'Furniture',
      quantity: 100,
      unit: 'pcs',
      unitPrice: 150,
      reorderLevel: 20,
      status: 'in_stock',
      lastUpdated: '2025-12-05'
    },
    {
      id: 'RM002',
      name: 'Wood Planks',
      type: 'raw_material',
      category: 'Wood',
      quantity: 20,
      unit: 'pcs',
      unitPrice: 35,
      reorderLevel: 50,
      status: 'low_stock',
      lastUpdated: '2025-12-10'
    },
    {
      id: 'FP002',
      name: 'Table Lamp',
      type: 'finished_product',
      category: 'Lighting',
      quantity: 0,
      unit: 'pcs',
      unitPrice: 85,
      reorderLevel: 10,
      status: 'out_of_stock',
      lastUpdated: '2025-12-09'
    }
  ];

  constructor(private fb: FormBuilder, private modalCtrl: ModalController) {
    this.addForm = this.fb.group({
      type: ['raw_material', Validators.required],
      name: ['', Validators.required],
      category: ['', Validators.required],
      quantity: [0, Validators.required],
      unit: ['units', Validators.required],
      unitPrice: [0, Validators.required],
      supplier: [''],
      reorderLevel: [50]
    });
  }

  /** ---------- GETTERS ---------- */

  get filteredInventory(): InventoryItem[] {
    const q = this.searchTerm?.toLowerCase();

    return this.inventory.filter(i => {
      const match =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q);

      if (this.activeTab === 'raw_materials') return match && i.type === 'raw_material';
      if (this.activeTab === 'finished_products') return match && i.type === 'finished_product';
      return match;
    });
  }

  get stats() {
    return {
      totalItems: this.inventory.length,
      rawMaterials: this.inventory.filter(i => i.type === 'raw_material').length,
      finishedProducts: this.inventory.filter(i => i.type === 'finished_product').length,
      lowStock: this.inventory.filter(i => i.status === 'low_stock').length,
      outOfStock: this.inventory.filter(i => i.status === 'out_of_stock').length,
      totalValue: this.inventory.reduce((t, x) => t + x.quantity * x.unitPrice, 0)
    };
  }

  badgeClass(status: ItemStatus) {
    return {
      'badge-in-stock': status === 'in_stock',
      'badge-low-stock': status === 'low_stock',
      'badge-out-of-stock': status === 'out_of_stock'
    };
  }

  /** --------- ACTIONS --------- */

  viewItem(item: InventoryItem) {
    console.log('View item', item);
    // Add your view logic here
  }

  editItem(item: InventoryItem) {
    console.log('Edit item', item);
    // Add your edit logic here
  }

  deleteItem(id: string) {
    this.inventory = this.inventory.filter(i => i.id !== id);
  }

  /** --------- MODAL ACTIONS --------- */

  openAddModal() {
    this.isAddModalOpen = true;
  }

  closeAddModal() {
    this.isAddModalOpen = false;
    this.addForm.reset({
      type: 'raw_material',
      reorderLevel: 50,
      unit: 'units'
    });
  }

  addItem() {
    if (this.addForm.invalid) return;

    const v = this.addForm.value;
    const idPrefix = v.type === 'raw_material' ? 'RM' : 'FP';
    const existingIds = this.inventory.map(i => i.id);
    const maxNum = Math.max(...existingIds.map(id => {
      const num = parseInt(id.replace(/^\D+/g, ''));
      return isNaN(num) ? 0 : num;
    }));
    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    const id = idPrefix + nextNum;

    // Determine status based on quantity
    let status: ItemStatus = 'in_stock';
    if (v.quantity === 0) {
      status = 'out_of_stock';
    } else if (v.quantity <= v.reorderLevel) {
      status = 'low_stock';
    }

    const item: InventoryItem = {
      id,
      name: v.name,
      type: v.type,
      category: v.category,
      quantity: v.quantity,
      unit: v.unit,
      unitPrice: v.unitPrice,
      supplier: v.supplier || undefined,
      reorderLevel: v.reorderLevel,
      status: status,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    this.inventory.unshift(item);
    this.closeAddModal();
  }
}