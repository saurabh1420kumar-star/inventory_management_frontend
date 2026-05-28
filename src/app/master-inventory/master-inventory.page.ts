import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { environment } from '../../environments/environment';

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
  IonRefresher,
  IonRefresherContent
} from '@ionic/angular/standalone';

import { ModalController } from '@ionic/angular';
import {
  InventoryService,
  InventoryItem as ApiInventoryItem,
  BillOfMaterial,
  BOMComponent,
  AdditionalCost
} from '../services/inventory';
import { UnitService } from '../services/unit.service';
import { HapticService } from '../services/haptic.service';
import { Toast } from '../services/toast';
import { Auth } from '../services/auth';

/* ---------- TYPES ---------- */
type ItemStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
type ItemCategory = 'raw_material' | 'finished_product' | 'spare_parts' | 'promotional_items' | 'scrap_material' | 'unit_master' | 'TOOL' | 'SPARE_PART' | 'MACHINE';

interface DisplayInventoryItem extends ApiInventoryItem {
  status: ItemStatus;
  category: ItemCategory;
  lowStock?: boolean;
  imageUrl?: string;
  price?: number;
  description?: string;
  sku?: string;
  weight?: number;
  subUnit?: string;
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
    HttpClientModule,

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
    IonSelectOption,
    IonRefresher,
    IonRefresherContent
  ]
})
export class MasterInventoryPage implements OnInit {

  /* ---------- UI STATE ---------- */
  activeTab: 'all' | 'raw_material' | 'finished_product' | 'bom' | 'spare_parts' | 'promotional_items' | 'scrap_material' | 'inward_approvals' = 'all';
  filterDropdownOpen = false;
  filterOptions = [
    { value: 'all',               label: 'All Categories',    dot: 'bg-emerald-400' },
    { value: 'raw_material',      label: 'Raw Material',      dot: 'bg-blue-400' },
    { value: 'finished_product',  label: 'Finished Product',  dot: 'bg-purple-400' },
    { value: 'spare_parts',       label: 'Spare Parts',       dot: 'bg-orange-400' },
    { value: 'promotional_items', label: 'Promotional Items', dot: 'bg-pink-400' },
    { value: 'scrap_material',    label: 'Scrap Material',    dot: 'bg-slate-400' },
    { value: 'bom',               label: 'Bill of Material',  dot: 'bg-teal-400' },
    { value: 'inward_approvals',  label: 'Inward Approvals',  dot: 'bg-amber-400' }
  ];

  /* ---------- INWARD APPROVALS STATE ---------- */
  pendingApprovals: any[] = [];
  isLoadingApprovals = false;
  processingApprovalId: number | null = null;
  approvalComments: { [id: number]: string } = {};
  searchTerm = '';
  isAddModalOpen = false;
  isEditModalOpen = false;
  isViewItemModalOpen = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  messageTimeout: any;
  isConfirmOpen = false;
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;
  selectedItem: DisplayInventoryItem | null = null;
  viewItemSelectedItem: DisplayInventoryItem | null = null;
  currentPage = 1;
  itemsPerPage = 6;
  selectedCategory: ItemCategory | null = null;
  rawMaterials: DisplayInventoryItem[] = [];
  finishedProducts: DisplayInventoryItem[] = [];

  /* ---------- BOM STATE ---------- */
  bomList: BillOfMaterial[] = [];
  bomSummary: any = {};
  isBomModalOpen = false;
  isBomViewOpen = false;
  editingBomId: number | null = null;
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
  
  // Raw API data for BOM (before mapping to DisplayItem)
  rawMaterialsRawData: any[] = [];
  finishedProductsRawData: any[] = [];
  /* ---------- FORM ---------- */
  addForm: FormGroup;
  editForm: FormGroup;
  unitMasterForm!: FormGroup;

  /* ---------- UNIT MASTER MODAL STATE ---------- */
  isUnitMasterModalOpen = false;
  unitMasterSelectedCategory: 'Raw Material' | 'Finished Product' | null = null;

  previewImage: string | ArrayBuffer | null = null;
  selectedImageFile: File | null = null;

  /* ---------- DATA ---------- */
  inventory: DisplayInventoryItem[] = [];

  private haptic = inject(HapticService);
  private toast = inject(Toast);

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private inventoryService: InventoryService,
    private unitService: UnitService,
    private router: Router,
    private http: HttpClient,
    private auth: Auth
  ) {
    this.addForm = this.fb.group({
      category: ['', Validators.required],
      name: ['', Validators.required],
      materialCode: [''],
      hsn: [''],
      taxRateCode: [''],
      unit: ['KG', Validators.required],
      // kept for reset compatibility
      subUnit: ['KG'],
      vendorId: [''],
      vendorName: [''],
      transportName: [''],
      driverName: [''],
      driverMobile: [''],
      sku: [''],
      description: [''],
      price: [0],
      weight: [0],
      active: [true],
      quantity: [0],
      minimumThreshold: [0],
      cgstSgst: [null]
    });

    this.editForm = this.fb.group({
      name: ['', Validators.required],
      materialCode: [''],
      hsn: [''],
      taxRateCode: [''],
      unit: ['KG', Validators.required],
      subUnit: ['KG'],
      price: [0, [Validators.min(0)]],
      // finished product fields
      sku: [''],
      description: [''],
      weight: [0, [Validators.min(0)]],
      active: [true],
      quantity: [0, [Validators.required, Validators.min(0)]],
      minimumThreshold: [0, [Validators.required, Validators.min(0)]]
    });

    this.unitMasterForm = this.fb.group({
      category: ['', Validators.required],
      unitName: [''],
      unitCode: [1000],
      unitType: ['KG'],
      productSize: ['small'],
      sku: [''],
      price: [0],
      name: [''],
      quantity: [0],
      minimumThreshold: [0],
      description: [''],
      status: ['ACTIVE']
    });
  }

  ngOnInit() {
    this.loadInventory();
    // Also load BOMs on page init
    this.loadBOMs();
    this.loadBOMSummary();
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

    // Preserve the price fields from API during mapping
    return {
      ...item,
      status,
      category,          // <— correct tag
      lowStock: isLowStock,
      materialCode: (item as any).materialCode,
      minimumThreshold,
      price: item.price,  // <— Explicitly preserve price from API
      perItemPrice: item.perItemPrice,  // <— Preserve perItemPrice for BOM
      imageUrl: (item as any).imageUrl || (item as any).image || this.getImageUrlForItem(item.name, category)
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

      if (this.activeTab === 'all') return match;

      return match && item.category === this.activeTab;
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

    if (!file.type.startsWith('image/')) {
      this.showMessage('error', 'Please upload a valid image file.');
      return;
    }

    this.selectedImageFile = file;

    const reader = new FileReader();
    reader.onload = () => (this.previewImage = reader.result);
    reader.readAsDataURL(file);
  }

  removeSelectedImage(): void {
    this.previewImage = null;
    this.selectedImageFile = null;
  }

  /* ---------- MODAL ---------- */
  openAddModal() {
    this.haptic.medium();
    this.isAddModalOpen = true;
  }

  onCategoryChange(category: ItemCategory) {
    this.selectedCategory = category;
    this.addForm.patchValue({ category });
    if (category !== 'raw_material' && category !== 'finished_product') {
      this.removeSelectedImage();
    }
    // All fields optional — only name and unit are required
    this.addForm.get('materialCode')!.clearValidators();
    this.addForm.get('materialCode')!.updateValueAndValidity();
    this.addForm.get('sku')!.clearValidators();
    this.addForm.get('sku')!.updateValueAndValidity();
  }

  getCategoryIcon(category: ItemCategory | null): string {
    const map: Partial<Record<ItemCategory, string>> = {
      raw_material: 'layers-outline',
      finished_product: 'cube-outline',
      spare_parts: 'build-outline',
      promotional_items: 'pricetag-outline',
      scrap_material: 'trash-outline',
      unit_master: 'albums-outline'
    };
    return (category && map[category]) || 'cube-outline';
  }

  getCategoryLabel(category: ItemCategory | null): string {
    const map: Partial<Record<ItemCategory, string>> = {
      raw_material: 'Raw Material',
      finished_product: 'Finished Product',
      spare_parts: 'Spare Parts',
      promotional_items: 'Promotional Items',
      scrap_material: 'Scrap Material',
      unit_master: 'Unit Master'
    };
    return (category && map[category]) || '';
  }

  openUnitMasterModal() {
    this.haptic.medium();
    this.selectedCategory = null;
    this.isUnitMasterModalOpen = true;
  }

  closeUnitMasterModal() {
    this.haptic.light();
    this.isUnitMasterModalOpen = false;
    this.unitMasterSelectedCategory = null;

    // Clear dynamic validators before reset so form is clean on re-open
    ['unitName', 'name', 'sku'].forEach(ctrl => {
      this.unitMasterForm.get(ctrl)!.clearValidators();
      this.unitMasterForm.get(ctrl)!.updateValueAndValidity();
    });

    this.unitMasterForm.reset({
      status: 'ACTIVE',
      unitType: 'KG',
      productSize: 'small',
      unitCode: 1000
    });
  }

  onUnitMasterCategoryChange(category: 'Raw Material' | 'Finished Product') {
    this.unitMasterSelectedCategory = category;
    this.unitMasterForm.patchValue({ category });

    const unitNameCtrl = this.unitMasterForm.get('unitName')!;
    const nameCtrl = this.unitMasterForm.get('name')!;
    const skuCtrl = this.unitMasterForm.get('sku')!;

    if (category === 'Raw Material') {
      unitNameCtrl.setValidators([Validators.required, Validators.minLength(2)]);
      nameCtrl.clearValidators();
      skuCtrl.clearValidators();
      this.unitMasterForm.patchValue({ sku: '', name: '' });
    } else {
      nameCtrl.setValidators([Validators.required, Validators.minLength(2)]);
      skuCtrl.setValidators([Validators.required]);
      unitNameCtrl.clearValidators();
      this.unitMasterForm.patchValue({ unitName: '' });
    }

    unitNameCtrl.updateValueAndValidity();
    nameCtrl.updateValueAndValidity();
    skuCtrl.updateValueAndValidity();
  }

  submitUnitMaster() {
    this.haptic.medium();
    if (this.unitMasterForm.invalid || !this.unitMasterSelectedCategory) {
      return;
    }

    const fv = this.unitMasterForm.value;
    let payload: any;

    if (fv.category === 'Raw Material') {
      payload = {
        category: 'Raw Material',
        unitName: fv.unitName,
        unitCode: fv.unitCode || 1000,
        unitType: fv.unitType || 'KG',
        productSize: fv.productSize || 'small',
        description: fv.description || '',
        status: fv.status || 'ACTIVE'
      };
    } else {
      payload = {
        category: 'Finished Product',
        unitName: fv.name,
        unitCode: String(fv.sku || ''),
        unitType: 'PIECE',
        productSize: 'small',
        description: fv.description || '',
        status: fv.status || 'ACTIVE'
      };
    }

    this.unitService.createUnit(payload).subscribe({
      next: () => {
        this.closeUnitMasterModal();
        this.closeAddModal();
        this.showMessage('success', 'Unit created successfully!');
      },
      error: (err) => {
        const msg = this.extractErrorMessage(err);
        this.showMessage('error', msg);
        this.toast.present(msg, 'danger');
      }
    });
  }

  navigateToUnitMaster() {
    this.closeAddModal();
    this.router.navigate(['/unit-master']);
  }

  closeAddModal() {
    this.haptic.light();
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
      cgstSgst: null,
      price: 0,
      weight: 0,
      hsn: '',
      taxRateCode: '',
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
    this.haptic.medium();
    if (this.addForm.invalid || !this.selectedCategory) return;

    const { name, materialCode, unit, hsn, taxRateCode, minimumThreshold, cgstSgst } = this.addForm.value;
    const category = this.selectedCategory;
    let payload: Record<string, any>;

    const commonFields: Record<string, any> = {
      hsn: (hsn ?? '').toString().trim(),
      taxRateCode: (taxRateCode ?? '').toString().trim(),
      minimumThreshold: minimumThreshold ?? 0
    };
    if (cgstSgst !== null && cgstSgst !== undefined && cgstSgst !== '') {
      commonFields['taxRate'] = Number(cgstSgst);
    }

    switch (category) {
      case 'raw_material':
        payload = {
          name,
          materialCode: materialCode || undefined,
          unit: unit || 'KG',
          ...commonFields
        };
        break;
      case 'finished_product':
        payload = {
          name,
          sku: materialCode || undefined,
          unit: unit || 'KG',
          ...commonFields
        };
        break;
      default:
        // spare_parts, promotional_items, scrap_material → itemCode
        payload = {
          name,
          itemCode: materialCode || undefined,
          unit: unit || 'KG',
          ...commonFields
        };
        break;
    }

    const request$ = this.selectedImageFile && (category === 'raw_material' || category === 'finished_product')
      ? this.inventoryService.createItemWithImage(category, { category, ...payload } as any, this.selectedImageFile)
      : this.inventoryService.createItem({ category, ...payload } as any);

    request$.subscribe({
      next: () => {
        this.loadInventory();
        this.resetPagination();
        this.closeAddModal();
        this.showMessage('success', 'Item added successfully!');
      },
      error: (err) => {
        const errorMessage = this.extractErrorMessage(err);
        console.error(err);
        this.showMessage('error', errorMessage);
        this.toast.present(errorMessage, 'danger');
      }
    });
  }

  /* ---------- ACTIONS ---------- */
  viewItem(item: DisplayInventoryItem) {
    this.haptic.light();
    console.log('View item clicked:', item);
    this.viewItemSelectedItem = item;
    this.isViewItemModalOpen = true;
    console.log('Modal should open now. isViewItemModalOpen:', this.isViewItemModalOpen);
  }

  closeViewItemModal() {
    this.haptic.light();
    this.isViewItemModalOpen = false;
    this.viewItemSelectedItem = null;
  }

  editItem(item: DisplayInventoryItem) {
    this.haptic.medium();
    this.selectedItem = item;
    this.editForm.patchValue({
      name: item.name,
      materialCode: item.materialCode || '',
      hsn: (item as any).hsn || '',
      taxRateCode: (item as any).taxRateCode || '',
      unit: item.unit || 'KG',
      subUnit: (item as any).subUnit || 'KG',
      price: item.price || 0,
      sku: item.sku || '',
      description: item.description || '',
      weight: (item as any).weight || 0,
      active: (item as any).active !== false,
      quantity: item.quantity,
      minimumThreshold: item.minimumThreshold
    });
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.haptic.light();
    this.isEditModalOpen = false;
    this.selectedItem = null;
    this.editForm.reset({
      unit: 'KG',
      subUnit: 'KG',
      hsn: '',
      taxRateCode: '',
      quantity: 0,
      minimumThreshold: 0
    });
  }

  updateItem() {
    this.haptic.medium();
    if (this.editForm.invalid || !this.selectedItem) return;

    const formVal = this.editForm.value;
    let payload: Record<string, any>;

    if (this.selectedItem.category === 'finished_product') {
      payload = {
        category: 'finished_product',
        name: formVal.name,
        description: formVal.description || '',
        sku: formVal.sku || '',
        hsn: formVal.hsn || undefined,
        taxRateCode: formVal.taxRateCode || undefined,
        price: formVal.price ?? 0,
        unit: formVal.unit || 'KG',
        weight: formVal.weight ?? 0,
        active: formVal.active !== false,
        quantity: formVal.quantity,
        minimumThreshold: formVal.minimumThreshold
      };
    } else {
      payload = {
        category: 'raw_material',
        name: formVal.name,
        materialCode: formVal.materialCode,
        hsn: formVal.hsn || undefined,
        taxRateCode: formVal.taxRateCode || undefined,
        unit: formVal.unit,
        subUnit: formVal.subUnit || undefined,
        price: formVal.price ?? 0,
        quantity: formVal.quantity,
        minimumThreshold: formVal.minimumThreshold
      };
    }

    this.inventoryService.updateItem(this.selectedItem.id, payload).subscribe({
      next: (updated) => {
        const index = this.inventory.findIndex(i => i.id === this.selectedItem!.id);
        if (index !== -1) {
          this.inventory[index] = this.mapToDisplayItem(updated);
        }
        this.closeEditModal();
        this.showMessage('success', 'Item updated successfully!');
      },
      error: (err) => {
        const errorMessage = this.extractErrorMessage(err);
        console.error(err);
        this.showMessage('error', errorMessage);
        this.toast.present(errorMessage, 'danger');
      }
    });
  }

  deleteItem(id: number, category: ItemCategory) {
    this.haptic.heavy();
    this.openConfirmDialog('Are you sure you want to delete this item?', () => {
      this.inventoryService.deleteItem(id, category).subscribe({
        next: () => {
          this.inventory = this.inventory.filter(i => i.id !== id);
          this.showMessage('success', 'Item deleted successfully!');
        },
        error: () => this.showMessage('error', 'Delete failed')
      });
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

  getWeightPlaceholder(unit: string | null | undefined): string {
    switch (unit) {
      case 'LITER':  return 'e.g. 5.0 (liters)';
      case 'DOZEN':  return 'e.g. 2 (dozens)';
      case 'PIECES': return 'e.g. 100 (pieces)';
      default:       return 'e.g. 0.00 (kg)';
    }
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value || '';
    this.resetPagination();
  }

  // Helper method to extract error message from API response
  private extractErrorMessage(error: any): string {
    if (!error) return 'An error occurred. Please try again.';
    
    if (error.error?.error) return error.error.error;
    if (error.error?.message) return error.error.message;
    
    if (error.error && typeof error.error === 'object' && !Array.isArray(error.error)) {
      const errorEntries = Object.entries(error.error);
      if (errorEntries.length > 0) {
        const errorMessages = errorEntries
          .map(([field, message]) => message as string)
          .filter(msg => msg && typeof msg === 'string');
        
        if (errorMessages.length > 0) return errorMessages.join('\n');
      }
    }
    
    if (error.statusText) return error.statusText;
    return 'Failed to process item. Please try again.';
  }

  showMessage(type: 'success' | 'error', message: string, duration: number = 3000) {
    if (type === 'success') {
      this.successMessage = message;
      this.errorMessage = '';
    } else {
      this.errorMessage = message;
      this.successMessage = '';
    }
    
    // Auto-clear message after duration
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    this.messageTimeout = setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, duration);
  }

  openConfirmDialog(message: string, callback: () => void) {
    this.confirmMessage = message;
    this.confirmCallback = callback;
    this.isConfirmOpen = true;
  }

  confirmAction() {
    this.haptic.heavy();
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.closeConfirmDialog();
  }

  closeConfirmDialog() {
    this.haptic.light();
    this.isConfirmOpen = false;
    this.confirmMessage = '';
    this.confirmCallback = null;
  }

  onActiveTabChange(tab: 'all' | 'raw_material' | 'finished_product' | 'bom' | 'spare_parts' | 'promotional_items' | 'scrap_material' | 'inward_approvals') {
    this.haptic.selectionChanged();
    this.activeTab = tab;
    this.resetPagination();
    if (tab === 'bom') {
      this.loadBOMs();
      this.loadBOMSummary();
    }
    if (tab === 'inward_approvals') {
      this.loadPendingApprovals();
    }
  }

  /* ---------- INWARD APPROVALS ---------- */
  loadPendingApprovals() {
    this.isLoadingApprovals = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
    this.http.get<any>(`${environment.apiUrl}/products/inward-approvals/pending`, { headers }).subscribe({
      next: (res) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? res?.content ?? []);
        this.pendingApprovals = raw.map(a => {
          let payload: any = {};
          try { payload = JSON.parse(a.requestPayload ?? '{}'); } catch {}
          return { ...a, _payload: payload };
        });
        this.approvalComments = {};
        this.pendingApprovals.forEach(a => this.approvalComments[a.id] = '');
        this.isLoadingApprovals = false;
      },
      error: () => {
        this.isLoadingApprovals = false;
        this.toast.present('Failed to load pending approvals', 'danger');
      }
    });
  }

  private readonly payloadLabelMap: Record<string, string> = {
    name:               'Name',
    materialCode:       'Material Code',
    unit:               'Unit',
    price:              'Price (₹)',
    quantity:           'Quantity',
    minimumThreshold:   'Min. Threshold',
    hsn:                'HSN Code',
    taxRate:            'Tax Rate (%)',
    vendorId:           'Vendor ID',
    vendorName:         'Vendor',
    transportName:      'Transport',
    driverName:         'Driver Name',
    driverMobile:       'Driver Mobile',
    status:             'Status',
    rate:               'Rate (₹)',
    gst:                'GST',
    grossAmount:        'Gross Amount (₹)',
    batchNumber:        'Batch No',
    invoiceNumber:      'Invoice No',
    remarks:            'Remarks',
  };

  getPayloadFields(payload: any): { label: string; value: string }[] {
    if (!payload) return [];
    return Object.entries(payload)
      .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 0)
      .map(([k, v]) => ({
        label: this.payloadLabelMap[k] ?? k,
        value: String(v)
      }));
  }

  processApproval(approvalId: number, action: 'APPROVE' | 'REJECT') {
    this.haptic.medium();
    this.processingApprovalId = approvalId;
    const token = localStorage.getItem('token');
    const username = this.auth.getUsername() ?? '';
    const headers = new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Admin-Username': username
    });
    this.http.post<any>(
      `${environment.apiUrl}/products/inward-approvals/${approvalId}/process`,
      { action, comments: this.approvalComments[approvalId] ?? '' },
      { headers }
    ).subscribe({
      next: () => {
        this.pendingApprovals = this.pendingApprovals.filter(a => a.id !== approvalId);
        delete this.approvalComments[approvalId];
        this.processingApprovalId = null;
        this.toast.present(action === 'APPROVE' ? 'Approved successfully!' : 'Rejected successfully!', action === 'APPROVE' ? 'success' : 'warning');
      },
      error: () => {
        this.processingApprovalId = null;
        this.toast.present('Failed to process approval', 'danger');
      }
    });
  }

  refreshInventory() {
    this.loadInventory();
  }

  handlePullRefresh(event: any) {
    this.refreshInventory();
    setTimeout(() => event.target.complete(), 1500);
  }

  /* ============================================ */
  /*        BILL OF MATERIALS (BOM) METHODS       */
  /* ============================================ */

  loadBOMs() {
    this.isBomLoading = true;
    // Use the new list endpoint with pagination
    this.inventoryService.getBOMsList(0, 10, 'createdAt', 'desc').subscribe({
      next: (response) => {
        // Response structure: { content: [], totalElements, etc }
        const boms = response.content || response || [];
        this.bomList = (boms && Array.isArray(boms) && boms.length > 0) ? boms : this.getDummyBOMs();
        console.log('✅ BOMs loaded from API:', this.bomList.length, 'items');
        this.isBomLoading = false;
      },
      error: (err) => {
        console.error('Failed to load BOMs from API:', err);
        this.bomList = this.getDummyBOMs();
        this.isBomLoading = false;
      }
    });
  }

  loadBOMSummary() {
    // Load BOM summary statistics
    this.inventoryService.getBOMSSummary().subscribe({
      next: (summary) => {
        this.bomSummary = summary || {};
        console.log('✅ BOM Summary loaded:', this.bomSummary);
      },
      error: (err) => {
        console.error('Failed to load BOM Summary:', err);
        this.bomSummary = {};
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

  openBomFromAddModal() {
    this.closeAddModal();
    this.openBomModal();
  }

  /* ---------- BOM MODAL ---------- */
  openBomModal() {
    this.haptic.medium();
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

    // Load finished products and raw materials for dropdowns
    this.loadBomDropdownData();
  }

  loadBomDropdownData() {
    forkJoin([
      this.inventoryService.getFinishedProducts(),
      this.inventoryService.getRawMaterials()
    ]).subscribe({
      next: ([finishedProducts, rawMaterials]) => {
        // Store raw API data before mapping
        this.rawMaterialsRawData = rawMaterials;
        this.finishedProductsRawData = finishedProducts;
        
        this.finishedProducts = finishedProducts.map(item => this.mapToDisplayItem(item));
        this.rawMaterials = rawMaterials.map(item => this.mapToDisplayItem(item));
        console.log('✅ API Finished Products loaded:', this.finishedProducts.length, 'items');
        console.log('✅ API Raw Materials loaded:', this.rawMaterials.length, 'items');
        if (this.rawMaterialsRawData.length > 0) {
          console.log('📦 First raw material (RAW DATA):', this.rawMaterialsRawData[0]);
          console.log('📦 First raw material (MAPPED):', this.rawMaterials[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load BOM dropdown data:', err);
        // Fallback to filtered inventory
        this.finishedProducts = this.inventory.filter(i => i.category === 'finished_product');
        this.rawMaterials = this.inventory.filter(i => i.category === 'raw_material');
        this.rawMaterialsRawData = this.rawMaterials as any;
        this.finishedProductsRawData = this.finishedProducts as any;
        console.log('📍 Using fallback - Inventory raw materials:', this.rawMaterials.length);
        if (this.rawMaterials.length > 0) {
          console.log('📦 First fallback raw material sample:', this.rawMaterials[0]);
        }
      }
    });
  }

  closeBomModal() {
    this.haptic.light();
    this.isBomModalOpen = false;
    this.editingBomId = null;
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
    console.log('🔄 Material selection triggered:', { index, materialId });
    
    // Try to get price from raw API data first (before mapping transformation)
    let price = 0;
    let materialName = '';
    let unit = 'KG';
    
    // Find in raw data (has original API response with perItemPrice field)
    if (this.rawMaterialsRawData.length > 0) {
      const rawMaterial = this.rawMaterialsRawData.find(m => m.id === materialId);
      if (rawMaterial) {
        materialName = rawMaterial.name || '';
        unit = rawMaterial.unit || 'KG';
        // API returns perItemPrice field
        price = rawMaterial.perItemPrice || rawMaterial.price || 0;
        console.log('✅ Material found in RAW API data:', { materialName, unit, perItemPrice: rawMaterial.perItemPrice, price });
      }
    }
    
    // If not found or raw data empty, try mapped materials
    if (price === 0 && this.rawMaterials.length > 0) {
      const material = this.rawMaterials.find(m => m.id === materialId);
      if (material) {
        materialName = material.name || '';
        unit = material.unit || 'KG';
        price = (material as any).perItemPrice || (material as any).price || 0;
        console.log('✅ Material found in MAPPED materials:', { materialName, unit, perItemPrice: (material as any).perItemPrice, price });
      }
    }
    
    // Last resort: check inventory filter (fallback source)
    if (price === 0) {
      const material = this.rawMaterialsList.find(m => m.id === materialId);
      if (material) {
        materialName = material.name || '';
        unit = material.unit || 'KG';
        price = (material as any).perItemPrice || material.price || 0;
        console.log('✅ Material found in FALLBACK inventory:', { materialName, unit, perItemPrice: (material as any).perItemPrice, price });
      }
    }
    
    // Update component with found values
    this.bomComponents[index].rawMaterialId = materialId;
    this.bomComponents[index].rawMaterialName = materialName;
    this.bomComponents[index].unit = unit;
    this.bomComponents[index].rate = price;
    
    console.log('📊 Component updated:', this.bomComponents[index]);
    this.recalcBomComponentAmount(index);
  }

  recalcBomComponentAmount(index: number) {
    const c = this.bomComponents[index];
    const newAmount = +(c.quantity * c.rate).toFixed(2);
    c.amount = newAmount;
    console.log(`💰 AMOUNT CALC [${index}]:`, { 
      material: c.rawMaterialName, 
      quantity: c.quantity, 
      rate: c.rate, 
      calculation: `${c.quantity} × ${c.rate}`,
      amount: newAmount
    });
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
    this.haptic.medium();
    if (!this.bomForm.finishedProductId || !this.bomForm.bomName || this.bomComponents.length === 0) {
      this.showMessage('error', 'Please fill all required fields and add at least one component.');
      return;
    }

    // If editing, call updateBOM instead
    if (this.editingBomId) {
      this.updateBOM(this.editingBomId);
      return;
    }

    // Use API-fetched finishedProducts if available, fallback to filtered inventory
    const products = this.finishedProducts.length > 0 ? this.finishedProducts : this.finishedProductsList;
    const product = products.find(p => p.id === this.bomForm.finishedProductId);

    const bom: Partial<BillOfMaterial> = {
      finishedProductId: this.bomForm.finishedProductId,
      finishedProductName: product?.name || '',
      bomName: this.bomForm.bomName,
      outputQuantity: this.bomForm.outputQuantity,
      outputUnit: this.bomForm.outputUnit,
      costAllocationPercent: this.bomForm.costAllocationPercent,
      components: this.bomComponents,
      additionalCosts: this.bomAdditionalCosts
    };

    this.inventoryService.createBOM(bom).subscribe({
      next: (created) => {
        this.bomList.unshift(created);
        this.closeBomModal();
        this.showMessage('success', 'Bill of Materials created successfully!');
      },
      error: (err) => {
        const errorMessage = this.extractErrorMessage(err);
        console.error('Failed to create BOM:', err);
        this.showMessage('error', errorMessage);
        this.toast.present(errorMessage, 'danger');
      }
    });
  }

  updateBOM(id: number) {
    if (!this.bomForm.finishedProductId || !this.bomForm.bomName || this.bomComponents.length === 0) {
      this.showMessage('error', 'Please fill all required fields and add at least one component.');
      return;
    }

    // Use API-fetched finishedProducts if available, fallback to filtered inventory
    const products = this.finishedProducts.length > 0 ? this.finishedProducts : this.finishedProductsList;
    const product = products.find(p => p.id === this.bomForm.finishedProductId);

    const bom: Partial<BillOfMaterial> = {
      finishedProductId: this.bomForm.finishedProductId,
      finishedProductName: product?.name || '',
      bomName: this.bomForm.bomName,
      outputQuantity: this.bomForm.outputQuantity,
      outputUnit: this.bomForm.outputUnit,
      costAllocationPercent: this.bomForm.costAllocationPercent,
      components: this.bomComponents,
      additionalCosts: this.bomAdditionalCosts
    };

    this.inventoryService.updateBOM(id, bom).subscribe({
      next: (updated) => {
        const index = this.bomList.findIndex(b => b.id === id);
        if (index !== -1) {
          this.bomList[index] = updated;
        }
        this.closeBomModal();
        this.showMessage('success', 'Bill of Materials updated successfully!');
      },
      error: (err) => {
        const errorMessage = this.extractErrorMessage(err);
        console.error('Failed to update BOM:', err);
        this.showMessage('error', errorMessage);
        this.toast.present(errorMessage, 'danger');
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
    this.haptic.light();
    this.isBomViewOpen = false;
    this.selectedBom = null;
    this.bomOutputQty = 1;
  }

  /* ---------- EDIT BOM ---------- */
  editBOMCard(bom: BillOfMaterial) {
    this.haptic.medium();
    // Populate form with existing BOM data
    this.bomForm.finishedProductId = bom.finishedProductId;
    this.bomForm.bomName = bom.bomName;
    this.bomForm.outputQuantity = bom.outputQuantity;
    this.bomForm.outputUnit = bom.outputUnit;
    this.bomForm.costAllocationPercent = bom.costAllocationPercent;

    // Populate components
    this.bomComponents = bom.components.map(comp => ({
      ...comp
    }));

    // Populate additional costs
    this.bomAdditionalCosts = bom.additionalCosts?.map(ac => ({ ...ac })) || [];

    // Set edit mode and open modal
    this.editingBomId = bom.id || null;
    this.isBomModalOpen = true;
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
    this.haptic.heavy();
    this.openConfirmDialog('Are you sure you want to delete this Bill of Materials?', () => {
      this.inventoryService.deleteBOM(id).subscribe({
        next: () => {
          this.bomList = this.bomList.filter(b => b.id !== id);
          console.log('✅ BOM deleted successfully:', id);
          this.showMessage('success', 'BOM deleted successfully!');
        },
        error: (err) => {
          const errorMessage = this.extractErrorMessage(err);
          console.error('Failed to delete BOM:', err);
          this.showMessage('error', errorMessage);
          this.toast.present(errorMessage, 'danger');
        }
      });
    });
  }

  Math = Math;
}
