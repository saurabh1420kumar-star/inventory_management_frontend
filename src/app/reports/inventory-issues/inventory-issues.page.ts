import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  EMPLOYEES, DEALERS, DISTRIBUTORS,
  seededRandom, pick, toDateInputValue, formatDisplayDate,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'promotional' | 'spareParts' | 'history';
type IssueCategory = 'Promotional' | 'Spare Parts';
type IssueTypeFilter = 'all' | IssueCategory;
type IssuedToType = 'Employee' | 'Dealer' | 'Distributor';
type IssuedToFilter = 'all' | IssuedToType;

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

const PROMO_ITEMS = ['Cap', 'T-Shirt', 'Umbrella', 'Standee', 'Banner', 'Keychain', 'Visiting Card Box'];
const SPARE_ITEMS = ['Bottle Nozzle', 'Filling Gasket', 'Conveyor Belt', 'Capping Filter', 'Pressure Valve', 'Sensor Unit'];

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
    setTimeout(() => {
      this.buildIssueRows();
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

  private nameFor(rng: () => number, type: IssuedToType): string {
    if (type === 'Employee') return pick(rng, EMPLOYEES);
    if (type === 'Dealer') return pick(rng, DEALERS);
    return pick(rng, DISTRIBUTORS);
  }

  private buildIssueRows() {
    const rng = seededRandom('issues|' + JSON.stringify(this.filters));
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);
    const n = Math.round(120 + rng() * 260);
    const typePool: IssuedToType[] = this.filters.issuedToType === 'all' ? ['Employee', 'Dealer', 'Distributor'] : [this.filters.issuedToType];
    let counter = 1;

    const rows: IssueRow[] = [];
    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * span);
      const category: IssueCategory = rng() > 0.5 ? 'Promotional' : 'Spare Parts';
      const issuedToType = pick(rng, typePool);
      rows.push({
        issueNo: `IS-${date.getFullYear().toString().slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(counter++).padStart(3, '0')}`,
        issueDate: date.toISOString().slice(0, 10),
        category,
        issuedToType,
        issuedToName: this.nameFor(rng, issuedToType),
        item: category === 'Promotional' ? pick(rng, PROMO_ITEMS) : pick(rng, SPARE_ITEMS),
        qty: 1 + Math.floor(rng() * 100),
        uom: rng() > 0.6 ? 'PCS' : rng() > 0.3 ? 'KG' : 'SET',
      });
    }

    const filtered = this.filters.issueType === 'all' ? rows : rows.filter(r => r.category === this.filters.issueType);
    this.issueRows = filtered.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
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
