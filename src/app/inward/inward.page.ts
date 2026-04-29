import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
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
  waterOutline, appsOutline, gridOutline, carOutline, personOutline, callOutline
} from 'ionicons/icons';
import { Auth } from '../services/auth';
import { environment } from '../../environments/environment';

export type InwardItemType = 'raw_material' | 'finished_product' | 'spare_parts' | 'promotional' | 'scrap';

export interface InwardEntry {
  id?: number;
  itemType: InwardItemType;
  itemName: string;
  itemCode: string;
  quantity: number;
  minThreshold: number;
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
    IonSpinner, IonRefresher, IonRefresherContent
  ]
})
export class InwardPage implements OnInit {

  itemTypes = ITEM_TYPES;
  unitTypes = UNIT_TYPES;

  // List state
  entries: InwardEntry[] = [];
  filteredEntries: InwardEntry[] = [];
  isLoading = false;
  searchTerm = '';
  selectedFilter: InwardItemType | 'all' = 'all';

  // Modal state
  isModalOpen = false;
  selectedType: InwardItemType | null = null;
  isSubmitting = false;

  form: InwardEntry = this.emptyForm();

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private router: Router,
    private toastController: ToastController
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
      'call-outline': callOutline
    });
  }

  ngOnInit() {
    this.loadEntries();
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  private emptyForm(): InwardEntry {
    return {
      itemType: 'raw_material',
      itemName: '',
      itemCode: '',
      quantity: 0,
      minThreshold: 0,
      unit: 'KG',  // default unit
      vendorName: '',
      vendorId: '',
      transportName: '',
      driverName: '',
      driverMobile: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      remarks: ''
    };
  }

  loadEntries(event?: any) {
    this.isLoading = true;
    this.http.get<any>(`${environment.apiUrl}/inward`, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.entries = Array.isArray(res) ? res : (res?.data ?? []);
        this.applyFilter();
        this.isLoading = false;
        if (event) event.target.complete();
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
    this.filteredEntries = data;
  }

  openModal() {
    this.form = this.emptyForm();
    this.selectedType = null;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedType = null;
  }

  selectType(type: InwardItemType) {
    this.selectedType = type;
    this.form.itemType = type;
  }

  getTypeConfig(type: InwardItemType) {
    return this.itemTypes.find(t => t.type === type) ?? this.itemTypes[0];
  }

  getUnitShort(): string {
    return this.unitTypes.find(u => u.value === this.form.unit)?.short ?? this.form.unit;
  }

  submitEntry() {
    if (!this.selectedType) { this.showToast('Please select an item type', 'warning'); return; }
    if (!this.form.itemName.trim()) { this.showToast('Item name is required', 'warning'); return; }
    if (!this.form.quantity || this.form.quantity <= 0) { this.showToast('Enter a valid quantity', 'warning'); return; }

    this.isSubmitting = true;
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
    const toast = await this.toastController.create({ message, duration: 3000, position: 'top', color });
    await toast.present();
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
