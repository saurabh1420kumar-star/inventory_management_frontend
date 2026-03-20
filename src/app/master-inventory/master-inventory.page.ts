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
import {
  InventoryService,
  InventoryItem as ApiInventoryItem,
  BillOfMaterial,
  BOMComponent,
  AdditionalCost
} from '../services/inventory';

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
    IonItem,
    IonIcon,
    IonButton,
    IonButtons,
    IonMenuButton,
    IonModal,
    IonInput,
    IonSpinner,

    // REQUIRED FOR TEMPLATE
    IonFab,
    IonFabButton,
    IonSelect,
    IonSelectOption
  ]
})
export class MasterInventoryPage implements OnInit {

  /* ---------- UI STATE ---------- */
  activeTab: 'all' | 'raw_material' | 'finished_product' | 'bom' = 'all';
  searchTerm = '';
  isAddModalOpen = false;
  isEditModalOpen = false;
  isLoading = false;
  errorMessage = '';
  selectedItem: DisplayInventoryItem | null = null;
  currentPage = 1;
  itemsPerPage = 6;
  selectedCategory: 'raw_material' | 'finished_product' | null = null;
  rawMaterials: DisplayInventoryItem[] = [];
  finishedProducts: DisplayInventoryItem[] = [];

  /* ---------- BOM STATE ---------- */
  bomList: BillOfMaterial[] = [];
  isBomModalOpen = false;
  isBomViewOpen = false;
  selectedBom: BillOfMaterial | null = null;
  bomOutputQty = 1;
  bomSearchTerm = '';
  bomSelectedProductId: number | null = null;
  bomComponents: BOMComponent[] = [];
  bomAdditionalCosts: AdditionalCost[] = [];
  bomForm = {
    bomName: '',
    finishedProductId: null as number | null,
    outputQuantity: 1,
    outputUnit: 'BAG',
    costAllocationPercent: 100
  };
  isBomLoading = false;
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
      category: ['', Validators.required],
      name: ['', Validators.required],
      // raw material only
      materialCode: [''],
      subUnit: ['KG'],
      vendorId: [''],
      vendorName: [''],
      transportName: [''],
      driverName: [''],
      driverMobile: [''],
      // finished product only
      sku: [''],
      description: [''],
      price: [0, [Validators.min(0)]],
      weight: [0, [Validators.min(0)]],
      // common
      unit: ['KG', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      minimumThreshold: [0, [Validators.required, Validators.min(0)]]
    });

    this.editForm = this.fb.group({
      name: ['', Validators.required],
      materialCode: ['', Validators.required],
      unit: ['KG', Validators.required],
      subUnit: ['KG'],
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

  /* ---------- GET INDUSTRY-STANDARD IMAGE FOR ITEM ---------- */
  getImageUrlForItem(itemName: string, category: ItemCategory): string {
    const name = itemName.toLowerCase().trim();
    
    // Raw Materials - Diverse Industrial/Manufacturing images
    const rawMaterials: { [key: string]: string } = {
      'steel': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
      'rod': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
      'metal': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=400&h=400&fit=crop',
      'aluminum': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=400&h=400&fit=crop',
      'copper': 'https://images.unsplash.com/photo-1581092162562-40ff08a55b84?w=400&h=400&fit=crop',
      'plastic': 'https://images.unsplash.com/photo-1578926314433-beab894d83da?w=400&h=400&fit=crop',
      'plastic pellets': 'https://images.unsplash.com/photo-1578926314433-beab894d83da?w=400&h=400&fit=crop',
      'resin': 'https://images.unsplash.com/photo-1578926314433-beab894d83da?w=400&h=400&fit=crop',
      'fabric': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop',
      'rubber': 'https://images.unsplash.com/photo-1578926314433-beab894d83da?w=400&h=400&fit=crop',
      'glass': 'https://images.unsplash.com/photo-1551878745-acf28c019540?w=400&h=400&fit=crop',
      'cement': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=400&fit=crop',
      'wood': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
      'leather': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
      'paint': 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=400&h=400&fit=crop',
      'chemical': 'https://images.unsplash.com/photo-1576091160550-112173faf976?w=400&h=400&fit=crop',
      'yarn': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop',
      'wire': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
    };

    // Finished Products - Diverse Consumer/Industrial products
    const finishedProducts: { [key: string]: string } = {
      'machine': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=400&fit=crop',
      'pump': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=400&fit=crop',
      'motor': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=400&fit=crop',
      'gear': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
      'bearing': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
      'valve': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=400&fit=crop',
      'pipe': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=400&fit=crop',
      'fitting': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
      'fastener': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
      'bolt': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
      'screw': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
      'electronic': 'https://images.unsplash.com/photo-1518664006714-d8ca9d53ee8d?w=400&h=400&fit=crop',
      'sensor': 'https://images.unsplash.com/photo-1518664006714-d8ca9d53ee8d?w=400&h=400&fit=crop',
      'controller': 'https://images.unsplash.com/photo-1518664006714-d8ca9d53ee8d?w=400&h=400&fit=crop',
      'switch': 'https://images.unsplash.com/photo-1518664006714-d8ca9d53ee8d?w=400&h=400&fit=crop',
      'component': 'https://images.unsplash.com/photo-1518664006714-d8ca9d53ee8d?w=400&h=400&fit=crop',
      'assembly': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=400&fit=crop',
      'circuit': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
      'board': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
      'tool': 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=400&h=400&fit=crop',
      'part': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
    };

    const imageMap = category === 'raw_material' ? rawMaterials : finishedProducts;
    
    // Check for exact or partial matches
    for (const [key, url] of Object.entries(imageMap)) {
      if (name.includes(key)) {
        return url;
      }
    }

    // Default images based on category
    return category === 'raw_material'
      ? 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=400&h=400&fit=crop'
      : 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=400&fit=crop';
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
      imageUrl: this.getImageUrlForItem(item.name, category)
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

  /* ---------- PAGINATION ---------- */
  get paginatedInventory(): DisplayInventoryItem[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredInventory.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredInventory.length / this.itemsPerPage);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get showPagination(): boolean {
    return this.filteredInventory.length > this.itemsPerPage;
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

  onCategoryChange(category: 'raw_material' | 'finished_product') {
    this.selectedCategory = category;
    this.addForm.patchValue({ category });

    // Apply dynamic validators based on category
    const materialCodeCtrl = this.addForm.get('materialCode')!;
    const skuCtrl = this.addForm.get('sku')!;

    if (category === 'raw_material') {
      materialCodeCtrl.setValidators([Validators.required]);
      skuCtrl.clearValidators();
    } else {
      skuCtrl.setValidators([Validators.required]);
      materialCodeCtrl.clearValidators();
      materialCodeCtrl.setValue('');
    }
    materialCodeCtrl.updateValueAndValidity();
    skuCtrl.updateValueAndValidity();
  }

  closeAddModal() {
    this.isAddModalOpen = false;
    this.previewImage = null;
    this.selectedImageFile = null;
    this.selectedCategory = null;

    // Reset validators so form is clean for re-open
    this.addForm.get('materialCode')!.clearValidators();
    this.addForm.get('materialCode')!.updateValueAndValidity();
    this.addForm.get('sku')!.clearValidators();
    this.addForm.get('sku')!.updateValueAndValidity();

    this.addForm.reset({
      unit: 'KG',
      subUnit: 'KG',
      quantity: 0,
      minimumThreshold: 0,
      price: 0,
      weight: 0,
      sku: '',
      description: '',
      vendorId: '',
      vendorName: '',
      transportName: '',
      driverName: '',
      driverMobile: ''
    });
  }

  /* ---------- ADD ITEM ---------- */
  addItem() {
    if (this.addForm.invalid || !this.selectedCategory) return;

    const formVal = this.addForm.value;

    // Build a clean payload: only send fields the target endpoint accepts.
    let payload: Record<string, any>;
    if (this.selectedCategory === 'raw_material') {
      payload = {
        category: 'raw_material',
        name: formVal.name,
        materialCode: formVal.materialCode,
        unit: formVal.unit,
        subUnit: formVal.subUnit || undefined,
        quantity: formVal.quantity,
        minimumThreshold: formVal.minimumThreshold,
        vendorId: formVal.vendorId || undefined,
        vendorName: formVal.vendorName || undefined,
        transportName: formVal.transportName || undefined,
        driverName: formVal.driverName || undefined,
        driverMobile: formVal.driverMobile || undefined
      };
    } else {
      // finished product schema: { name, description, sku, price, quantity, minimumThreshold }
      payload = {
        category: 'finished_product',
        name: formVal.name,
        description: formVal.description || '',
        sku: formVal.sku,
        price: formVal.price ?? 0,
        weight: formVal.weight ?? 0,
        quantity: formVal.quantity,
        minimumThreshold: formVal.minimumThreshold
      };
    }

    this.inventoryService.createItem(payload).subscribe({
      next: (created) => {
        this.inventory.unshift(this.mapToDisplayItem(created));
        this.resetPagination();
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
      subUnit: 'KG',
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

  getSubUnits(unit: string): { value: string; label: string }[] {
    return this.subUnitOptionsMap[unit] || [];
  }

  hasSubUnits(unit: string): boolean {
    return !!this.subUnitOptionsMap[unit];
  }

  onUnitChange(unit: string, form: FormGroup) {
    const subUnits = this.getSubUnits(unit);
    if (subUnits.length > 0) {
      form.patchValue({ subUnit: subUnits[0].value });
    } else {
      form.patchValue({ subUnit: '' });
    }
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value || '';
    this.resetPagination();
  }

  onActiveTabChange(tab: 'all' | 'raw_material' | 'finished_product' | 'bom') {
    this.activeTab = tab;
    this.resetPagination();
    if (tab === 'bom') {
      this.loadBOMs();
    }
  }

  refreshInventory() {
    this.loadInventory();
  }

  /* ============================================ */
  /*        BILL OF MATERIALS (BOM) METHODS       */
  /* ============================================ */

  loadBOMs() {
    this.isBomLoading = true;
    this.inventoryService.getBOMs().subscribe({
      next: (boms) => {
        this.bomList = boms && boms.length > 0 ? boms : this.getDummyBOMs();
        this.isBomLoading = false;
      },
      error: () => {
        this.bomList = this.getDummyBOMs();
        this.isBomLoading = false;
      }
    });
  }

  private getDummyBOMs(): BillOfMaterial[] {
    const now = new Date().toISOString();
    return [
      {
        id: 1,
        finishedProductId: 101,
        finishedProductName: 'Manka Mash 20 Kg',
        bomName: 'MANKA MASH 20 KG',
        outputQuantity: 20,
        outputUnit: 'BAG',
        costAllocationPercent: 100,
        components: [
          { rawMaterialId: 1, rawMaterialName: 'DORB',       quantity: 111.40, unit: 'KG', rate: 14.06, amount: 1566.28 },
          { rawMaterialId: 2, rawMaterialName: 'YELLOW MAZE',quantity: 125.40, unit: 'KG', rate: 18.76, amount: 2352.50 },
          { rawMaterialId: 3, rawMaterialName: 'KORMA',       quantity:   2.80, unit: 'KG', rate: 48.65, amount:  136.22 },
          { rawMaterialId: 4, rawMaterialName: 'DDGS',        quantity: 139.20, unit: 'KG', rate: 16.53, amount: 2300.98 },
          { rawMaterialId: 5, rawMaterialName: 'SALT',        quantity:   5.60, unit: 'KG', rate:  4.00, amount:   22.40 },
          { rawMaterialId: 6, rawMaterialName: 'UREA',        quantity:   1.60, unit: 'KG', rate:  4.51, amount:    7.22 },
          { rawMaterialId: 7, rawMaterialName: 'RAAB',        quantity:  14.00, unit: 'KG', rate: 21.77, amount:  304.78 },
          { rawMaterialId: 8, rawMaterialName: 'BOPP BAG',    quantity:   1.60, unit: 'KG', rate: 172.19, amount: 275.50 },
        ],
        additionalCosts: [],
        totalComponentCost: 6965.88,
        totalAdditionalCost: 0,
        effectiveCost: 6965.88,
        effectiveRatePerUnit: 348.29,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        finishedProductId: 102,
        finishedProductName: 'Poultry Feed Premium 50 KG',
        bomName: 'POULTRY FEED 50 KG',
        outputQuantity: 50,
        outputUnit: 'BAG',
        costAllocationPercent: 100,
        components: [
          { rawMaterialId: 2, rawMaterialName: 'YELLOW MAZE', quantity: 340.00, unit: 'KG', rate: 18.76, amount: 6378.40 },
          { rawMaterialId: 1, rawMaterialName: 'DORB',        quantity: 120.00, unit: 'KG', rate: 14.06, amount: 1687.20 },
          { rawMaterialId: 9, rawMaterialName: 'SOYBEAN MEAL',quantity:  80.00, unit: 'KG', rate: 42.50, amount: 3400.00 },
          { rawMaterialId: 4, rawMaterialName: 'DDGS',        quantity:  60.00, unit: 'KG', rate: 16.53, amount:  991.80 },
          { rawMaterialId: 10,rawMaterialName: 'LIMESTONE',   quantity:  18.00, unit: 'KG', rate:  5.20, amount:   93.60 },
          { rawMaterialId: 5, rawMaterialName: 'SALT',        quantity:   8.00, unit: 'KG', rate:  4.00, amount:   32.00 },
          { rawMaterialId: 11,rawMaterialName: 'VITAMIN MIX', quantity:   2.00, unit: 'KG', rate: 310.00, amount: 620.00 },
          { rawMaterialId: 8, rawMaterialName: 'BOPP BAG',    quantity:   2.00, unit: 'KG', rate: 172.19, amount: 344.38 },
        ],
        additionalCosts: [
          { type: 'Labour & Processing', percentage: 2.5, amount: 338.68 },
          { type: 'Overhead', percentage: 1.5, amount: 203.21 }
        ],
        totalComponentCost: 13547.38,
        totalAdditionalCost: 541.89,
        effectiveCost: 14089.27,
        effectiveRatePerUnit: 281.79,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 3,
        finishedProductId: 103,
        finishedProductName: 'Cattle Feed Concentrate',
        bomName: 'CATTLE CONCENTRATE 25 KG',
        outputQuantity: 25,
        outputUnit: 'BAG',
        costAllocationPercent: 100,
        components: [
          { rawMaterialId: 9, rawMaterialName: 'SOYBEAN MEAL', quantity: 100.00, unit: 'KG', rate: 42.50, amount: 4250.00 },
          { rawMaterialId: 2, rawMaterialName: 'YELLOW MAZE',  quantity:  80.00, unit: 'KG', rate: 18.76, amount: 1500.80 },
          { rawMaterialId: 12,rawMaterialName: 'COTTON SEED',  quantity:  60.00, unit: 'KG', rate: 22.40, amount: 1344.00 },
          { rawMaterialId: 10,rawMaterialName: 'LIMESTONE',    quantity:  12.00, unit: 'KG', rate:  5.20, amount:   62.40 },
          { rawMaterialId: 5, rawMaterialName: 'SALT',         quantity:   3.00, unit: 'KG', rate:  4.00, amount:   12.00 },
          { rawMaterialId: 11,rawMaterialName: 'VITAMIN MIX',  quantity:   1.50, unit: 'KG', rate: 310.00, amount: 465.00 },
          { rawMaterialId: 13,rawMaterialName: 'MINERAL MIX',  quantity:   2.50, unit: 'KG', rate: 185.00, amount: 462.50 },
          { rawMaterialId: 8, rawMaterialName: 'BOPP BAG',     quantity:   1.00, unit: 'KG', rate: 172.19, amount: 172.19 },
        ],
        additionalCosts: [
          { type: 'Processing', percentage: 3, amount: 248.06 }
        ],
        totalComponentCost: 8268.89,
        totalAdditionalCost: 248.06,
        effectiveCost: 8516.95,
        effectiveRatePerUnit: 340.68,
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  /* ---------- HELPER: cost per piece for a BOM ---------- */
  getCostPerPiece(bom: BillOfMaterial): number {
    return +(bom.effectiveCost / (bom.outputQuantity || 1)).toFixed(2);
  }

  /* ---------- HELPER: top-3 components by cost share ---------- */
  getTopComponents(bom: BillOfMaterial) {
    return [...bom.components]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }

  /* ---------- HELPER: cost percent for a component ---------- */
  getComponentPercent(bom: BillOfMaterial, amount: number): number {
    if (!bom.totalComponentCost) return 0;
    return +((amount / bom.totalComponentCost) * 100).toFixed(1);
  }

  /* ---------- BOM STATS ---------- */
  get bomStats() {
    const total = this.bomList.length;
    const totalMaterials = this.bomList.reduce((s, b) => s + b.components.length, 0);
    const avgRate = total > 0
      ? +(this.bomList.reduce((s, b) => s + b.effectiveRatePerUnit, 0) / total).toFixed(2)
      : 0;
    return { total, totalMaterials, avgRate };
  }

  get filteredBomList(): BillOfMaterial[] {
    const q = this.bomSearchTerm?.toLowerCase();
    return this.bomList.filter(bom => {
      if (!q) return true;
      return bom.bomName.toLowerCase().includes(q)
        || bom.finishedProductName.toLowerCase().includes(q);
    });
  }

  get finishedProductsList(): DisplayInventoryItem[] {
    return this.inventory.filter(i => i.category === 'finished_product');
  }

  get rawMaterialsList(): DisplayInventoryItem[] {
    return this.inventory.filter(i => i.category === 'raw_material');
  }

  /* ---------- BOM MODAL ---------- */
  openBomModal() {
    this.isBomModalOpen = true;
    this.bomForm = {
      bomName: '',
      finishedProductId: null,
      outputQuantity: 1,
      outputUnit: 'BAG',
      costAllocationPercent: 100
    };
    this.bomComponents = [];
    this.bomAdditionalCosts = [];
  }

  closeBomModal() {
    this.isBomModalOpen = false;
    this.bomComponents = [];
    this.bomAdditionalCosts = [];
    this.bomForm = {
      bomName: '',
      finishedProductId: null,
      outputQuantity: 1,
      outputUnit: 'BAG',
      costAllocationPercent: 100
    };
  }

  /* ---------- BOM COMPONENTS ---------- */
  addBomComponent() {
    this.bomComponents.push({
      rawMaterialId: 0,
      rawMaterialName: '',
      quantity: 0,
      unit: 'KG',
      rate: 0,
      amount: 0
    });
  }

  removeBomComponent(index: number) {
    this.bomComponents.splice(index, 1);
  }

  onBomComponentMaterialChange(index: number, materialId: number) {
    const material = this.rawMaterialsList.find(m => m.id === materialId);
    if (material) {
      this.bomComponents[index].rawMaterialId = material.id;
      this.bomComponents[index].rawMaterialName = material.name;
      this.bomComponents[index].unit = material.unit || 'KG';
      this.bomComponents[index].rate = material.price || 0;
      this.recalcBomComponentAmount(index);
    }
  }

  recalcBomComponentAmount(index: number) {
    const c = this.bomComponents[index];
    c.amount = +(c.quantity * c.rate).toFixed(2);
  }

  /* ---------- BOM ADDITIONAL COSTS ---------- */
  addAdditionalCost() {
    this.bomAdditionalCosts.push({
      type: '',
      percentage: 0,
      amount: 0
    });
  }

  removeAdditionalCost(index: number) {
    this.bomAdditionalCosts.splice(index, 1);
  }

  recalcAdditionalCostAmount(index: number) {
    const cost = this.bomAdditionalCosts[index];
    cost.amount = +(this.bomTotalComponentCost * cost.percentage / 100).toFixed(2);
  }

  /* ---------- BOM COMPUTED VALUES ---------- */
  get bomTotalComponentCost(): number {
    return +this.bomComponents.reduce((sum, c) => sum + c.amount, 0).toFixed(2);
  }

  get bomTotalAdditionalCost(): number {
    return +this.bomAdditionalCosts.reduce((sum, c) => sum + c.amount, 0).toFixed(2);
  }

  get bomEffectiveCost(): number {
    return +(this.bomTotalComponentCost + this.bomTotalAdditionalCost).toFixed(2);
  }

  get bomEffectiveRate(): number {
    const qty = this.bomForm.outputQuantity || 1;
    return +(this.bomEffectiveCost / qty).toFixed(2);
  }

  get bomTotalWeight(): number {
    return +this.bomComponents.reduce((sum, c) => sum + c.quantity, 0).toFixed(2);
  }

  /* ---------- SAVE BOM ---------- */
  saveBOM() {
    if (!this.bomForm.finishedProductId || !this.bomForm.bomName || this.bomComponents.length === 0) {
      alert('Please fill all required fields and add at least one component.');
      return;
    }

    const product = this.finishedProductsList.find(p => p.id === this.bomForm.finishedProductId);

    const bom: Partial<BillOfMaterial> = {
      finishedProductId: this.bomForm.finishedProductId,
      finishedProductName: product?.name || '',
      bomName: this.bomForm.bomName,
      outputQuantity: this.bomForm.outputQuantity,
      outputUnit: this.bomForm.outputUnit,
      costAllocationPercent: this.bomForm.costAllocationPercent,
      components: this.bomComponents,
      additionalCosts: this.bomAdditionalCosts,
      totalComponentCost: this.bomTotalComponentCost,
      totalAdditionalCost: this.bomTotalAdditionalCost,
      effectiveCost: this.bomEffectiveCost,
      effectiveRatePerUnit: this.bomEffectiveRate
    };

    this.inventoryService.createBOM(bom).subscribe({
      next: (created) => {
        this.bomList.unshift(created);
        this.closeBomModal();
        alert('Bill of Materials created successfully!');
      },
      error: (err) => {
        console.error(err);
        alert('Failed to create BOM. Backend may not be available.');
      }
    });
  }

  /* ---------- VIEW BOM ---------- */
  viewBOM(bom: BillOfMaterial) {
    this.selectedBom = { ...bom };
    this.bomOutputQty = bom.outputQuantity;
    this.isBomViewOpen = true;
  }

  closeBomView() {
    this.isBomViewOpen = false;
    this.selectedBom = null;
    this.bomOutputQty = 1;
  }

  /* ---------- DYNAMIC RECALC FOR VIEW ---------- */
  get viewScaleFactor(): number {
    if (!this.selectedBom) return 1;
    return this.bomOutputQty / (this.selectedBom.outputQuantity || 1);
  }

  getScaledQuantity(baseQty: number): number {
    return +(baseQty * this.viewScaleFactor).toFixed(2);
  }

  getScaledAmount(baseAmount: number): number {
    return +(baseAmount * this.viewScaleFactor).toFixed(2);
  }

  get scaledTotalComponentCost(): number {
    if (!this.selectedBom) return 0;
    return +(this.selectedBom.totalComponentCost * this.viewScaleFactor).toFixed(2);
  }

  get scaledEffectiveCost(): number {
    if (!this.selectedBom) return 0;
    return +(this.selectedBom.effectiveCost * this.viewScaleFactor).toFixed(2);
  }

  get scaledTotalWeight(): number {
    if (!this.selectedBom) return 0;
    return +(this.selectedBom.components.reduce((s, c) => s + c.quantity, 0) * this.viewScaleFactor).toFixed(2);
  }

  get scaledEffectiveRate(): number {
    if (!this.selectedBom) return 0;
    const qty = this.bomOutputQty || 1;
    return +(this.scaledEffectiveCost / qty).toFixed(2);
  }

  /* Cost per single unit (per piece / per bag) */
  get scaledCostPerPiece(): number {
    return this.scaledEffectiveRate;
  }

  /* ---------- DELETE BOM ---------- */
  deleteBOM(id: number) {
    if (!confirm('Are you sure you want to delete this Bill of Materials?')) return;

    this.inventoryService.deleteBOM(id).subscribe({
      next: () => {
        this.bomList = this.bomList.filter(b => b.id !== id);
        alert('BOM deleted successfully!');
      },
      error: () => alert('Failed to delete BOM.')
    });
  }

  Math = Math;
}