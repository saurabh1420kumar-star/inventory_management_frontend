import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Auth } from '../services/auth';
import { environment } from '../../environments/environment';
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
  IonButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent
} from '@ionic/angular/standalone';

import {
  OutwardInventoryService,
  OutwardRecord,
  OutwardGivingPayload,
  OutwardItemResponse
} from '../services/outward-inventory.service';
import { InventoryService, InventoryItem } from '../services/inventory';
import { UserService } from '../services/user.service';
import { DistributorDto, DistributorService } from '../services/distributor.service';
import { SalesHierarchyService } from '../services/sales-hierarchy.service';
import { Toast } from '../services/toast';
import { User } from '../models/user.model';

export type ModalItemType = 'spare_parts' | 'promotional_items' | 'scrap_material';
export type SpareSection = 'outward_giving' | 'returned_part';
export type ScrapSection = 'returned_part' | 'selling_scrap';
export type UnitType = 'KG' | 'DOZEN' | 'PIECE' | 'LITER';

interface DropdownOption {
  value: string | number;
  label: string;
}

interface PersonOption {
  id: number;
  name: string;
}

interface DistributorOption {
  id: number;
  label: string;
}

type PromoPartyType = 'employee' | 'distributor' | 'salesperson';

@Component({
  selector: 'app-outward-inventory',
  standalone: true,
  templateUrl: './outward-inventory.page.html',
  styleUrls: ['./outward-inventory.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonMenuButton, IonButton, IonIcon,
    IonSpinner, IonRefresher, IonRefresherContent,
    NgIf, NgFor, NgClass, DatePipe
  ]
})
export class OutwardInventoryPage implements OnInit {

  // â”€â”€â”€ state flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  isLoading = false;
  isSubmitting = false;

  /** single unified modal */
  isModalOpen = false;

  selectedItemType: ModalItemType | null = null;

  /** active sub-section within the form modal */
  activeSpareSection: SpareSection = 'outward_giving';
  activeScrapSection: ScrapSection = 'returned_part';

  /** master inventory items for select dropdowns */
  masterItems: InventoryItem[] = [];

  /** spare parts dropdown source from /products/machine-parts */
  sparePartItems: InventoryItem[] = [];

  /** promotional items dropdown source from /products/promotional-items */
  promotionalItems: InventoryItem[] = [];

  promotionalEmployees: PersonOption[] = [];
  promotionalDistributors: DistributorOption[] = [];
  promotionalSalespersons: PersonOption[] = [];
  promoPartySelectionError = false;

  /** scrap items dropdown source from /products/scrap-items */
  scrapItems: InventoryItem[] = [];

  /** outward-items filtered by item type for scrap selection */
  scrapOutwardItems: OutwardItemResponse[] = [];

  /** all outward records for the list */
  records: OutwardRecord[] = [];
  filteredRecords: OutwardRecord[] = [];
  searchTerm = '';
  activeFilter: 'all' | ModalItemType | 'raw_material' | 'finished_product' = 'all';

  // Product catalog cards
  rawProductCards: any[] = [];
  finishedProductCards: any[] = [];
  filteredProductCards: any[] = [];
  isLoadingProducts = false;

  // Detail modal
  selectedRecord: any = null;
  isDetailOpen = false;

  // â”€â”€â”€ forms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  spareOutwardForm!: FormGroup;
  spareReturnedForm!: FormGroup;
  promoOutwardForm!: FormGroup;
  promoReturnedForm!: FormGroup;
  scrapReturnedForm!: FormGroup;
  scrapSellingForm!: FormGroup;

  private fb = inject(FormBuilder);
  private outwardService = inject(OutwardInventoryService);
  private inventoryService = inject(InventoryService);
  private userService = inject(UserService);
  private distributorService = inject(DistributorService);
  private salesHierarchyService = inject(SalesHierarchyService);
  private toast = inject(Toast);
  private http = inject(HttpClient);
  private auth = inject(Auth);

  // â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  readonly itemTypes = [
    {
      key: 'spare_parts' as ModalItemType,
      label: 'Spare Parts',
      icon: 'build-outline',
      activeBorder: 'border-orange-500',
      activeBg: 'bg-orange-50',
      activeRing: 'ring-2 ring-orange-200',
      activeIconBg: 'bg-orange-500',
      activeIconColor: 'text-white',
      activeText: 'text-orange-700',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500'
    },
    {
      key: 'promotional_items' as ModalItemType,
      label: 'Promotional Items',
      icon: 'gift-outline',
      activeBorder: 'border-purple-500',
      activeBg: 'bg-purple-50',
      activeRing: 'ring-2 ring-purple-200',
      activeIconBg: 'bg-purple-500',
      activeIconColor: 'text-white',
      activeText: 'text-purple-700',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-500'
    },
    {
      key: 'scrap_material' as ModalItemType,
      label: 'Scrap Material',
      icon: 'trash-outline',
      activeBorder: 'border-rose-500',
      activeBg: 'bg-rose-50',
      activeRing: 'ring-2 ring-rose-200',
      activeIconBg: 'bg-rose-500',
      activeIconColor: 'text-white',
      activeText: 'text-rose-700',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-500'
    }
  ];

  readonly unitOptions: { key: UnitType; label: string; icon: string }[] = [
    { key: 'KG',    label: 'Kilograms', icon: 'barbell-outline' },
    { key: 'DOZEN', label: 'Dozens',    icon: 'grid-outline' },
    { key: 'PIECE', label: 'Pieces',    icon: 'albums-outline' },
    { key: 'LITER', label: 'Litres',    icon: 'beaker-outline' }
  ];

  readonly quantityOptions: DropdownOption[] = Array.from({ length: 50 }, (_, index) => ({
    value: index + 1,
    label: `${index + 1}`
  }));

  readonly quotedPriceOptions: DropdownOption[] = [0, 100, 250, 500, 1000, 1500, 2000, 5000, 10000].map(value => ({
    value,
    label: `Rs. ${value}`
  }));

  readonly filterTabs: { key: 'all' | ModalItemType | 'raw_material' | 'finished_product'; label: string }[] = [
    { key: 'all',               label: 'All' },
    { key: 'raw_material',      label: 'Raw Materials' },
    { key: 'finished_product',  label: 'Finished Products' },
    { key: 'spare_parts',       label: 'Spare Parts' },
    { key: 'promotional_items', label: 'Promo Items' },
    { key: 'scrap_material',    label: 'Scrap' }
  ];

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ngOnInit(): void {
    this.initForms();
    this.loadData();
  }

  private initForms(): void {
    this.spareOutwardForm = this.fb.group({
      matCode:  ['', Validators.required],
      matName:  ['', Validators.required],
      unit:     ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]],
      comments: ['']
    });

    this.spareReturnedForm = this.fb.group({
      matCode:  ['', Validators.required],
      matName:  ['', Validators.required],
      unit:     ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]],
      comments: ['']
    });

    this.promoOutwardForm = this.fb.group({
      matCode:  ['', Validators.required],
      matName:  ['', Validators.required],
      employeeId: [null],
      employeeName: [''],
      distributorId: [null],
      distributorName: [''],
      salespersonId: [null],
      salespersonName: [''],
      unit:     ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]],
      comments: ['']
    });

    this.promoReturnedForm = this.fb.group({
      matCode:  ['', Validators.required],
      matName:  ['', Validators.required],
      unit:     ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]],
      comments: ['']
    });

    this.scrapReturnedForm = this.fb.group({
      matCode:  ['', Validators.required],
      matName:  ['', Validators.required],
      unit:     ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]],
      comments: ['']
    });

    this.scrapSellingForm = this.fb.group({
      matCode:           ['', Validators.required],
      matName:           ['', Validators.required],
      unit:              ['', Validators.required],
      quantity:          [null, [Validators.required, Validators.min(1)]],
      desiredQuotedPrice:['', [Validators.required, Validators.min(0)]],
      comments:          ['']
    });
  }

  private loadData(): void {
    this.isLoading = true;
    this.outwardService.getAllOutwardItems().subscribe({
      next: (data) => {
        this.records = data.map(item => this.mapApiToRecord(item));
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });

    this.inventoryService.getAllItems().subscribe({
      next: (items) => { this.masterItems = items; }
    });

    this.loadProductCards();
  }

  private loadProductCards(): void {
    this.isLoadingProducts = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
    forkJoin({
      raw: this.http.get<any>(`${environment.apiUrl}/products/raw-materials`, { headers }),
      finished: this.http.get<any>(`${environment.apiUrl}/products/finished-products`, { headers })
    }).subscribe({
      next: (res) => {
        const toArr = (r: any) => Array.isArray(r) ? r : (r?.data ?? []);
        this.rawProductCards = toArr(res.raw).map((i: any) => ({
          _cardType: 'raw_material',
          id: i.id,
          name: i.name || i.materialName || '—',
          code: i.materialCode || i.itemCode || i.code || '—',
          quantity: i.quantity ?? 0,
          unit: i.unit || '',
          vendorName: i.vendorName || '',
          vendorId: i.vendorId || '',
          status: i.status || '',
          minimumThreshold: i.minimumThreshold ?? 0,
          price: i.price ?? null,
          transportName: i.transportName || '',
          driverName: i.driverName || '',
          driverMobile: i.driverMobile || '',
          createdAt: i.createdAt || i.updatedAt || '',
          _raw: i
        }));
        this.finishedProductCards = toArr(res.finished).map((i: any) => ({
          _cardType: 'finished_product',
          id: i.id,
          name: i.finishedProductName || i.name || i.productName || '—',
          code: i.productCode || i.itemCode || i.materialCode || i.code || '—',
          quantity: i.quantity ?? 0,
          unit: i.unit || '',
          description: i.description || '',
          price: i.price || i.sellingPrice || null,
          status: i.status || '',
          minimumThreshold: i.minimumThreshold ?? 0,
          createdAt: i.createdAt || i.updatedAt || '',
          _raw: i
        }));
        this.isLoadingProducts = false;
        this.applyFilter();
      },
      error: () => { this.isLoadingProducts = false; }
    });
  }

  private mapApiToRecord(item: OutwardItemResponse): OutwardRecord {
    const typeMap: Record<string, 'spare_parts' | 'promotional_items' | 'scrap_material'> = {
      SPARE_PARTS: 'spare_parts',
      PROMOTIONAL_ITEMS: 'promotional_items',
      SCRAP_MATERIAL: 'scrap_material'
    };
    const sectionMap: Record<string, 'outward_giving' | 'returned_part' | 'selling_scrap'> = {
      OUTWARD_GIVING: 'outward_giving',
      RETURNED_PART: 'returned_part'
    };
    const unitMap: Record<string, 'KG' | 'DOZEN' | 'PIECE' | 'LITER'> = {
      KILOGRAMS: 'KG', KILOGRAM: 'KG', KG: 'KG',
      DOZENS: 'DOZEN', DOZEN: 'DOZEN',
      PIECES: 'PIECE', PIECE: 'PIECE',
      LITRES: 'LITER', LITERS: 'LITER', LITER: 'LITER'
    };
    return {
      id: item.id,
      itemType: typeMap[item.itemType] ?? 'spare_parts',
      section: sectionMap[item.transactionType] ?? 'outward_giving',
      matCode: item.materialCode,
      matName: item.materialName,
      unit: unitMap[(item.unit ?? '').toUpperCase()] ?? 'KG',
      quantity: item.quantity,
      desiredQuotedPrice: item.quotedSellingPrice,
      comments: item.comments,
      createdAt: item.createdAt ?? new Date().toISOString(),
      updatedAt: item.updatedAt,
      issuedTo: item.issuedTo ?? undefined,
      referenceNumber: item.referenceNumber ?? undefined
    };
  }

  // â”€â”€â”€ filter / search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  applyFilter(): void {
    // Outward transaction records (spare_parts, promotional_items, scrap_material only)
    let data = [...this.records];
    if (this.activeFilter === 'raw_material' || this.activeFilter === 'finished_product') {
      data = [];
    } else if (this.activeFilter !== 'all') {
      data = data.filter(r => r.itemType === this.activeFilter);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(r =>
        r.matName?.toLowerCase().includes(term) ||
        r.matCode?.toLowerCase().includes(term)
      );
    }
    this.filteredRecords = data;

    // Product catalog cards
    let products: any[] = [];
    if (this.activeFilter === 'all') {
      products = [...this.rawProductCards, ...this.finishedProductCards];
    } else if (this.activeFilter === 'raw_material') {
      products = [...this.rawProductCards];
    } else if (this.activeFilter === 'finished_product') {
      products = [...this.finishedProductCards];
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      products = products.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term)
      );
    }
    this.filteredProductCards = products;
  }

  openDetail(r: any): void {
    this.selectedRecord = r;
    this.isDetailOpen = true;
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.selectedRecord = null;
  }

  setFilter(f: 'all' | ModalItemType | 'raw_material' | 'finished_product'): void {
    this.activeFilter = f;
    this.applyFilter();
  }

  // â”€â”€â”€ modal flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  openModal(): void {
    this.selectedItemType = null;
    this.activeSpareSection = 'outward_giving';
    this.activeScrapSection = 'returned_part';
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedItemType = null;
    this.promoPartySelectionError = false;
    this.resetForms();
  }

  selectType(type: ModalItemType): void {
    this.selectedItemType = type;
    this.activeSpareSection = 'outward_giving';
    this.activeScrapSection = 'returned_part';

    if (type === 'spare_parts') {
      this.loadSparePartItems();
    } else if (type === 'promotional_items') {
      this.loadPromotionalItems();
    } else if (type === 'scrap_material') {
      this.loadScrapItems();
    }
  }

  private loadSparePartItems(): void {
    if (this.sparePartItems.length > 0) return;

    this.inventoryService.getMachineParts().subscribe({
      next: (items) => {
        this.sparePartItems = items;
      }
    });
  }

  private loadPromotionalItems(): void {
    if (this.promotionalItems.length > 0) {
      this.loadPromotionalReferenceData();
      return;
    }

    this.inventoryService.getPromotionalItems().subscribe({
      next: (items) => {
        this.promotionalItems = items;
      }
    });

    this.loadPromotionalReferenceData();
  }

  private loadPromotionalReferenceData(): void {
    if (!this.promotionalEmployees.length) {
      this.userService.getAllUsers().subscribe({
        next: (users) => {
          this.promotionalEmployees = (users || [])
            .filter((user: User) => !!user?.id)
            .map((user: User) => ({
              id: user.id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
            }))
            .filter((user) => !!user.name)
            .sort((left, right) => left.name.localeCompare(right.name));
        }
      });
    }

    if (!this.promotionalDistributors.length) {
      this.distributorService.getAllDistributors().subscribe({
        next: (response) => {
          const responseData: any = response;
          const distributors = Array.isArray(responseData)
            ? responseData
            : Array.isArray(responseData?.data)
              ? responseData.data
              : Array.isArray(responseData?.data?.content)
                ? responseData.data.content
                : [];

          this.promotionalDistributors = (distributors as DistributorDto[])
            .filter((distributor) => !!distributor?.id)
            .map((distributor) => ({
              id: distributor.id,
              label: `${distributor.firmName || distributor.name || 'Unknown Distributor'} - ${
                distributor.distributorCode || (distributor as any).code || (distributor as any).distributor_code || 'N/A'
              }`
            }))
            .sort((left, right) => left.label.localeCompare(right.label));
        }
      });
    }

    if (!this.promotionalSalespersons.length) {
      this.salesHierarchyService.getAllSalesPersons().subscribe({
        next: (salespersons: any[]) => {
          const mappedSalespersons = Array.isArray(salespersons)
            ? salespersons
            : [];

          this.promotionalSalespersons = mappedSalespersons
            .filter((person: any) => !!person?.id)
            .map((person: any) => ({
              id: Number(person.id),
              name: `${person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown'} - ${
                person.employeeRollNo || person.employeeCode || person.employeeCodeNo || person.id
              }`
            }))
            .sort((left: PersonOption, right: PersonOption) => left.name.localeCompare(right.name));
        }
      });
    }
  }

  private loadScrapItems(): void {
    if (this.scrapOutwardItems.length > 0 || this.scrapItems.length > 0) return;

    this.outwardService.getOutwardScrapItems().subscribe({
      next: (items) => {
        this.scrapOutwardItems = items;
      },
      error: () => {
        this.inventoryService.getScrapItems().subscribe({
          next: (items) => {
            this.scrapItems = items;
          }
        });
      }
    });
  }

  getSparePartOptions(): { code: string; name: string; unit?: UnitType; quantity?: number; price?: number }[] {
    return this.sparePartItems
      .filter(item => !!item.name)
      .map(item => ({
        code: item.partNumber || item.partCode || item.itemCode || `PART-${item.id}`,
        name: item.name,
        unit: this.normalizeUnit(item.unit),
        quantity: (item as any).quantity
      }));
  }

  getPromotionalItemOptions(): { code: string; name: string; unit?: UnitType; quantity?: number; price?: number }[] {
    return this.promotionalItems
      .filter(item => item.itemCode && item.name)
      .map(item => {
        const rawPrice = (item as any).price;
        const parsedPrice = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice);

        return {
          code: item.itemCode!,
          name: item.name,
          unit: this.normalizeUnit(item.unit),
          quantity: (item as any).quantity,
          price: Number.isFinite(parsedPrice) ? parsedPrice : undefined
        };
      });
  }

  getScrapItemOptions(): { code: string; name: string; unit?: UnitType; quantity?: number; price?: number }[] {
    if (this.scrapOutwardItems.length) {
      const preferredScrapItems = this.scrapOutwardItems.filter(item => item.itemType === 'SCRAP_MATERIAL');
      const outwardSource = preferredScrapItems.length ? preferredScrapItems : this.scrapOutwardItems;

      return outwardSource
        .filter(item => !!item.materialName)
        .map(item => ({
          code: item.materialCode || `SCRAP-${item.id}`,
          name: item.materialName,
          unit: this.normalizeUnit(item.unit),
          quantity: item.quantity,
          price: typeof item.quotedSellingPrice === 'number' ? item.quotedSellingPrice : undefined
        }));
    }

    return this.scrapItems
      .filter(item => (item.itemCode || item.materialCode || item.sku || item.partCode) && item.name)
      .map(item => ({
        code: item.itemCode || item.materialCode || item.sku || item.partCode || '',
        name: item.name,
        unit: this.normalizeUnit(item.unit),
        quantity: (item as any).quantity
      }));
  }

  setUnit(form: FormGroup, unit: UnitType): void {
    form.patchValue({ unit });
  }

  getMaterialOptions(): { code: string; name: string; unit?: UnitType; quantity?: number; price?: number }[] {
    return this.masterItems
      .map(item => ({
        code: this.getItemCode(item),
        name: item.name,
        unit: this.normalizeUnit(item.unit),
        quantity: (item as any).quantity,
        price: item.price
      }))
      .filter(item => !!item.code && !!item.name);
  }

  private resetForms(): void {
    this.spareOutwardForm.reset();
    this.spareReturnedForm.reset();
    this.promoOutwardForm.reset();
    this.updatePromotionalPartySelection(null);
    this.promoReturnedForm.reset();
    this.scrapReturnedForm.reset();
    this.scrapSellingForm.reset();
  }

  // â”€â”€â”€ auto-fill mat name when code typed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  onMatCodeChange(code: string, form: FormGroup): void {
    const sourceOptions = this.selectedItemType === 'spare_parts'
      ? this.getSparePartOptions()
      : this.selectedItemType === 'promotional_items'
        ? this.getPromotionalItemOptions()
        : this.selectedItemType === 'scrap_material'
          ? this.getScrapItemOptions()
          : this.getMaterialOptions();
    const item = sourceOptions.find(option => option.code === code);
    if (!item) return;

    const patchValue: {
      matCode: string;
      matName: string;
      unit?: UnitType;
      quantity?: number;
      quotedSellingPrice?: number;
      desiredQuotedPrice?: number;
    } = {
      matCode: item.code,
      matName: item.name
    };

    if (item.unit) {
      patchValue.unit = item.unit;
    }

    if (this.selectedItemType === 'spare_parts' && typeof item.quantity === 'number') {
      patchValue.quantity = item.quantity;
    }

    if (this.selectedItemType === 'scrap_material' && typeof item.quantity === 'number') {
      patchValue.quantity = item.quantity;
    }

    if (this.selectedItemType === 'promotional_items' && typeof item.price === 'number' && form.get('quotedSellingPrice')) {
      patchValue.quotedSellingPrice = item.price;
    }

    if (this.selectedItemType === 'scrap_material' && typeof item.price === 'number' && form.get('desiredQuotedPrice')) {
      patchValue.desiredQuotedPrice = item.price;
    }

    form.patchValue(patchValue);
  }

  onMatNameChange(name: string, form: FormGroup): void {
    const sourceOptions = this.selectedItemType === 'spare_parts'
      ? this.getSparePartOptions()
      : this.selectedItemType === 'promotional_items'
        ? this.getPromotionalItemOptions()
        : this.selectedItemType === 'scrap_material'
          ? this.getScrapItemOptions()
          : this.getMaterialOptions();
    const item = sourceOptions.find(option => option.name === name);
    if (!item) return;

    const patchValue: {
      matCode: string;
      matName: string;
      unit?: UnitType;
      quantity?: number;
      desiredQuotedPrice?: number;
    } = {
      matCode: item.code,
      matName: item.name
    };

    if (item.unit) {
      patchValue.unit = item.unit;
    }

    if (typeof item.quantity === 'number') {
      patchValue.quantity = item.quantity;
    }

    if (this.selectedItemType === 'scrap_material' && typeof item.price === 'number' && form.get('desiredQuotedPrice')) {
      patchValue.desiredQuotedPrice = item.price;
    }

    form.patchValue(patchValue);
  }

  onEmployeeChange(employeeId: string | number): void {
    const rawValue = String(employeeId ?? '').trim();
    if (!rawValue || rawValue === 'null') {
      this.promoOutwardForm.patchValue({ employeeId: null, employeeName: '' });
      this.updatePromotionalPartySelection(null);
      return;
    }

    const selectedId = Number(rawValue);
    const employee = this.promotionalEmployees.find((option) => option.id === selectedId);
    this.promoOutwardForm.patchValue({
      employeeId: Number.isFinite(selectedId) ? selectedId : null,
      employeeName: employee?.name || ''
    });
    this.updatePromotionalPartySelection(Number.isFinite(selectedId) ? 'employee' : null);
  }

  onDistributorChange(distributorId: string | number): void {
    const rawValue = String(distributorId ?? '').trim();
    if (!rawValue || rawValue === 'null') {
      this.promoOutwardForm.patchValue({ distributorId: null, distributorName: '' });
      this.updatePromotionalPartySelection(null);
      return;
    }

    const selectedId = Number(rawValue);
    const distributor = this.promotionalDistributors.find((option) => option.id === selectedId);
    this.promoOutwardForm.patchValue({
      distributorId: Number.isFinite(selectedId) ? selectedId : null,
      distributorName: distributor?.label || ''
    });
    this.updatePromotionalPartySelection(Number.isFinite(selectedId) ? 'distributor' : null);
  }

  onSalespersonChange(salespersonId: string | number): void {
    const rawValue = String(salespersonId ?? '').trim();
    if (!rawValue || rawValue === 'null') {
      this.promoOutwardForm.patchValue({ salespersonId: null, salespersonName: '' });
      this.updatePromotionalPartySelection(null);
      return;
    }

    const selectedId = Number(rawValue);
    const salesperson = this.promotionalSalespersons.find((option) => option.id === selectedId);
    this.promoOutwardForm.patchValue({
      salespersonId: Number.isFinite(selectedId) ? selectedId : null,
      salespersonName: salesperson?.name || ''
    });
    this.updatePromotionalPartySelection(Number.isFinite(selectedId) ? 'salesperson' : null);
  }

  get promoSelectedParty(): PromoPartyType | null {
    if (this.promoOutwardForm.get('employeeId')?.value) {
      return 'employee';
    }
    if (this.promoOutwardForm.get('distributorId')?.value) {
      return 'distributor';
    }
    if (this.promoOutwardForm.get('salespersonId')?.value) {
      return 'salesperson';
    }
    return null;
  }

  private updatePromotionalPartySelection(selected: 'employee' | 'distributor' | 'salesperson' | null): void {
    const employeeIdControl = this.promoOutwardForm.get('employeeId');
    const employeeNameControl = this.promoOutwardForm.get('employeeName');
    const distributorIdControl = this.promoOutwardForm.get('distributorId');
    const distributorNameControl = this.promoOutwardForm.get('distributorName');
    const salespersonIdControl = this.promoOutwardForm.get('salespersonId');
    const salespersonNameControl = this.promoOutwardForm.get('salespersonName');

    if (!employeeIdControl || !employeeNameControl || !distributorIdControl || !distributorNameControl || !salespersonIdControl || !salespersonNameControl) {
      return;
    }

    employeeIdControl.enable({ emitEvent: false });
    distributorIdControl.enable({ emitEvent: false });
    salespersonIdControl.enable({ emitEvent: false });

    if (selected === 'employee') {
      distributorIdControl.reset(null, { emitEvent: false });
      distributorNameControl.reset('', { emitEvent: false });
      salespersonIdControl.reset(null, { emitEvent: false });
      salespersonNameControl.reset('', { emitEvent: false });
      distributorIdControl.disable({ emitEvent: false });
      salespersonIdControl.disable({ emitEvent: false });
    } else if (selected === 'distributor') {
      employeeIdControl.reset(null, { emitEvent: false });
      employeeNameControl.reset('', { emitEvent: false });
      salespersonIdControl.reset(null, { emitEvent: false });
      salespersonNameControl.reset('', { emitEvent: false });
      employeeIdControl.disable({ emitEvent: false });
      salespersonIdControl.disable({ emitEvent: false });
    } else if (selected === 'salesperson') {
      employeeIdControl.reset(null, { emitEvent: false });
      employeeNameControl.reset('', { emitEvent: false });
      distributorIdControl.reset(null, { emitEvent: false });
      distributorNameControl.reset('', { emitEvent: false });
      employeeIdControl.disable({ emitEvent: false });
      distributorIdControl.disable({ emitEvent: false });
    }

    this.promoPartySelectionError = false;
  }

  private hasPromoPartySelection(): boolean {
    const selectedEmployee = this.promoOutwardForm.get('employeeId')?.value;
    const selectedDistributor = this.promoOutwardForm.get('distributorId')?.value;
    const selectedSalesperson = this.promoOutwardForm.get('salespersonId')?.value;

    return !!selectedEmployee || !!selectedDistributor || !!selectedSalesperson;
  }

  getCommentOptions(itemType: ModalItemType, section: SpareSection | ScrapSection): DropdownOption[] {
    const defaultOptions: DropdownOption[] = [
      { value: '', label: 'No comments' }
    ];

    const key = `${itemType}:${section}`;
    const map: Record<string, string[]> = {
      'spare_parts:outward_giving': [
        'Issued for service work',
        'Issued for dealer support',
        'Issued for urgent replacement'
      ],
      'spare_parts:returned_part': [
        'Returned after field use',
        'Returned in good condition',
        'Returned for inspection'
      ],
      'promotional_items:outward_giving': [
        'Issued for dealer activation',
        'Issued for campaign support',
        'Issued for event distribution'
      ],
      'scrap_material:returned_part': [
        'Returned from production floor',
        'Returned after quality check',
        'Collected for scrap processing'
      ],
      'scrap_material:selling_scrap': [
        'Ready for scrap sale',
        'Approved for disposal',
        'Quoted to scrap buyer'
      ]
    };

    return defaultOptions.concat((map[key] || []).map(value => ({ value, label: value })));
  }

  // â”€â”€â”€ submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  submitForm(): void {
    if (!this.selectedItemType) return;

    let form: FormGroup;

    if (this.selectedItemType === 'spare_parts') {
      form = this.activeSpareSection === 'outward_giving'
        ? this.spareOutwardForm : this.spareReturnedForm;
    } else if (this.selectedItemType === 'promotional_items') {
      form = this.activeSpareSection === 'outward_giving'
        ? this.promoOutwardForm : this.promoReturnedForm;
    } else {
      form = this.activeScrapSection === 'returned_part'
        ? this.scrapReturnedForm : this.scrapSellingForm;
    }

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    if (this.selectedItemType === 'promotional_items' && this.activeSpareSection === 'outward_giving' && !this.hasPromoPartySelection()) {
      this.promoPartySelectionError = true;
      return;
    }

    this.isSubmitting = true;

    const payload = this.buildOutwardGivingPayload(form, this.selectedItemType);

    this.outwardService.createOutwardItem(payload).subscribe({
      next: () => {
        this.outwardService.getAllOutwardItems().subscribe({
          next: (data) => {
            this.records = data.map(item => this.mapApiToRecord(item));
            this.applyFilter();
            this.isSubmitting = false;
            this.closeModal();
            this.toast.present('Record saved successfully!', 'success');
          },
          error: () => {
            this.isSubmitting = false;
            this.closeModal();
            this.toast.present('Record saved successfully!', 'success');
          }
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.present(err?.error?.message || 'Failed to save record.', 'danger');
      }
    });
  }

  private buildOutwardGivingPayload(form: FormGroup, itemType: ModalItemType): OutwardGivingPayload {
    const formValue = form.getRawValue();

    const payload: OutwardGivingPayload = {
      itemType: this.mapItemTypeForApi(itemType),
      transactionType: 'OUTWARD_GIVING',
      materialCode: formValue.matCode,
      materialName: formValue.matName,
      unit: this.mapUnitForApi(formValue.unit),
      quantity: Number(formValue.quantity),
      comments: formValue.comments || '',
      quotedSellingPrice: Number(formValue.quotedSellingPrice ?? formValue.desiredQuotedPrice ?? 0)
    };

    if (itemType === 'promotional_items') {
      if (formValue.employeeId) {
        payload.referenceNumber = String(formValue.employeeId);
        payload.issuedTo = formValue.employeeName || '';
      } else if (formValue.distributorId) {
        payload.referenceNumber = String(formValue.distributorId);
        // label is "firmName - distributorCode"; extract just firmName
        payload.issuedTo = (formValue.distributorName as string)?.split(' - ')[0]?.trim() || '';
      } else if (formValue.salespersonId) {
        payload.referenceNumber = String(formValue.salespersonId);
        // name is "name - employeeRollNo"; extract just the name
        payload.issuedTo = (formValue.salespersonName as string)?.split(' - ')[0]?.trim() || '';
      }
    }

    return payload;
  }

  private mapItemTypeForApi(itemType: ModalItemType): OutwardGivingPayload['itemType'] {
    const map: Record<ModalItemType, OutwardGivingPayload['itemType']> = {
      spare_parts: 'SPARE_PARTS',
      promotional_items: 'PROMOTIONAL_ITEMS',
      scrap_material: 'SCRAP_MATERIAL'
    };
    return map[itemType];
  }

  private mapUnitForApi(unit: UnitType): OutwardGivingPayload['unit'] {
    const map: Record<UnitType, OutwardGivingPayload['unit']> = {
      KG: 'KILOGRAMS',
      DOZEN: 'DOZENS',
      PIECE: 'PIECES',
      LITER: 'LITRES'
    };
    return map[unit];
  }

  private getItemCode(item: InventoryItem): string {
    return item.materialCode || item.itemCode || item.sku || item.partCode || '';
  }

  private normalizeUnit(unit?: string): UnitType | undefined {
    if (!unit) return undefined;

    const normalized = String(unit).trim().toUpperCase();

    const map: Record<string, UnitType> = {
      KG: 'KG',
      KILOGRAM: 'KG',
      KILOGRAMS: 'KG',
      DOZENS: 'DOZEN',
      LITER: 'LITER',
      LITRE: 'LITER',
      LITRES: 'LITER',
      PIECE: 'PIECE',
      PIECES: 'PIECE',
      PCS: 'PIECE',
      PC: 'PIECE',
      DOZEN: 'DOZEN'
    };

    return map[normalized] || undefined;
  }

  // â”€â”€â”€ pull to refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  handlePullRefresh(event: any): void {
    this.outwardService.getAllOutwardItems().subscribe({
      next: (data) => {
        this.records = data.map(item => this.mapApiToRecord(item));
        this.applyFilter();
        event.target.complete();
      },
      error: () => event.target.complete()
    });
  }

  manualRefresh(): void {
    this.isLoading = true;
    this.outwardService.getAllOutwardItems().subscribe({
      next: (data) => {
        this.records = data.map(item => this.mapApiToRecord(item));
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // â”€â”€â”€ display helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  get statCards() {
    return [
      {
        label: 'Total Records',
        value: this.records.length,
        icon: 'layers-outline',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50'
      },
      {
        label: 'Spare Parts',
        value: this.records.filter(r => r.itemType === 'spare_parts').length,
        icon: 'build-outline',
        color: 'text-amber-500',
        bg: 'bg-amber-50'
      },
      {
        label: 'Promo Items',
        value: this.records.filter(r => r.itemType === 'promotional_items').length,
        icon: 'gift-outline',
        color: 'text-purple-500',
        bg: 'bg-purple-50'
      },
      {
        label: 'Scrap Material',
        value: this.records.filter(r => r.itemType === 'scrap_material').length,
        icon: 'trash-outline',
        color: 'text-rose-500',
        bg: 'bg-rose-50'
      }
    ];
  }

  getTypeBadge(type: string): { label: string; cls: string } {
    const map: Record<string, { label: string; cls: string }> = {
      spare_parts:        { label: 'Spare Parts', cls: 'badge-amber' },
      promotional_items:  { label: 'Promo',       cls: 'badge-purple' },
      scrap_material:     { label: 'Scrap',        cls: 'badge-rose' }
    };
    return map[type] || { label: type, cls: 'badge-slate' };
  }

  getSectionLabel(section: string): string {
    const map: Record<string, string> = {
      outward_giving: 'Outward Giving',
      returned_part:  'Returned Part',
      selling_scrap:  'Selling Scrap'
    };
    return map[section] || section;
  }

  getUnitLabel(unit: string): string {
    const map: Record<string, string> = {
      KG: 'Kg', DOZEN: 'Dozen', PIECE: 'Pcs', LITER: 'L'
    };
    return map[unit] || unit;
  }

  getTransactionTypeLabel(section: string): { label: string; cls: string } {
    const map: Record<string, { label: string; cls: string }> = {
      outward_giving: { label: 'Outward Giving', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      returned_part:  { label: 'Returned Part',  cls: 'bg-sky-50 text-sky-700 border-sky-200' },
      selling_scrap:  { label: 'Selling Scrap',  cls: 'bg-rose-50 text-rose-700 border-rose-200' }
    };
    return map[section] || { label: section, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  }

  trackById(_: number, r: OutwardRecord) { return r.id; }
}


