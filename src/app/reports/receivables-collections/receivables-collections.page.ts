import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportsService } from '../../services/reports.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  DEALERS,
  seededRandom, pick, toDateInputValue, formatDisplayDate, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'outstanding' | 'collections';
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
  id: number;
  referenceNo: string;
  date: string;
  customer: string;
  amountCollected: number;
  description: string;
}

// The backend concatenates "firstName lastName" server-side without checking for a
// null lastName, so distributorName frequently arrives as e.g. "Ram ji fertilizer  null".
// Stripped here rather than fixed upstream since this is a display-layer workaround.
function cleanName(name: string): string {
  const cleaned = name.replace(/\s+(null|undefined)\s*$/i, '').replace(/\s{2,}/g, ' ').trim();
  return cleaned || '—';
}

// GET /api/reports/receivables/collection-history — Excel #25 Collection Report
// Real response shape: { id, distributorId, distributorName, amount, description, approvedAt }
// — no invoiceNo/mode/referenceNo field exists on this endpoint.
function mapCollectionRow(raw: any): CollectionRow {
  return {
    id: raw.id,
    referenceNo: raw.referenceNo ?? raw.referenceNumber ?? (raw.id != null ? String(raw.id) : '—'),
    date: raw.approvedAt ?? raw.date ?? raw.paymentDate ?? raw.collectionDate ?? '',
    customer: cleanName(raw.distributorName ?? raw.customer ?? raw.customerName ?? '—'),
    amountCollected: Number(raw.amount ?? raw.amountCollected ?? raw.paidAmount ?? 0),
    description: raw.description ?? '',
  };
}

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
  private reportsService = inject(ReportsService);

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

    // Outstanding Receivable (Excel #24) returns empty from the backend today — REPORTS_README.md
    // Category 2 lists it as missing daysOverdue/status/region/invoiceCount. The "outstanding" tab
    // stays on mock data until that's fixed.
    this.buildAgeingRows();

    this.reportsService.getCollectionHistory({
      dateFrom: this.filters.dateFrom,
      dateTo: this.filters.dateTo,
      distributorId: this.filters.customer,
    }).subscribe(rows => {
      this.collectionRows = rows.map(mapCollectionRow).sort((a, b) => b.date.localeCompare(a.date));
      this.computeStats();
      this.pager.page = 1;
      this.isLoading = false;
      this.lastUpdated = new Date();
    });
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
    const headers = ['Date', 'Customer', 'Amount Collected', 'Reference No', 'Description'];
    const rows = this.collectionRows.map(r => [formatDisplayDate(r.date), r.customer, formatCurrencyFull(r.amountCollected), r.referenceNo, r.description]);
    const jsonRows = this.collectionRows.map(r => ({ Date: r.date, Customer: r.customer, 'Amount Collected': r.amountCollected, 'Reference No': r.referenceNo, Description: r.description }));
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
