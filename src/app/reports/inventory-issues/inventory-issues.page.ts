import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportsService } from '../../services/reports.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  toDateInputValue, formatDisplayDate,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'promotional' | 'spareParts' | 'history';
type IssueCategory = 'Promotional' | 'Spare Parts';
type IssueTypeFilter = 'all' | IssueCategory;
type IssuedToType = 'Employee' | 'Dealer' | 'Distributor';
type IssuedToFilter = 'all' | IssuedToType;

const KNOWN_RECIPIENT_TYPES: IssuedToType[] = ['Employee', 'Dealer', 'Distributor'];

interface Filters {
  issueType: IssueTypeFilter;
  issuedToType: IssuedToFilter;
  dateFrom: string;
  dateTo: string;
}

interface IssueRow {
  issueNo: string;
  issueDate: string;
  category: IssueCategory;
  issuedToType: IssuedToType;
  issuedToName: string;
  item: string;
  qty: number;
  uom: string;
}

function normalizeRecipientType(raw: unknown): IssuedToType {
  const text = String(raw ?? 'Employee').trim();
  const titleCase = (text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()) as IssuedToType;
  return KNOWN_RECIPIENT_TYPES.includes(titleCase) ? titleCase : 'Employee';
}

// GET /api/reports/inventory-issues/by-type?itemType=PROMOTIONAL_ITEMS|SPARE_PARTS — Excel #34 / #35
function mapIssueRow(raw: any, category: IssueCategory): IssueRow {
  return {
    issueNo: raw.issueNo ?? raw.issueNumber ?? '—',
    issueDate: raw.issueDate ?? raw.date ?? raw.issuedDate ?? '',
    category,
    issuedToType: normalizeRecipientType(raw.issuedToType ?? raw.recipientType),
    issuedToName: raw.issuedToName ?? raw.recipientName ?? raw.issuedTo ?? '—',
    item: raw.item ?? raw.itemName ?? '—',
    qty: Number(raw.qty ?? raw.quantity ?? 0),
    uom: raw.uom ?? raw.unit ?? 'PCS',
  };
}

@Component({
  selector: 'app-inventory-issues',
  templateUrl: './inventory-issues.page.html',
  styleUrls: ['./inventory-issues.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
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
    return { issueType: 'all', issuedToType: 'all', dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
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
      if (this.filters.issuedToType !== 'all') {
        rows = rows.filter(r => r.issuedToType === this.filters.issuedToType);
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
    if (this.activeType === 'promotional') return this.promotionalRows;
    if (this.activeType === 'spareParts') return this.sparePartsRows;
    return this.issueRows;
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

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    const headers = ['Issue No', 'Issue Date', 'Category', 'Issued To', 'Item', 'Qty', 'UOM'];
    const rows = this.activeRows.map(r => [r.issueNo, formatDisplayDate(r.issueDate), r.category, `${r.issuedToType} - ${r.issuedToName}`, r.item, r.qty, r.uom]);
    const jsonRows = this.activeRows.map(r => ({ 'Issue No': r.issueNo, 'Issue Date': r.issueDate, Category: r.category, 'Issued To': `${r.issuedToType} - ${r.issuedToName}`, Item: r.item, Qty: r.qty, UOM: r.uom }));
    const title = this.activeType === 'promotional' ? 'Promotional Issue' : this.activeType === 'spareParts' ? 'Spare Parts Issue' : 'Issue History';
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
