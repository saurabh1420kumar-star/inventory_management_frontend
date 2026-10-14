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
  DateGroup, listDistinct, sumBy, sumByUnit,
  exportRowsToExcel, exportRowsToPdf, filterByDateRange, filterByField,
} from '../report-shared';

type ReportType = 'generation' | 'disposal' | 'sale';

const SCRAP_TYPES = ['Raw Material Scrap', 'Packing Scrap', 'Process Scrap', 'Rejected FG', 'Plastic Waste'];

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

// GET /api/reports/scrap/lifecycle — Excel #36 Scrap Generation
function mapGenerationRow(raw: any): GenerationRow {
  return {
    date: raw.date ?? raw.generatedDate ?? raw.generationDate ?? '',
    source: raw.source ?? raw.sourceLocation ?? raw.productionLine ?? '—',
    scrapType: raw.scrapType ?? raw.type ?? '—',
    quantity: Number(raw.quantity ?? raw.qty ?? 0),
    uom: raw.uom ?? raw.unit ?? 'KG',
    value: Number(raw.value ?? raw.estimatedValue ?? 0),
  };
}

// GET /api/reports/scrap/disposal-status — Excel #37 Scrap Disposal
function mapDisposalRow(raw: any): DisposalRow {
  return {
    date: raw.date ?? raw.disposalDate ?? '',
    scrapType: raw.scrapType ?? raw.type ?? '—',
    quantity: Number(raw.quantity ?? raw.qty ?? 0),
    uom: raw.uom ?? raw.unit ?? 'KG',
    method: raw.method ?? raw.disposalMethod ?? '—',
    disposedBy: raw.disposedBy ?? raw.handledBy ?? '—',
  };
}

// GET /api/reports/scrap/revenue — Excel #38 Scrap Sale
function mapSaleRow(raw: any): SaleRow {
  const quantity = Number(raw.quantity ?? raw.qty ?? 0);
  const rate = Number(raw.rate ?? raw.unitRate ?? 0);
  return {
    date: raw.date ?? raw.saleDate ?? '',
    scrapType: raw.scrapType ?? raw.type ?? '—',
    quantity,
    uom: raw.uom ?? raw.unit ?? 'KG',
    buyer: raw.buyer ?? raw.buyerName ?? '—',
    rate,
    amount: Number(raw.amount ?? raw.totalAmount ?? quantity * rate),
    invoiceNo: raw.invoiceNo ?? raw.invoiceNumber ?? '—',
  };
}

@Component({
  selector: 'app-scrap-management',
  templateUrl: './scrap-management.page.html',
  styleUrls: ['./scrap-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule, ReportHeroComponent, DateGroupedTableComponent],
})
export class ScrapManagementReportPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);
  private reportsService = inject(ReportsService);

  scrapTypes = SCRAP_TYPES;

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'generation';

  generationRows: GenerationRow[] = [];
  disposalRows: DisposalRow[] = [];
  saleRows: SaleRow[] = [];

  readonly generationSummaryColumns: DateSummaryColumn<GenerationRow>[] = [
    { header: 'Scrap Types', value: rows => listDistinct(rows, r => r.scrapType) },
    { header: 'Total Qty', value: rows => sumByUnit(rows, r => r.quantity, r => r.uom) },
    { header: 'Total Value', value: rows => formatCurrencyFull(sumBy(rows, r => r.value)) },
  ];

  readonly disposalSummaryColumns: DateSummaryColumn<DisposalRow>[] = [
    { header: 'Scrap Types', value: rows => listDistinct(rows, r => r.scrapType) },
    { header: 'Total Qty', value: rows => sumByUnit(rows, r => r.quantity, r => r.uom) },
  ];

  readonly saleSummaryColumns: DateSummaryColumn<SaleRow>[] = [
    { header: 'Buyers', value: rows => listDistinct(rows, r => r.buyer) },
    { header: 'Total Qty', value: rows => sumByUnit(rows, r => r.quantity, r => r.uom) },
    { header: 'Total Amount', value: rows => formatCurrencyFull(sumBy(rows, r => r.amount)) },
  ];

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

    const params = { scrapType: this.filters.scrapType, dateFrom: this.filters.dateFrom, dateTo: this.filters.dateTo };

    forkJoin({
      generation: this.reportsService.getScrapLifecycle(params),
      disposal: this.reportsService.getScrapDisposalStatus(params),
      sale: this.reportsService.getScrapRevenue(params),
    }).subscribe(({ generation, disposal, sale }) => {
      const { dateFrom, dateTo, scrapType } = this.filters;
      this.generationRows = filterByField(filterByDateRange(generation.map(mapGenerationRow), dateFrom, dateTo, r => r.date), scrapType, r => r.scrapType)
        .sort((a, b) => b.date.localeCompare(a.date));
      this.disposalRows = filterByField(filterByDateRange(disposal.map(mapDisposalRow), dateFrom, dateTo, r => r.date), scrapType, r => r.scrapType)
        .sort((a, b) => b.date.localeCompare(a.date));
      this.saleRows = filterByField(filterByDateRange(sale.map(mapSaleRow), dateFrom, dateTo, r => r.date), scrapType, r => r.scrapType)
        .sort((a, b) => b.date.localeCompare(a.date));
      this.isLoading = false;
      this.lastUpdated = new Date();
    });
  }

  switchType(type: ReportType) {
    this.activeType = type;
    this.haptic.selectionChanged();
  }

  formatDisplayDate = formatDisplayDate;
  formatCurrencyFull = formatCurrencyFull;

  // `source` narrows the export to one date's rows (the date modal); omitted, it exports the whole active tab.
  private getExportData(source?: any[]): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'disposal') {
      const data: DisposalRow[] = source ?? this.disposalRows;
      const headers = ['Date', 'Scrap Type', 'Quantity', 'UOM', 'Disposal Method', 'Disposed By'];
      const rows = data.map(r => [formatDisplayDate(r.date), r.scrapType, r.quantity, r.uom, r.method, r.disposedBy]);
      const jsonRows = data.map(r => ({ Date: r.date, 'Scrap Type': r.scrapType, Quantity: r.quantity, UOM: r.uom, 'Disposal Method': r.method, 'Disposed By': r.disposedBy }));
      return { headers, rows, jsonRows, title: 'Scrap Disposal' };
    }
    if (this.activeType === 'sale') {
      const data: SaleRow[] = source ?? this.saleRows;
      const headers = ['Date', 'Scrap Type', 'Quantity', 'UOM', 'Buyer', 'Rate', 'Amount', 'Invoice No'];
      const rows = data.map(r => [formatDisplayDate(r.date), r.scrapType, r.quantity, r.uom, r.buyer, formatCurrencyFull(r.rate), formatCurrencyFull(r.amount), r.invoiceNo]);
      const jsonRows = data.map(r => ({ Date: r.date, 'Scrap Type': r.scrapType, Quantity: r.quantity, UOM: r.uom, Buyer: r.buyer, Rate: r.rate, Amount: r.amount, 'Invoice No': r.invoiceNo }));
      return { headers, rows, jsonRows, title: 'Scrap Sale' };
    }
    const data: GenerationRow[] = source ?? this.generationRows;
    const headers = ['Date', 'Source', 'Scrap Type', 'Quantity', 'UOM', 'Value'];
    const rows = data.map(r => [formatDisplayDate(r.date), r.source, r.scrapType, r.quantity, r.uom, formatCurrencyFull(r.value)]);
    const jsonRows = data.map(r => ({ Date: r.date, Source: r.source, 'Scrap Type': r.scrapType, Quantity: r.quantity, UOM: r.uom, Value: r.value }));
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

  async exportGroupExcel(group: DateGroup<unknown>) {
    const { jsonRows, title } = this.getExportData(group.rows);
    await exportRowsToExcel(jsonRows, title, this.downloadService, this.toast, group.label);
  }

  async exportGroupPdf(group: DateGroup<unknown>) {
    const { headers, rows, title } = this.getExportData(group.rows);
    await exportRowsToPdf(headers, rows, title, this.downloadService, this.toast, group.label);
  }
}
