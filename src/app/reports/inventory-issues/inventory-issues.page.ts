import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportsService } from '../../services/reports.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import { DateGroupedTableComponent, DateSummaryColumn } from '../date-grouped-table/date-grouped-table.component';
import {
  toDateInputValue, formatDisplayDate, formatCurrencyFull,
  DateGroup, listDistinct, sumByUnit,
  exportRowsToExcel, exportRowsToPdf, filterByDateRange,
} from '../report-shared';

type ReportType = 'promotional' | 'spareParts';
type IssueCategory = 'Promotional' | 'Spare Parts';
type IssueTypeFilter = 'all' | IssueCategory;

interface Filters {
  issueType: IssueTypeFilter;
  issuedTo: string;
  dateFrom: string;
  dateTo: string;
}

// Matches GET /api/reports/inventory-issues/by-type?itemType=PROMOTIONAL_ITEMS|SPARE_PARTS
// Each row: { id, itemType, transactionType, materialCode, materialName, quantity, unit,
//             issuedTo, referenceNumber, comments, quotedSellingPrice, createdAt }
interface IssueRow {
  id: number;
  referenceNo: string;
  issueDate: string;
  category: IssueCategory;
  materialCode: string;
  materialName: string;
  issuedTo: string;
  transactionType: string;
  qty: number;
  uom: string;
  unitPrice: number;
  comments: string;
}

function mapIssueRow(raw: any, category: IssueCategory): IssueRow {
  return {
    id: raw.id,
    referenceNo: raw.referenceNumber ?? (raw.id != null ? String(raw.id) : '—'),
    issueDate: raw.createdAt ?? raw.issueDate ?? raw.date ?? '',
    category,
    materialCode: raw.materialCode ?? '—',
    materialName: raw.materialName ?? raw.item ?? raw.itemName ?? '—',
    issuedTo: raw.issuedTo ?? raw.issuedToName ?? raw.recipientName ?? '—',
    transactionType: raw.transactionType ?? '—',
    qty: Number(raw.quantity ?? raw.qty ?? 0),
    uom: raw.unit ?? raw.uom ?? 'PCS',
    unitPrice: Number(raw.quotedSellingPrice ?? 0),
    comments: raw.comments ?? '',
  };
}

@Component({
  selector: 'app-inventory-issues',
  templateUrl: './inventory-issues.page.html',
  styleUrls: ['./inventory-issues.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule, ReportHeroComponent, DateGroupedTableComponent],
})
export class InventoryIssuesReportPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);
  private reportsService = inject(ReportsService);

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'promotional';

  issueRows: IssueRow[] = [];
  promotionalRows: IssueRow[] = [];
  sparePartsRows: IssueRow[] = [];
  issuedToOptions: string[] = [];

  readonly summaryColumns: DateSummaryColumn<IssueRow>[] = [
    { header: 'Issued To', value: rows => listDistinct(rows, r => r.issuedTo) },
    { header: 'Total Qty', value: rows => sumByUnit(rows, r => r.qty, r => r.uom) },
  ];

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { issueType: 'all', issuedTo: '', dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;

    const dateParams = { dateFrom: this.filters.dateFrom, dateTo: this.filters.dateTo };

    forkJoin({
      promotional: this.reportsService.getInventoryIssuesByType('PROMOTIONAL_ITEMS', dateParams),
      spareParts: this.reportsService.getInventoryIssuesByType('SPARE_PARTS', dateParams),
    }).subscribe(({ promotional, spareParts }) => {
      let rows: IssueRow[] = [
        ...promotional.map(r => mapIssueRow(r, 'Promotional')),
        ...spareParts.map(r => mapIssueRow(r, 'Spare Parts')),
      ];

      rows = filterByDateRange(rows, this.filters.dateFrom, this.filters.dateTo, r => r.issueDate);

      if (this.filters.issueType !== 'all') {
        rows = rows.filter(r => r.category === this.filters.issueType);
      }

      this.issuedToOptions = Array.from(
        new Set(rows.map(r => r.issuedTo).filter(name => !!name && name !== '—'))
      ).sort((a, b) => a.localeCompare(b));

      if (this.filters.issuedTo) {
        rows = rows.filter(r => r.issuedTo === this.filters.issuedTo);
      }

      this.issueRows = rows.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
      // Kept as stable arrays, not filtering getters: a getter returns a new array on every read, which would
      // re-cluster the date-grouped table and reset its pager on each change-detection pass.
      this.promotionalRows = this.issueRows.filter(r => r.category === 'Promotional');
      this.sparePartsRows = this.issueRows.filter(r => r.category === 'Spare Parts');
      this.isLoading = false;
      this.lastUpdated = new Date();
    });
  }

  switchType(type: ReportType) {
    this.activeType = type;
    this.haptic.selectionChanged();
  }

  get activeRows(): IssueRow[] {
    return this.activeType === 'promotional' ? this.promotionalRows : this.sparePartsRows;
  }

  get activeTitle(): string {
    return this.activeType === 'promotional' ? 'Promotional Issue' : 'Spare Parts Issue';
  }

  categoryBadgeClass(category: IssueCategory): string {
    return category === 'Promotional' ? 'report-badge-blue' : 'report-badge-amber';
  }

  formatDisplayDate = formatDisplayDate;

  formatTransactionType(type: string): string {
    if (!type || type === '—') return '—';
    return type
      .toLowerCase()
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  formatPrice(value: number): string {
    return value > 0 ? formatCurrencyFull(value) : 'Free';
  }

  // `source` narrows the export to one date's rows (the date modal); omitted, it exports the whole active tab.
  private getExportData(source: IssueRow[] = this.activeRows): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    const headers = ['Reference No', 'Date', 'Category', 'Material', 'Material Code', 'Issued To', 'Transaction Type', 'Qty', 'UOM', 'Price', 'Comments'];
    const rows = source.map(r => [
      r.referenceNo, formatDisplayDate(r.issueDate), r.category, r.materialName, r.materialCode,
      r.issuedTo, this.formatTransactionType(r.transactionType), r.qty, r.uom, this.formatPrice(r.unitPrice), r.comments,
    ]);
    const jsonRows = source.map(r => ({
      'Reference No': r.referenceNo, Date: formatDisplayDate(r.issueDate), Category: r.category,
      Material: r.materialName, 'Material Code': r.materialCode, 'Issued To': r.issuedTo,
      'Transaction Type': this.formatTransactionType(r.transactionType), Qty: r.qty, UOM: r.uom,
      Price: this.formatPrice(r.unitPrice), Comments: r.comments,
    }));
    return { headers, rows, jsonRows, title: this.activeTitle };
  }

  async exportExcel() {
    const { jsonRows, title } = this.getExportData();
    await exportRowsToExcel(jsonRows, title, this.downloadService, this.toast);
  }

  async exportPdf() {
    const { headers, rows, title } = this.getExportData();
    await exportRowsToPdf(headers, rows, title, this.downloadService, this.toast);
  }

  async exportGroupExcel(group: DateGroup<IssueRow>) {
    const { jsonRows, title } = this.getExportData(group.rows);
    await exportRowsToExcel(jsonRows, title, this.downloadService, this.toast, group.label);
  }

  async exportGroupPdf(group: DateGroup<IssueRow>) {
    const { headers, rows, title } = this.getExportData(group.rows);
    await exportRowsToPdf(headers, rows, title, this.downloadService, this.toast, group.label);
  }
}
