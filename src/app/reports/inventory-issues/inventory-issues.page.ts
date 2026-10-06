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
import {
  toDateInputValue, formatDisplayDate, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
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
  imports: [CommonModule, FormsModule, RouterModule, IonicModule, ReportHeroComponent],
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
  pager: Pager = { page: 1, pageSize: 5 };

  issueRows: IssueRow[] = [];

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

      if (this.filters.issueType !== 'all') {
        rows = rows.filter(r => r.category === this.filters.issueType);
      }
      const search = this.filters.issuedTo.trim().toLowerCase();
      if (search) {
        rows = rows.filter(r => r.issuedTo.toLowerCase().includes(search));
      }

      this.issueRows = rows.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
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

  get promotionalRows(): IssueRow[] { return this.issueRows.filter(r => r.category === 'Promotional'); }
  get sparePartsRows(): IssueRow[] { return this.issueRows.filter(r => r.category === 'Spare Parts'); }

  get activeRows(): IssueRow[] {
    return this.activeType === 'promotional' ? this.promotionalRows : this.sparePartsRows;
  }

  get pagedRows(): IssueRow[] { return paginate(this.activeRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRows.length); }
  get totalPageCount(): number { return totalPages(this.activeRows.length, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

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

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    const headers = ['Reference No', 'Date', 'Category', 'Material', 'Material Code', 'Issued To', 'Transaction Type', 'Qty', 'UOM', 'Price', 'Comments'];
    const rows = this.activeRows.map(r => [
      r.referenceNo, formatDisplayDate(r.issueDate), r.category, r.materialName, r.materialCode,
      r.issuedTo, this.formatTransactionType(r.transactionType), r.qty, r.uom, this.formatPrice(r.unitPrice), r.comments,
    ]);
    const jsonRows = this.activeRows.map(r => ({
      'Reference No': r.referenceNo, Date: formatDisplayDate(r.issueDate), Category: r.category,
      Material: r.materialName, 'Material Code': r.materialCode, 'Issued To': r.issuedTo,
      'Transaction Type': this.formatTransactionType(r.transactionType), Qty: r.qty, UOM: r.uom,
      Price: this.formatPrice(r.unitPrice), Comments: r.comments,
    }));
    const title = this.activeType === 'promotional' ? 'Promotional Issue' : 'Spare Parts Issue';
    return { headers, rows, jsonRows, title };
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
