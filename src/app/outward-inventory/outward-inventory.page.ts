import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass, DatePipe } from '@angular/common';
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

import { OutwardInventoryService, OutwardRecord } from '../services/outward-inventory.service';
import { InventoryService, InventoryItem } from '../services/inventory';
import { Toast } from '../services/toast';

export type ModalItemType = 'spare_parts' | 'promotional_items' | 'scrap_material';
export type SpareSection = 'outward_giving' | 'returned_part';
export type ScrapSection = 'returned_part' | 'selling_scrap';
export type UnitType = 'KG' | 'DOZEN' | 'PIECE' | 'LITER';

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

  /** all outward records for the list */
  records: OutwardRecord[] = [];
  filteredRecords: OutwardRecord[] = [];
  searchTerm = '';
  activeFilter: 'all' | ModalItemType | 'raw_material' | 'finished_product' = 'all';

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
  private toast = inject(Toast);

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
      quantity: [null, [Validators.required, Validators.min(1)]]
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
      unit:     ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]]
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
    this.outwardService.getAll().subscribe({
      next: (data) => {
        this.records = data;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });

    this.inventoryService.getAllItems().subscribe({
      next: (items) => { this.masterItems = items; }
    });
  }

  // â”€â”€â”€ filter / search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  applyFilter(): void {
    let data = [...this.records];
    if (this.activeFilter !== 'all') {
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
    this.resetForms();
  }

  selectType(type: ModalItemType): void {
    this.selectedItemType = type;
    this.activeSpareSection = 'outward_giving';
    this.activeScrapSection = 'returned_part';
  }

  setUnit(form: FormGroup, unit: UnitType): void {
    form.patchValue({ unit });
  }

  private resetForms(): void {
    this.spareOutwardForm.reset();
    this.spareReturnedForm.reset();
    this.promoOutwardForm.reset();
    this.promoReturnedForm.reset();
    this.scrapReturnedForm.reset();
    this.scrapSellingForm.reset();
  }

  // â”€â”€â”€ auto-fill mat name when code typed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  onMatCodeChange(code: string, form: FormGroup): void {
    const item = this.masterItems.find(i =>
      (i.materialCode || i.itemCode || i.sku || i.partCode) === code
    );
    if (item) {
      form.patchValue({ matName: item.name });
    }
  }

  // â”€â”€â”€ submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  submitForm(): void {
    if (!this.selectedItemType) return;

    let form: FormGroup;
    let section: string;

    if (this.selectedItemType === 'spare_parts') {
      form = this.activeSpareSection === 'outward_giving'
        ? this.spareOutwardForm : this.spareReturnedForm;
      section = this.activeSpareSection;
    } else if (this.selectedItemType === 'promotional_items') {
      form = this.activeSpareSection === 'outward_giving'
        ? this.promoOutwardForm : this.promoReturnedForm;
      section = this.activeSpareSection;
    } else {
      form = this.activeScrapSection === 'returned_part'
        ? this.scrapReturnedForm : this.scrapSellingForm;
      section = this.activeScrapSection;
    }

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const payload: Partial<OutwardRecord> = {
      ...form.value,
      itemType: this.selectedItemType,
      section
    };

    this.outwardService.create(payload).subscribe({
      next: (created) => {
        this.records.unshift(created);
        this.applyFilter();
        this.isSubmitting = false;
        this.closeModal();
        this.toast.present('Record saved successfully!', 'success');
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.present(err?.error?.message || 'Failed to save record.', 'danger');
      }
    });
  }

  // â”€â”€â”€ pull to refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  handlePullRefresh(event: any): void {
    this.outwardService.getAll().subscribe({
      next: (data) => {
        this.records = data;
        this.applyFilter();
        event.target.complete();
      },
      error: () => event.target.complete()
    });
  }

  manualRefresh(): void {
    this.isLoading = true;
    this.outwardService.getAll().subscribe({
      next: (data) => {
        this.records = data;
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

  trackById(_: number, r: OutwardRecord) { return r.id; }
}


