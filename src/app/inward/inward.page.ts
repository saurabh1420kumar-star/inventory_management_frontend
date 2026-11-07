import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonRefresher, IonRefresherContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addCircleOutline, closeOutline, arrowDownCircleOutline, cubeOutline,
  bagOutline, constructOutline, pricetagOutline, trashOutline,
  checkmarkCircleOutline, refreshOutline, searchOutline, calendarOutline,
  businessOutline, documentTextOutline, layersOutline, filterOutline,
  waterOutline, appsOutline, gridOutline, carOutline, personOutline, callOutline,
  chatbubbleEllipsesOutline, timeOutline, barcodeOutline, buildOutline,
  shieldCheckmarkOutline, calculatorOutline, createOutline
} from 'ionicons/icons';
import { Auth } from '../services/auth';
import { HapticService } from '../services/haptic.service';
import { KeyboardService } from '../services/keyboard.service';
import { environment } from '../../environments/environment';
import { AclDirective } from '../acl/acl.directive';
import { DateRangeFilterComponent } from '../shared/date-range-filter/date-range-filter.component';
import {
  DateFilterState, DateMonthOption, EMPTY_DATE_FILTER,
  buildMonthOptions, getDateRange, isWithinRange
} from '../shared/date-range-filter/date-range-filter';

export type InwardItemType = 'raw_material' | 'finished_product' | 'spare_parts' | 'promotional' | 'scrap';

export interface InwardEntry {
  id?: number;
  itemType: InwardItemType;
  itemName: string;
  itemCode: string;
  quantity: number;
  batchNo?: string;
  rate: number;
  grossAmount: number;
  unit: string;
  vendorName: string;
  vendorId: string;
  transportName: string;
  driverName: string;
  driverMobile: string;
  invoiceNumber: string;
  date: string;
  remarks: string;
  createdAt?: string;
  // spare parts extra
  partNumber?: string;
  category?: string;
  vendor?: string;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  condition?: string;
}

/** One accordion section on the list: all entries of a single item type, newest first. */
export interface InwardSection {
  type: InwardItemType;
  items: InwardEntry[];
  latestDate: string;
}

const UNIT_TYPES = [
  { value: 'KG',     label: 'Kilograms', sub: 'KG',     short: 'KG',  icon: 'cube-outline'    },
  { value: 'LITER',  label: 'Litres',    sub: 'LITER',  short: 'LTR', icon: 'water-outline'   },
  { value: 'PIECES', label: 'Pieces',    sub: 'PIECES', short: 'PCS', icon: 'apps-outline'    },
  { value: 'DOZEN',  label: 'Dozens',    sub: 'DOZEN',  short: 'DZ',  icon: 'grid-outline'    },
];

const ITEM_TYPES: { type: InwardItemType; label: string; icon: string; color: string; bg: string }[] = [
  { type: 'raw_material',    label: 'Raw Material',       icon: 'cube-outline',         color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  { type: 'finished_product',label: 'Finished Product',   icon: 'bag-outline',          color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  { type: 'spare_parts',     label: 'Spare Parts',        icon: 'construct-outline',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  { type: 'promotional',     label: 'Promotional Items',  icon: 'pricetag-outline',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  { type: 'scrap',           label: 'Scrap Material',     icon: 'trash-outline',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
];

@Component({
  selector: 'app-inward',
  standalone: true,
  templateUrl: './inward.page.html',
  styleUrls: ['./inward.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonMenuButton, IonButton, IonIcon,
    IonSpinner, IonRefresher, IonRefresherContent,
    AclDirective,
    DateRangeFilterComponent
  ]
})
export class InwardPage implements OnInit {

  /** Feature key used for CRUD button gating on this page. */
  readonly FEATURE = 'INVENTORY_INWARD';

  itemTypes = ITEM_TYPES;
  unitTypes = UNIT_TYPES;

  // List state
  entries: InwardEntry[] = [];
  filteredEntries: InwardEntry[] = [];

  // Accordion sections (one per item type, newest first)
  readonly sectionPageSize = 12;
  entrySections: InwardSection[] = [];
  private collapsedSections = new Set<InwardItemType>();
  private sectionLimits = new Map<InwardItemType, number>();

  // Date filter (preset / month / custom range) + months that actually have data
  dateFilter: DateFilterState = { ...EMPTY_DATE_FILTER };
  monthOptions: DateMonthOption[] = [];
  isLoading = false;
  searchTerm = '';
  selectedFilter: InwardItemType | 'all' = 'all';

  // Modal state
  isModalOpen = false;
  selectedType: InwardItemType | null = null;
  isSubmitting = false;

  // Detail modal state
  selectedEntry: InwardEntry | null = null;
  isDetailOpen = false;

  // Edit mode state
  isEditMode = false;
  editForm: Partial<InwardEntry> = {};
  isEditSubmitting = false;

  form: InwardEntry = this.emptyForm();

  // Raw materials dropdown
  rawMaterials: any[] = [];
  isLoadingRawMaterials = false;
  selectedRawMaterialId: number | null = null;

  // Scrap items dropdown
  scrapItems: any[] = [];
  isLoadingScrapItems = false;
  selectedScrapId: string | null = null;

  // Promotional items dropdown
  promotionalItems: any[] = [];
  isLoadingPromotionalItems = false;
  selectedPromotionalItemId: number | null = null;

  // Machine parts (spare parts) dropdown
  machineParts: any[] = [];
  isLoadingMachineParts = false;
  selectedMachinePartId: string | null = null;

  // Finished products (BOM) dropdown
  finishedProducts: any[] = [];
  isLoadingFinishedProducts = false;
  selectedFinishedProductId: number | null = null;

  // Tax rate from selected item (used for CGST + SGST calculation)
  currentTaxRate = 0;

  get cgstAmount(): number {
    const base = (this.form.quantity || 0) * (this.form.rate || 0);
    return parseFloat((base * this.currentTaxRate / 100).toFixed(2));
  }

  get sgstAmount(): number {
    return this.cgstAmount;
  }

  get baseAmount(): number {
    return parseFloat(((this.form.quantity || 0) * (this.form.rate || 0)).toFixed(2));
  }

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private router: Router,
    private toastController: ToastController,
    private haptic: HapticService,
    private keyboard: KeyboardService
  ) {
    addIcons({
      'add-circle-outline': addCircleOutline,
      'close-outline': closeOutline,
      'arrow-down-circle-outline': arrowDownCircleOutline,
      'cube-outline': cubeOutline,
      'bag-outline': bagOutline,
      'construct-outline': constructOutline,
      'pricetag-outline': pricetagOutline,
      'trash-outline': trashOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'refresh-outline': refreshOutline,
      'search-outline': searchOutline,
      'calendar-outline': calendarOutline,
      'business-outline': businessOutline,
      'document-text-outline': documentTextOutline,
      'layers-outline': layersOutline,
      'filter-outline': filterOutline,
      'water-outline': waterOutline,
      'apps-outline': appsOutline,
      'grid-outline': gridOutline,
      'car-outline': carOutline,
      'person-outline': personOutline,
      'call-outline': callOutline,
      'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
      'time-outline': timeOutline,
      'barcode-outline': barcodeOutline,
      'build-outline': buildOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline,
      'calculator-outline': calculatorOutline,
      'create-outline': createOutline
    });
  }

  ngOnInit() {
    const role = this.auth.getRoleType()?.toUpperCase() || '';
    if (role === 'DISTRIBUTOR' || role === 'DEALER') {
      this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      return;
    }
    this.loadEntries();
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  private localDateStr(): string {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }

  private emptyForm(): InwardEntry {
    const today = this.localDateStr();
    return {
      itemType: 'raw_material',
      itemName: '',
      itemCode: '',
      quantity: 0,
      batchNo: '',
      rate: 0,
      grossAmount: 0,
      unit: 'KG',
      vendorName: '',
      vendorId: '',
      transportName: '',
      driverName: '',
      driverMobile: '',
      invoiceNumber: '',
      date: today,
      remarks: '',
      partNumber: '',
      category: 'MACHINE',
      vendor: '',
      purchaseDate: today,
      warrantyExpiryDate: '',
      condition: 'NEW'
    };
  }

  updateGrossAmount(): void {
    const base = (this.form.quantity || 0) * (this.form.rate || 0);
    const cgst = base * this.currentTaxRate / 100;
    this.form.grossAmount = parseFloat((base + cgst + cgst).toFixed(2));
  }

  loadEntries(event?: any) {
    this.isLoading = true;
    const headers = this.headers();
    forkJoin({
      raw:         this.http.get<any>(`${environment.apiUrl}/products/raw-materials`, { headers }),
      scrap:       this.http.get<any>(`${environment.apiUrl}/products/scrap-items`, { headers }),
      machine:     this.http.get<any>(`${environment.apiUrl}/products/machine-parts`, { headers }),
      promotional: this.http.get<any>(`${environment.apiUrl}/products/promotional-items`, { headers }),
      finished:    this.http.get<any>(`${environment.apiUrl}/products/finished-products`, { headers })
    }).subscribe({
      next: (res) => {
        const toArr = (r: any) => Array.isArray(r) ? r : (r?.data ?? []);
        const calcGross = (qty: number, price: number) => parseFloat(((qty || 0) * (price || 0)).toFixed(2));
        const rawItems = toArr(res.raw)
          .filter((i: any) => i.status === 'INWARD')
          .map((i: any) => { const r = i.price || i.rate || 0; return { id: i.id, itemType: 'raw_material' as InwardItemType, itemName: i.name, itemCode: i.materialCode, quantity: i.quantity, unit: i.unit, vendorName: i.vendorName, vendorId: i.vendorId, transportName: i.transportName, driverName: i.driverName, driverMobile: i.driverMobile, rate: r, grossAmount: calcGross(i.quantity, r), date: i.updatedAt?.split('T')[0] ?? '', invoiceNumber: '', remarks: '' }; });
        const scrapItems = toArr(res.scrap)
          .filter((i: any) => i.status === 'INWARD')
          .map((i: any) => { const r = i.price || i.rate || 0; return { id: i.id, itemType: 'scrap' as InwardItemType, itemName: i.name, itemCode: i.materialCode ?? i.itemCode, quantity: i.quantity, unit: i.unit, vendorName: i.vendorName, vendorId: i.vendorId, transportName: i.transportName, driverName: i.driverName, driverMobile: i.driverMobile, rate: r, grossAmount: calcGross(i.quantity, r), date: i.updatedAt?.split('T')[0] ?? '', invoiceNumber: '', remarks: '' }; });
        const machineItems = toArr(res.machine)
          .filter((i: any) => i.status === 'INWARD')
          .map((i: any) => { const r = i.price || i.rate || 0; return { id: i.id, itemType: 'spare_parts' as InwardItemType, itemName: i.name, itemCode: i.partNumber, quantity: i.quantity, unit: '', vendor: i.vendor, vendorName: i.vendor, vendorId: '', transportName: '', driverName: '', driverMobile: '', rate: r, grossAmount: calcGross(i.quantity, r), date: i.updatedAt?.split('T')[0] ?? '', invoiceNumber: '', remarks: '', partNumber: i.partNumber, category: i.category, condition: i.condition }; });
        const promoItems = toArr(res.promotional)
          .filter((i: any) => i.status === 'INWARD')
          .map((i: any) => { const r = i.price || i.rate || 0; return { id: i.id, itemType: 'promotional' as InwardItemType, itemName: i.name, itemCode: i.itemCode, quantity: i.quantity, unit: i.unit, vendorName: i.vendorName, vendorId: i.vendorId, transportName: i.transportName, driverName: i.driverName, driverMobile: i.driverMobile, rate: r, grossAmount: calcGross(i.quantity, r), date: i.updatedAt?.split('T')[0] ?? '', invoiceNumber: '', remarks: '' }; });
        const finishedItems = toArr(res.finished)
          .filter((i: any) => i.status === 'BOM')
          .map((i: any) => ({ id: i.id, itemType: 'finished_product' as InwardItemType, itemName: i.name, itemCode: i.sku, quantity: i.quantity ?? 0, unit: i.unit ?? 'KG', vendorName: '', vendorId: '', transportName: '', driverName: '', driverMobile: '', rate: i.rate ?? 0, grossAmount: i.grossAmount ?? 0, batchNo: i.batchNumber ?? '', date: i.updatedAt?.split('T')[0] ?? '', invoiceNumber: '', remarks: '' }));
        this.entries = [...rawItems, ...scrapItems, ...machineItems, ...promoItems, ...finishedItems];
        this.applyFilter();
        this.isLoading = false;
        if (event) { event.target.complete(); this.haptic.light(); }
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
      }
    });
  }

  applyFilter() {
    let data = [...this.entries];
    if (this.selectedFilter !== 'all') {
      data = data.filter(e => e.itemType === this.selectedFilter);
    }
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      data = data.filter(e =>
        e.itemName?.toLowerCase().includes(q) ||
        e.itemCode?.toLowerCase().includes(q) ||
        e.vendorName?.toLowerCase().includes(q) ||
        e.invoiceNumber?.toLowerCase().includes(q)
      );
    }
    // Month dropdown lists the months present in the current type/search results
    this.monthOptions = buildMonthOptions(
      data.map(e => e.date),
      this.dateFilter.preset === 'pickMonth' ? this.dateFilter.month : ''
    );
    const range = getDateRange(this.dateFilter);
    if (range) data = data.filter(e => isWithinRange(e.date, range));

    data.sort((a, b) => this.compareNewestFirst(a, b));
    this.filteredEntries = data;
    this.entrySections = this.buildSections(data);
  }

  // ── Accordion sections ────────────────────────────────────────
  private compareNewestFirst(a: InwardEntry, b: InwardEntry): number {
    return (b.date || '').localeCompare(a.date || '') || (b.id ?? 0) - (a.id ?? 0);
  }

  /** Groups already-sorted entries by item type; sections are ordered by their newest entry. */
  private buildSections(sorted: InwardEntry[]): InwardSection[] {
    const byType = new Map<InwardItemType, InwardEntry[]>();
    for (const e of sorted) {
      if (!byType.has(e.itemType)) byType.set(e.itemType, []);
      byType.get(e.itemType)!.push(e);
    }
    return Array.from(byType.entries())
      .map(([type, items]) => ({ type, items, latestDate: items[0]?.date ?? '' }))
      .sort((a, b) => this.compareNewestFirst(a.items[0], b.items[0]));
  }

  isSectionCollapsed(type: InwardItemType): boolean {
    return this.collapsedSections.has(type);
  }

  toggleSection(type: InwardItemType): void {
    if (this.collapsedSections.has(type)) this.collapsedSections.delete(type);
    else this.collapsedSections.add(type);
  }

  get allSectionsCollapsed(): boolean {
    return this.entrySections.length > 0 && this.entrySections.every(s => this.collapsedSections.has(s.type));
  }

  toggleAllSections(): void {
    if (this.allSectionsCollapsed) {
      this.collapsedSections.clear();
    } else {
      this.entrySections.forEach(s => this.collapsedSections.add(s.type));
    }
  }

  private isSearching(): boolean {
    return !!this.searchTerm.trim();
  }

  private sectionLimit(s: InwardSection): number {
    return this.sectionLimits.get(s.type) ?? this.sectionPageSize;
  }

  /** Cards to render for a section — capped for speed, but a search always shows every match. */
  getVisibleEntries(s: InwardSection): InwardEntry[] {
    return this.isSearching() ? s.items : s.items.slice(0, this.sectionLimit(s));
  }

  getHiddenCount(s: InwardSection): number {
    return this.isSearching() ? 0 : Math.max(0, s.items.length - this.sectionLimit(s));
  }

  canShowFewer(s: InwardSection): boolean {
    return !this.isSearching() && this.sectionLimit(s) > this.sectionPageSize;
  }

  showMoreEntries(s: InwardSection): void {
    this.sectionLimits.set(s.type, this.sectionLimit(s) + this.sectionPageSize);
  }

  showFewerEntries(s: InwardSection): void {
    this.sectionLimits.delete(s.type);
  }

  // ── Date filter ───────────────────────────────────────────────
  get isDateFilterActive(): boolean {
    return getDateRange(this.dateFilter) !== null;
  }

  onDateFilterChange(next: DateFilterState): void {
    this.dateFilter = next;
    this.sectionLimits.clear();
    this.applyFilter();
  }

  clearDateFilter(): void {
    this.onDateFilterChange({ ...EMPTY_DATE_FILTER });
  }

  openModal() {
    this.form = this.emptyForm();
    this.selectedType = null;
    this.resetValidationState();
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedType = null;
    this.selectedRawMaterialId = null;
    this.selectedPromotionalItemId = null;
    this.selectedScrapId = null;
    this.selectedMachinePartId = null;
    this.selectedFinishedProductId = null;
  }

  selectType(type: InwardItemType) {
    this.haptic.selectionChanged();
    this.selectedType = type;
    this.resetValidationState();
    this.form.itemType = type;
    this.form.itemName = '';
    this.form.itemCode = '';
    this.currentTaxRate = 0;
    this.form.grossAmount = 0;
    this.selectedRawMaterialId = null;
    this.selectedPromotionalItemId = null;
    this.selectedScrapId = null;
    this.selectedMachinePartId = null;
    this.selectedFinishedProductId = null;
    if (type === 'raw_material') {
      this.loadRawMaterials();
    } else if (type === 'scrap') {
      this.loadScrapItems();
    } else if (type === 'promotional') {
      this.loadPromotionalItems();
    } else if (type === 'spare_parts') {
      this.loadMachineParts();
    } else if (type === 'finished_product') {
      this.loadFinishedProducts();
    }
  }

  loadRawMaterials() {
    this.isLoadingRawMaterials = true;
    this.http.get<any[]>(`${environment.apiUrl}/products/raw-materials`, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.rawMaterials = Array.isArray(res) ? res : (res as any)?.data ?? [];
        this.isLoadingRawMaterials = false;
      },
      error: () => {
        this.isLoadingRawMaterials = false;
      }
    });
  }

  onRawMaterialSelect(id: string) {
    const mat = this.rawMaterials.find(m => String(m.id) === id);
    if (mat) {
      this.selectedRawMaterialId = mat.id ?? null;
      this.form.itemName = mat.name ?? '';
      this.form.itemCode = mat.materialCode ?? '';
      this.currentTaxRate = mat.taxRate ?? 0;
      if (mat.unit) {
        const matched = this.unitTypes.find(u => u.value === mat.unit);
        this.form.unit = matched ? matched.value : this.form.unit;
      }
      this.updateGrossAmount();
    }
  }

  loadScrapItems() {
    this.isLoadingScrapItems = true;
    this.http.get<any[]>(`${environment.apiUrl}/products/scrap-items`, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.scrapItems = Array.isArray(res) ? res : (res as any)?.data ?? [];
        this.isLoadingScrapItems = false;
      },
      error: () => {
        this.isLoadingScrapItems = false;
      }
    });
  }

  onScrapItemSelect(itemCode: string) {
    const item = this.scrapItems.find(s => String(s.materialCode ?? s.itemCode) === itemCode);
    if (item) {
      this.selectedScrapId = item.materialCode ?? item.itemCode ?? null;
      this.form.itemName = item.name ?? '';
      this.form.itemCode = item.materialCode ?? item.itemCode ?? '';
      this.currentTaxRate = item.gst ?? item.taxRate ?? 0;
      if (item.unit) {
        const matched = this.unitTypes.find(u => u.value === item.unit);
        this.form.unit = matched ? matched.value : this.form.unit;
      }
      this.updateGrossAmount();
    }
  }

  loadPromotionalItems() {
    this.isLoadingPromotionalItems = true;
    this.http.get<any[]>(`${environment.apiUrl}/products/promotional-items`, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.promotionalItems = Array.isArray(res) ? res : (res as any)?.data ?? [];
        this.isLoadingPromotionalItems = false;
      },
      error: () => {
        this.isLoadingPromotionalItems = false;
      }
    });
  }

  onPromotionalItemSelect(id: string) {
    const item = this.promotionalItems.find(p => String(p.id) === id);
    if (item) {
      this.selectedPromotionalItemId = item.id ?? null;
      this.form.itemName = item.name ?? '';
      this.form.itemCode = item.itemCode ?? '';
      this.currentTaxRate = item.gst ?? item.taxRate ?? 0;
      if (item.unit) {
        const matched = this.unitTypes.find(u => u.value === item.unit);
        this.form.unit = matched ? matched.value : this.form.unit;
      }
      this.updateGrossAmount();
    }
  }

  loadMachineParts() {
    this.isLoadingMachineParts = true;
    this.http.get<any[]>(`${environment.apiUrl}/products/machine-parts`, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.machineParts = Array.isArray(res) ? res : (res as any)?.data ?? [];
        this.isLoadingMachineParts = false;
      },
      error: () => {
        this.isLoadingMachineParts = false;
      }
    });
  }

  onMachinePartSelect(id: string) {
    const item = this.machineParts.find(m => String(m.id) === id);
    if (item) {
      this.selectedMachinePartId = String(item.id);
      this.form.itemName = item.name ?? '';
      this.form.itemCode = item.partNumber ?? '';
      this.form.partNumber = item.partNumber ?? '';
      this.form.vendor = item.vendor ?? '';
      this.form.category = item.category ?? 'MACHINE';
      this.form.condition = item.condition ?? 'NEW';
      this.form.purchaseDate = item.purchaseDate ?? '';
      this.form.warrantyExpiryDate = item.warrantyExpiryDate ?? '';
      this.currentTaxRate = item.gst ?? item.taxRate ?? 0;
      if (item.unit) {
        const matched = this.unitTypes.find(u => u.value === item.unit);
        this.form.unit = matched ? matched.value : this.form.unit;
      }
      this.updateGrossAmount();
    }
  }

  loadFinishedProducts() {
    this.isLoadingFinishedProducts = true;
    this.http.get<any>(`${environment.apiUrl}/products/finished-products`, { headers: this.headers() }).subscribe({
      next: (res) => {
        const all: any[] = Array.isArray(res) ? res : (res?.data ?? res?.content ?? []);
        this.finishedProducts = all;
        this.isLoadingFinishedProducts = false;
      },
      error: () => {
        this.isLoadingFinishedProducts = false;
      }
    });
  }

  onFinishedProductSelect(id: string) {
    const item = this.finishedProducts.find(p => String(p.id) === id);
    if (item) {
      this.selectedFinishedProductId = item.id;
      this.form.itemName = item.finishedProductName ?? item.name ?? '';
      this.form.itemCode = item.itemCode ?? item.bomName ?? '';
      this.form.unit = item.unit ?? item.outputUnit ?? 'KG';
      this.form.quantity = item.quantity ?? item.outputQuantity ?? 0;
    }
  }

  getTypeConfig(type: InwardItemType) {
    return this.itemTypes.find(t => t.type === type) ?? this.itemTypes[0];
  }

  openDetail(entry: InwardEntry) {
    this.selectedEntry = entry;
    this.isDetailOpen = true;
  }

  closeDetail() {
    this.isDetailOpen = false;
    this.selectedEntry = null;
    this.isEditMode = false;
    this.editForm = {};
  }

  openEditMode(): void {
    if (!this.selectedEntry) return;
    this.editForm = { ...this.selectedEntry };
    this.isEditMode = true;
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.editForm = {};
  }

  updateEditGrossAmount(): void {
    const base = (this.editForm.quantity || 0) * (this.editForm.rate || 0);
    this.editForm.grossAmount = parseFloat(base.toFixed(2));
  }

  submitEdit(): void {
    if (!this.selectedEntry?.id) {
      this.showToast('Cannot edit this entry (no ID found)', 'danger');
      return;
    }
    this.isEditSubmitting = true;
    const id = this.selectedEntry.id;
    const type = this.selectedEntry.itemType;
    let url = '';
    let payload: any = {};

    if (type === 'raw_material') {
      url = `${environment.apiUrl}/products/raw-materials/${id}`;
      payload = {
        quantity: this.editForm.quantity,
        rate: this.editForm.rate ?? 0,
        price: this.editForm.rate ?? 0,
        grossAmount: 0,
        vendorName: this.editForm.vendorName,
        vendorId: this.editForm.vendorId,
        transportName: this.editForm.transportName,
        driverName: this.editForm.driverName,
        driverMobile: this.editForm.driverMobile,
        remarks: this.editForm.remarks,
      };
    } else if (type === 'promotional') {
      url = `${environment.apiUrl}/products/promotional-items/${id}`;
      payload = {
        quantity: this.editForm.quantity,
        rate: this.editForm.rate ?? 0,
        price: this.editForm.rate ?? 0,
        grossAmount: 0,
        vendorName: this.editForm.vendorName,
        vendorId: this.editForm.vendorId,
        transportName: this.editForm.transportName,
        driverName: this.editForm.driverName,
        driverMobile: this.editForm.driverMobile,
        remarks: this.editForm.remarks,
      };
    } else if (type === 'scrap') {
      url = `${environment.apiUrl}/products/scrap-items/${id}`;
      payload = {
        quantity: this.editForm.quantity,
        rate: this.editForm.rate ?? 0,
        price: this.editForm.rate ?? 0,
        grossAmount: 0,
        vendorName: this.editForm.vendorName,
        transportName: this.editForm.transportName,
        driverName: this.editForm.driverName,
        driverMobile: this.editForm.driverMobile,
      };
    } else if (type === 'spare_parts') {
      url = `${environment.apiUrl}/products/machine-parts/${id}`;
      payload = {
        quantity: this.editForm.quantity,
        vendor: this.editForm.vendor,
        category: this.editForm.category,
        condition: this.editForm.condition,
        purchaseDate: this.editForm.purchaseDate ? this.toDateTimeStr(this.editForm.purchaseDate) : null,
        warrantyExpiryDate: this.editForm.warrantyExpiryDate ? this.toDateTimeStr(this.editForm.warrantyExpiryDate) : null,
      };
    } else {
      this.showToast('Editing not supported for this type', 'warning');
      this.isEditSubmitting = false;
      return;
    }

    this.http.patch<any>(url, payload, { headers: this.headers() }).subscribe({
      next: () => {
        this.isEditSubmitting = false;
        this.showToast('Update submitted for approval', 'success');
        this.closeDetail();
        this.loadEntries();
      },
      error: (err) => {
        this.isEditSubmitting = false;
        const msg = err?.error?.message ?? err?.error?.error ?? 'Failed to submit update';
        this.showToast(msg, 'danger');
      }
    });
  }

  getUnitShort(): string {
    return this.unitTypes.find(u => u.value === this.form.unit)?.short ?? this.form.unit;
  }

  getQuantityUnit(entry: InwardEntry | null | undefined): string {
    if (!entry) return 'units';
    return entry.itemType === 'finished_product' ? 'Bags' : (entry.unit || 'units');
  }

  private toDateTimeStr(d: string): string {
    return d ? `${d}T00:00:00` : '';
  }

  /** True once the user has tried to save — every invalid field is then highlighted. */
  submitAttempted = false;

  /** Fields the user has already visited and left (blurred) — these show their error straight away. */
  private touchedFields = new Set<string>();

  private readonly fieldLabels: Record<string, string> = {
    itemName: 'Material Name', itemCode: 'Material Code', quantity: 'Quantity', rate: 'Rate',
    batchNo: 'Batch No', partNumber: 'Part Number', category: 'Category', vendor: 'Vendor',
    purchaseDate: 'Purchase Date', warrantyExpiryDate: 'Warranty Expiry', condition: 'Condition',
    transportName: 'Transport Name', driverName: 'Driver Name', driverMobile: 'Driver Mobile',
    vendorName: 'Vendor Name', vendorId: 'Vendor ID', invoiceNumber: 'Invoice No.', date: 'Date',
    remarks: 'Remarks', unit: 'Unit Type',
  };

  /**
   * Every field in the Create Inward form is mandatory. Returns a map of
   * field key -> SHORT error message (it is shown on the field's label line)
   * for the fields that apply to the selected type.
   */
  getFormErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    const f = this.form;
    const type = this.selectedType;
    if (!type) return e;

    const blank = (v: unknown) => v === null || v === undefined || String(v).trim() === '';

    if (blank(f.itemName)) e['itemName'] = 'Select an item';
    if (blank(f.quantity) || Number(f.quantity) <= 0) e['quantity'] = blank(f.quantity) ? 'Required' : 'Must be > 0';

    if (type === 'finished_product') {
      if (blank(f.batchNo)) e['batchNo'] = 'Required';
      return e;
    }

    if (type === 'spare_parts') {
      if (blank(f.partNumber)) e['partNumber'] = 'Required';
      if (blank(f.category)) e['category'] = 'Required';
      if (blank(f.vendor)) e['vendor'] = 'Required';
      if (blank(f.purchaseDate)) e['purchaseDate'] = 'Required';
      if (blank(f.warrantyExpiryDate)) e['warrantyExpiryDate'] = 'Required';
      else if (!blank(f.purchaseDate) && f.warrantyExpiryDate! < f.purchaseDate!) {
        e['warrantyExpiryDate'] = 'Before purchase date';
      }
      if (blank(f.condition)) e['condition'] = 'Required';
      return e;
    }

    // raw_material, scrap, promotional (and any other type with rate + logistics)
    if (blank(f.itemCode)) e['itemCode'] = 'Required';
    if (blank(f.unit)) e['unit'] = 'Required';
    if (blank(f.rate)) e['rate'] = 'Required';
    else if (Number(f.rate) <= 0) e['rate'] = 'Must be > 0';
    if (blank(f.transportName)) e['transportName'] = 'Required';
    if (blank(f.driverName)) e['driverName'] = 'Required';
    if (blank(f.driverMobile)) e['driverMobile'] = 'Required';
    else if (!/^\d{10}$/.test(String(f.driverMobile).trim())) e['driverMobile'] = 'Enter 10 digits';
    if (blank(f.vendorName)) e['vendorName'] = 'Required';
    if (blank(f.vendorId)) e['vendorId'] = 'Required';
    if (blank(f.invoiceNumber)) e['invoiceNumber'] = 'Required';
    if (blank(f.date)) e['date'] = 'Required';
    if (blank(f.remarks)) e['remarks'] = 'Required';
    return e;
  }

  /** Called when focus leaves a field — from then on that field validates live. */
  touchField(key: string): void {
    this.touchedFields.add(key);
  }

  /** Whether a field should currently render in its error state (visited-and-invalid, or after a Save attempt). */
  hasError(key: string): boolean {
    return (this.submitAttempted || this.touchedFields.has(key)) && !!this.getFormErrors()[key];
  }

  /** Short message for the field's label line. */
  fieldError(key: string): string {
    return this.getFormErrors()[key] ?? '';
  }

  private resetValidationState(): void {
    this.submitAttempted = false;
    this.touchedFields.clear();
  }

  /** Full-sentence version of a field error, for the toast. */
  private describeError(key: string, msg: string): string {
    if (key === 'itemName') return 'Please select an item';
    const label = this.fieldLabels[key] ?? key;
    return msg === 'Required' ? `${label} is required` : `${label}: ${msg}`;
  }

  /** First invalid field in on-screen order (not object-key order). */
  private firstInvalidKey(errors: Record<string, string>): string {
    const el = Array.from(document.querySelectorAll<HTMLElement>('[data-field]'))
      .find(node => !!errors[node.dataset['field'] ?? '']);
    return el?.dataset['field'] ?? Object.keys(errors)[0];
  }

  /** Scrolls the field into view and puts the cursor in it. */
  private focusField(key: string): void {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${key}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
    });
  }

  submitEntry() {
    if (!this.selectedType) { this.showToast('Please select an item type', 'warning'); return; }

    this.submitAttempted = true;
    const errors = this.getFormErrors();
    const keys = Object.keys(errors);
    if (keys.length) {
      const first = this.firstInvalidKey(errors);
      const extra = keys.length > 1 ? ` (+${keys.length - 1} more field${keys.length > 2 ? 's' : ''})` : '';
      this.showToast(this.describeError(first, errors[first]) + extra, 'warning');
      this.focusField(first);
      return;
    }

    this.haptic.heavy();
    this.isSubmitting = true;

    if (this.selectedType === 'raw_material') {
      if (!this.selectedRawMaterialId) {
        this.showToast('Please select a raw material', 'danger');
        this.isSubmitting = false;
        return;
      }
      const payload = {
        name: this.form.itemName,
        materialCode: this.form.itemCode,
        unit: this.form.unit,
        price: this.form.rate ?? 0,
        quantity: this.form.quantity,
        minimumThreshold: 0,
        rate: this.form.rate ?? 0,
        grossAmount: 0,
        vendorId: this.form.vendorId,
        vendorName: this.form.vendorName,
        transportName: this.form.transportName,
        driverName: this.form.driverName,
        driverMobile: this.form.driverMobile,
        status: 'INWARD'
      };
      this.http.put<any>(`${environment.apiUrl}/products/raw-materials/${this.selectedRawMaterialId}`, payload, { headers: this.headers() }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.showToast('Raw material updated successfully', 'success');
          this.loadEntries();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message ?? err?.error?.error ?? 'Failed to update raw material';
          this.showToast(msg, 'danger');
        }
      });
      return;
    }

    if (this.selectedType === 'promotional') {
      if (!this.selectedPromotionalItemId) {
        this.showToast('Please select a promotional item', 'danger');
        this.isSubmitting = false;
        return;
      }
      const payload = {
        name: this.form.itemName,
        itemCode: this.form.itemCode,
        unit: this.form.unit,
        price: this.form.rate ?? 0,
        quantity: this.form.quantity,
        minimumThreshold: 0,
        rate: this.form.rate ?? 0,
        grossAmount: 0,
        vendorId: this.form.vendorId,
        vendorName: this.form.vendorName,
        transportName: this.form.transportName,
        driverName: this.form.driverName,
        driverMobile: this.form.driverMobile,
        status: 'INWARD'
      };
      this.http.put<any>(`${environment.apiUrl}/products/promotional-items/${this.selectedPromotionalItemId}`, payload, { headers: this.headers() }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.showToast('Promotional item updated successfully', 'success');
          this.loadEntries();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message ?? err?.error?.error ?? 'Failed to update promotional item';
          this.showToast(msg, 'danger');
        }
      });
      return;
    }

    if (this.selectedType === 'scrap') {
      if (!this.selectedScrapId) {
        this.showToast('Please select a scrap item', 'danger');
        this.isSubmitting = false;
        return;
      }
      const payload = {
        name: this.form.itemName,
        itemCode: this.form.itemCode,
        unit: this.form.unit,
        price: this.form.rate ?? 0,
        quantity: this.form.quantity,
        minimumThreshold: 0,
        rate: this.form.rate ?? 0,
        grossAmount: 0,
        vendorId: this.form.vendorId,
        vendorName: this.form.vendorName,
        transportName: this.form.transportName,
        driverName: this.form.driverName,
        driverMobile: this.form.driverMobile,
        status: 'INWARD'
      };
      this.http.put<any>(`${environment.apiUrl}/products/scrap-items/sku/${encodeURIComponent(this.selectedScrapId)}`, payload, { headers: this.headers() }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.showToast('Scrap item updated successfully', 'success');
          this.loadEntries();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message ?? err?.error?.error ?? 'Failed to update scrap item';
          this.showToast(msg, 'danger');
        }
      });
      return;
    }

    if (this.selectedType === 'finished_product') {
      if (!this.selectedFinishedProductId) {
        this.showToast('Please select a finished product', 'danger');
        this.isSubmitting = false;
        return;
      }
      const payload = {
        finishedProductName: this.form.itemName,
        quantity: this.form.quantity,
        minimumThreshold: 0,
        batchNumber: this.form.batchNo ?? '',
        grossAmount: 0
      };
      this.http.post<any>(`${environment.apiUrl}/bill-of-materials/produce`, payload, { headers: this.headers() }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.showToast('Finished product produced successfully', 'success');
          this.loadEntries();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message ?? err?.error?.error ?? 'Failed to produce finished product';
          this.showToast(msg, 'danger');
        }
      });
      return;
    }

    if (this.selectedType === 'spare_parts') {
      if (!this.selectedMachinePartId) {
        this.showToast('Please select a spare part', 'danger');
        this.isSubmitting = false;
        return;
      }
      const payload = {
        name: this.form.itemName,
        itemCode: this.form.itemCode || this.selectedMachinePartId,
        category: this.form.category ?? 'MACHINE',
        vendor: this.form.vendor,
        purchaseDate: this.toDateTimeStr(this.form.purchaseDate ?? ''),
        warrantyExpiryDate: this.form.warrantyExpiryDate ? this.toDateTimeStr(this.form.warrantyExpiryDate) : null,
        quantity: this.form.quantity,
        condition: this.form.condition ?? 'NEW',
        status: 'INWARD'
      };
      this.http.put<any>(`${environment.apiUrl}/products/machine-parts/${this.selectedMachinePartId}`, payload, { headers: this.headers() }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.showToast('Machine part updated successfully', 'success');
          this.loadEntries();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message ?? err?.error?.error ?? 'Failed to update machine part';
          this.showToast(msg, 'danger');
        }
      });
      return;
    }

    const payload = { ...this.form };

    this.http.post<any>(`${environment.apiUrl}/inward`, payload, { headers: this.headers() }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeModal();
        this.showToast('Inward entry created successfully', 'success');
        this.loadEntries();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message ?? err?.error?.error ?? 'Failed to create entry';
        this.showToast(msg, 'danger');
      }
    });
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    // Central feedback funnel — fire the matching notification haptic.
    if (color === 'success') { this.haptic.success(); this.keyboard.dismiss(); }
    else if (color === 'warning') this.haptic.warning();
    else this.haptic.error();

    const toast = await this.toastController.create({ message, duration: 3000, position: 'top', color });
    await toast.present();
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
