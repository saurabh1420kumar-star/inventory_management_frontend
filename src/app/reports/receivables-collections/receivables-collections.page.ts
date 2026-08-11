import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  DEALERS,
  seededRandom, pick, toDateInputValue, formatDisplayDate, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'outstanding' | 'ageing' | 'collections';
type AgeingFilter = 'all' | '0-30' | '31-60' | '61-90' | '90+';
type StatusFilter = 'all' | 'Healthy' | 'Watch' | 'Overdue';
type Status = 'Healthy' | 'Watch' | 'Overdue';

interface Filters {
  customer: string;
  ageing: AgeingFilter;
  status: StatusFilter;
  dateFrom: string;
  dateTo: string;
}

interface CustomerAgeing {
  customer: string;
  region: string;
  invoices: number;
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b90plus: number;
  outstanding: number;
  daysOverdue: number;
  status: Status;
}

interface CollectionRow {
  date: string;
  customer: string;
  invoiceNo: string;
  amountCollected: number;
  mode: string;
  referenceNo: string;
}

const COLLECTION_MODES = ['Bank Transfer', 'Cheque', 'UPI', 'Cash'];

@Component({
  selector: 'app-receivables-collections',
  templateUrl: './receivables-collections.page.html',
  styleUrls: ['./receivables-collections.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
})
export class ReceivablesCollectionsPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);

  customers = DEALERS;

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'outstanding';
  pager: Pager = { page: 1, pageSize: 6 };

  ageingRows: CustomerAgeing[] = [];
  collectionRows: CollectionRow[] = [];

  totalOutstanding = 0;
  overdueAmount = 0;
  collectedThisPeriod = 0;
  avgDso = 0;

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { customer: 'all', ageing: 'all', status: 'all', dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;
    setTimeout(() => {
      this.buildAgeingRows();
      this.buildCollectionRows();
      this.computeStats();
      this.pager.page = 1;
      this.isLoading = false;
      this.lastUpdated = new Date();
    }, 300);
  }

  switchType(type: ReportType) {
    this.activeType = type;
    this.pager.page = 1;
    this.haptic.selectionChanged();
  }

  private buildAgeingRows() {
    const customerPool = this.filters.customer === 'all' ? this.customers : [this.filters.customer];
    let rows: CustomerAgeing[] = customerPool.map(customer => {
      const rng = seededRandom('ageing|' + customer);
      const b0_30 = Math.round(rng() * 90000);
      const b31_60 = Math.round(rng() * 60000);
      const b61_90 = rng() > 0.55 ? Math.round(rng() * 45000) : 0;
      const b90plus = rng() > 0.75 ? Math.round(rng() * 60000) : 0;
      const outstanding = b0_30 + b31_60 + b61_90 + b90plus;
      const weighted = b0_30 * 15 + b31_60 * 45 + b61_90 * 75 + b90plus * 105;
      const daysOverdue = outstanding ? Math.round(weighted / outstanding) : 0;
      const rowBase = { b0_30, b31_60, b61_90, b90plus, outstanding };
      const status: Status = b90plus > 0 || b61_90 > outstanding * 0.3 ? 'Overdue' : (b31_60 > 0 || b61_90 > 0) ? 'Watch' : 'Healthy';
      return {
        customer,
        region: pick(rng, ['North', 'South', 'East', 'West', 'Central']),
        invoices: 2 + Math.floor(rng() * 14),
        ...rowBase,
        daysOverdue,
        status,
      };
    });

    if (this.filters.ageing !== 'all') {
      rows = rows.filter(r => {
        if (this.filters.ageing === '0-30') return r.b0_30 > 0;
        if (this.filters.ageing === '31-60') return r.b31_60 > 0;
        if (this.filters.ageing === '61-90') return r.b61_90 > 0;
        return r.b90plus > 0;
      });
    }
    if (this.filters.status !== 'all') {
      rows = rows.filter(r => r.status === this.filters.status);
    }

    this.ageingRows = rows.sort((a, b) => b.outstanding - a.outstanding);
  }

  private buildCollectionRows() {
    const rng = seededRandom('collections|' + JSON.stringify(this.filters));
    const customerPool = this.filters.customer === 'all' ? this.customers : [this.filters.customer];
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);
    const n = Math.round(24 + rng() * 60);
    let counter = 1;

    const rows: CollectionRow[] = [];
    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * span);
      rows.push({
        date: date.toISOString().slice(0, 10),
        customer: pick(rng, customerPool),
        invoiceNo: `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(counter++).padStart(3, '0')}`,
        amountCollected: Math.round(5000 + rng() * 85000),
        mode: pick(rng, COLLECTION_MODES),
        referenceNo: `REF-${Math.floor(100000 + rng() * 899999)}`,
      });
    }
    this.collectionRows = rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  private computeStats() {
    this.totalOutstanding = this.ageingRows.reduce((s, r) => s + r.outstanding, 0);
    this.overdueAmount = this.ageingRows.reduce((s, r) => s + r.b61_90 + r.b90plus, 0);
    this.collectedThisPeriod = this.collectionRows.reduce((s, r) => s + r.amountCollected, 0);
    const weightedDays = this.ageingRows.reduce((s, r) => s + r.daysOverdue * r.outstanding, 0);
    this.avgDso = this.totalOutstanding ? Math.round(weightedDays / this.totalOutstanding) : 0;
  }

  get activeRowCount(): number {
    return this.activeType === 'collections' ? this.collectionRows.length : this.ageingRows.length;
  }

  get pagedAgeingRows(): CustomerAgeing[] { return paginate(this.ageingRows, this.pager); }
  get pagedCollectionRows(): CollectionRow[] { return paginate(this.collectionRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }
  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  statusBadgeClass(status: Status): string {
    if (status === 'Healthy') return 'report-badge-green';
    if (status === 'Watch') return 'report-badge-amber';
    return 'report-badge-red';
  }

  formatDisplayDate = formatDisplayDate;
  formatCurrencyFull = formatCurrencyFull;

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'outstanding') {
      const headers = ['Customer', 'Region', 'Invoices', 'Outstanding', 'Days Overdue', 'Status'];
      const rows = this.ageingRows.map(r => [r.customer, r.region, r.invoices, formatCurrencyFull(r.outstanding), r.daysOverdue, r.status]);
      const jsonRows = this.ageingRows.map(r => ({ Customer: r.customer, Region: r.region, Invoices: r.invoices, Outstanding: r.outstanding, 'Days Overdue': r.daysOverdue, Status: r.status }));
      return { headers, rows, jsonRows, title: 'Outstanding Summary' };
    }
    if (this.activeType === 'ageing') {
      const headers = ['Customer', '0-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total Outstanding'];
      const rows = this.ageingRows.map(r => [r.customer, formatCurrencyFull(r.b0_30), formatCurrencyFull(r.b31_60), formatCurrencyFull(r.b61_90), formatCurrencyFull(r.b90plus), formatCurrencyFull(r.outstanding)]);
      const jsonRows = this.ageingRows.map(r => ({ Customer: r.customer, '0-30 Days': r.b0_30, '31-60 Days': r.b31_60, '61-90 Days': r.b61_90, '90+ Days': r.b90plus, 'Total Outstanding': r.outstanding }));
      return { headers, rows, jsonRows, title: 'Ageing Analysis' };
    }
    const headers = ['Date', 'Customer', 'Invoice No', 'Amount Collected', 'Mode', 'Reference No'];
    const rows = this.collectionRows.map(r => [formatDisplayDate(r.date), r.customer, r.invoiceNo, formatCurrencyFull(r.amountCollected), r.mode, r.referenceNo]);
    const jsonRows = this.collectionRows.map(r => ({ Date: r.date, Customer: r.customer, 'Invoice No': r.invoiceNo, 'Amount Collected': r.amountCollected, Mode: r.mode, 'Reference No': r.referenceNo }));
    return { headers, rows, jsonRows, title: 'Collections' };
  }

  async exportExcel() {
    const { jsonRows, title } = this.getExportData();
    await exportRowsToExcel(jsonRows, title, this.downloadService, this.toast);
  }

  async exportPdf() {
    const { headers, rows, title } = this.getExportData();
    await exportRowsToPdf(headers, rows, title, this.downloadService, this.toast);
  }
}
