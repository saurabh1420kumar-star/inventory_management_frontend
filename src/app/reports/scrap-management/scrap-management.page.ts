import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  seededRandom, pick, toDateInputValue, formatDisplayDate, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'generation' | 'disposal' | 'sale';

const SCRAP_SOURCES = ['Production Line 1', 'Production Line 2', 'Packing Line', 'Bottling Line'];
const SCRAP_TYPES = ['Raw Material Scrap', 'Packing Scrap', 'Process Scrap', 'Rejected FG', 'Plastic Waste'];
const DISPOSAL_METHODS = ['Recycled', 'Landfill', 'Incinerated', 'Vendor Pickup'];
const BUYERS = ['GreenCycle Recyclers', 'Metro Scrap Traders', 'EcoWaste Solutions', 'Bharat Scrap Co.'];

interface Filters {
  scrapType: string;
  dateFrom: string;
  dateTo: string;
}

interface GenerationRow {
  date: string;
  source: string;
  scrapType: string;
  quantity: number;
  uom: string;
  value: number;
}

interface DisposalRow {
  date: string;
  scrapType: string;
  quantity: number;
  uom: string;
  method: string;
  disposedBy: string;
}

interface SaleRow {
  date: string;
  scrapType: string;
  quantity: number;
  uom: string;
  buyer: string;
  rate: number;
  amount: number;
  invoiceNo: string;
}

@Component({
  selector: 'app-scrap-management',
  templateUrl: './scrap-management.page.html',
  styleUrls: ['./scrap-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
})
export class ScrapManagementReportPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);

  scrapTypes = SCRAP_TYPES;

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'generation';
  pager: Pager = { page: 1, pageSize: 5 };

  generationRows: GenerationRow[] = [];
  disposalRows: DisposalRow[] = [];
  saleRows: SaleRow[] = [];

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { scrapType: 'all', dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;
    setTimeout(() => {
      this.buildGenerationRows();
      this.buildDisposalRows();
      this.buildSaleRows();
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

  private typePool(): string[] {
    return this.filters.scrapType === 'all' ? SCRAP_TYPES : [this.filters.scrapType];
  }

  private dateSpan(): { start: number; span: number } {
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    return { start, span: Math.max(end - start, 86400000) };
  }

  private buildGenerationRows() {
    const rng = seededRandom('generation|' + JSON.stringify(this.filters));
    const { start, span } = this.dateSpan();
    const typePool = this.typePool();
    const n = Math.round(60 + rng() * 130);

    const rows: GenerationRow[] = [];
    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * span);
      const quantity = Math.round(5 + rng() * 60);
      rows.push({
        date: date.toISOString().slice(0, 10),
        source: pick(rng, SCRAP_SOURCES),
        scrapType: pick(rng, typePool),
        quantity,
        uom: rng() > 0.5 ? 'KG' : 'PCS',
        value: Math.round(quantity * (5 + rng() * 25)),
      });
    }
    this.generationRows = rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  private buildDisposalRows() {
    const rng = seededRandom('disposal|' + JSON.stringify(this.filters));
    const { start, span } = this.dateSpan();
    const typePool = this.typePool();
    const n = Math.round(30 + rng() * 70);

    const rows: DisposalRow[] = [];
    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * span);
      rows.push({
        date: date.toISOString().slice(0, 10),
        scrapType: pick(rng, typePool),
        quantity: Math.round(5 + rng() * 50),
        uom: rng() > 0.5 ? 'KG' : 'PCS',
        method: pick(rng, DISPOSAL_METHODS),
        disposedBy: pick(rng, ['Housekeeping Team', 'Store Team', 'EHS Officer']),
      });
    }
    this.disposalRows = rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  private buildSaleRows() {
    const rng = seededRandom('sale|' + JSON.stringify(this.filters));
    const { start, span } = this.dateSpan();
    const typePool = this.typePool();
    const n = Math.round(20 + rng() * 50);
    let counter = 1;

    const rows: SaleRow[] = [];
    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * span);
      const quantity = Math.round(20 + rng() * 200);
      const rate = Math.round(6 + rng() * 20);
      rows.push({
        date: date.toISOString().slice(0, 10),
        scrapType: pick(rng, typePool),
        quantity,
        uom: rng() > 0.5 ? 'KG' : 'PCS',
        buyer: pick(rng, BUYERS),
        rate,
        amount: quantity * rate,
        invoiceNo: `SCR-${date.getFullYear().toString().slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}-${String(counter++).padStart(3, '0')}`,
      });
    }
    this.saleRows = rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  get activeRowCount(): number {
    if (this.activeType === 'disposal') return this.disposalRows.length;
    if (this.activeType === 'sale') return this.saleRows.length;
    return this.generationRows.length;
  }

  get pagedGenerationRows(): GenerationRow[] { return paginate(this.generationRows, this.pager); }
  get pagedDisposalRows(): DisposalRow[] { return paginate(this.disposalRows, this.pager); }
  get pagedSaleRows(): SaleRow[] { return paginate(this.saleRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }
  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  formatDisplayDate = formatDisplayDate;
  formatCurrencyFull = formatCurrencyFull;

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'disposal') {
      const headers = ['Date', 'Scrap Type', 'Quantity', 'UOM', 'Disposal Method', 'Disposed By'];
      const rows = this.disposalRows.map(r => [formatDisplayDate(r.date), r.scrapType, r.quantity, r.uom, r.method, r.disposedBy]);
      const jsonRows = this.disposalRows.map(r => ({ Date: r.date, 'Scrap Type': r.scrapType, Quantity: r.quantity, UOM: r.uom, 'Disposal Method': r.method, 'Disposed By': r.disposedBy }));
      return { headers, rows, jsonRows, title: 'Scrap Disposal' };
    }
    if (this.activeType === 'sale') {
      const headers = ['Date', 'Scrap Type', 'Quantity', 'UOM', 'Buyer', 'Rate', 'Amount', 'Invoice No'];
      const rows = this.saleRows.map(r => [formatDisplayDate(r.date), r.scrapType, r.quantity, r.uom, r.buyer, formatCurrencyFull(r.rate), formatCurrencyFull(r.amount), r.invoiceNo]);
      const jsonRows = this.saleRows.map(r => ({ Date: r.date, 'Scrap Type': r.scrapType, Quantity: r.quantity, UOM: r.uom, Buyer: r.buyer, Rate: r.rate, Amount: r.amount, 'Invoice No': r.invoiceNo }));
      return { headers, rows, jsonRows, title: 'Scrap Sale' };
    }
    const headers = ['Date', 'Source', 'Scrap Type', 'Quantity', 'UOM', 'Value'];
    const rows = this.generationRows.map(r => [formatDisplayDate(r.date), r.source, r.scrapType, r.quantity, r.uom, formatCurrencyFull(r.value)]);
    const jsonRows = this.generationRows.map(r => ({ Date: r.date, Source: r.source, 'Scrap Type': r.scrapType, Quantity: r.quantity, UOM: r.uom, Value: r.value }));
    return { headers, rows, jsonRows, title: 'Scrap Generation' };
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
