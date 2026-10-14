import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportsService } from '../../services/reports.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import { DateGroupedTableComponent, DateSummaryColumn } from '../date-grouped-table/date-grouped-table.component';
import {
  toDateInputValue, formatDisplayDate, formatCurrencyFull,
  DateGroup, listDistinct, sumBy,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf, filterByDateRange, filterByField,
} from '../report-shared';

type ReportType = 'outstanding' | 'collections';
type Status = 'Healthy' | 'Watch' | 'Overdue';

interface Filters {
  customer: string;
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
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent, DateGroupedTableComponent],
})
export class ReceivablesCollectionsPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);
  private reportsService = inject(ReportsService);

  customers: string[] = [];

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'outstanding';
  pager: Pager = { page: 1, pageSize: 6 };

  ageingRows: CustomerAgeing[] = [];
  collectionRows: CollectionRow[] = [];

  readonly collectionSummaryColumns: DateSummaryColumn<CollectionRow>[] = [
    { header: 'Customers', value: rows => listDistinct(rows, r => r.customer) },
    { header: 'Total Collected', value: rows => formatCurrencyFull(sumBy(rows, r => r.amountCollected)) },
  ];

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
    return { customer: 'all', dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;

    // Outstanding Receivable (Excel #24) has no backend endpoint — see REPORTS_BACKEND_GAPS.md #2.
    // The "Outstanding Summary" tab has no real data source, so it stays empty rather than
    // showing fabricated numbers; wire this up once a real endpoint exists.
    this.ageingRows = [];

    this.reportsService.getCollectionHistory({
      dateFrom: this.filters.dateFrom,
      dateTo: this.filters.dateTo,
    }).subscribe(rows => {
      const dateFiltered = filterByDateRange(rows.map(mapCollectionRow), this.filters.dateFrom, this.filters.dateTo, r => r.date);

      this.customers = Array.from(new Set(dateFiltered.map(r => r.customer).filter(name => name !== '—'))).sort((a, b) => a.localeCompare(b));

      this.collectionRows = filterByField(dateFiltered, this.filters.customer, r => r.customer)
        .sort((a, b) => b.date.localeCompare(a.date));
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

  // `source` narrows the Collections export to one date's rows (the date modal); omitted, it exports every row.
  private getExportData(source?: CollectionRow[]): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'outstanding') {
      const headers = ['Customer', 'Region', 'Invoices', 'Outstanding', 'Days Overdue', 'Status'];
      const rows = this.ageingRows.map(r => [r.customer, r.region, r.invoices, formatCurrencyFull(r.outstanding), r.daysOverdue, r.status]);
      const jsonRows = this.ageingRows.map(r => ({ Customer: r.customer, Region: r.region, Invoices: r.invoices, Outstanding: r.outstanding, 'Days Overdue': r.daysOverdue, Status: r.status }));
      return { headers, rows, jsonRows, title: 'Outstanding Summary' };
    }
    const data = source ?? this.collectionRows;
    const headers = ['Date', 'Customer', 'Amount Collected', 'Reference No', 'Description'];
    const rows = data.map(r => [formatDisplayDate(r.date), r.customer, formatCurrencyFull(r.amountCollected), r.referenceNo, r.description]);
    const jsonRows = data.map(r => ({ Date: r.date, Customer: r.customer, 'Amount Collected': r.amountCollected, 'Reference No': r.referenceNo, Description: r.description }));
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

  async exportGroupExcel(group: DateGroup<CollectionRow>) {
    const { jsonRows, title } = this.getExportData(group.rows);
    await exportRowsToExcel(jsonRows, title, this.downloadService, this.toast, group.label);
  }

  async exportGroupPdf(group: DateGroup<CollectionRow>) {
    const { headers, rows, title } = this.getExportData(group.rows);
    await exportRowsToPdf(headers, rows, title, this.downloadService, this.toast, group.label);
  }
}
