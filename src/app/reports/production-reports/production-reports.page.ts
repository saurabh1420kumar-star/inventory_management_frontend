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
  toDateInputValue, formatDisplayDate, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'production' | 'bom' | 'consumption' | 'cost' | 'summary' | 'daily';

interface Filters {
  dateFrom: string;
  dateTo: string;
}

interface ProductionRow {
  date: string;
  product: string;
  batchNo: string;
  qtyProduced: number;
  uom: string;
}

interface BomRow {
  product: string;
  bomName: string;
  component: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  contributionPercent: number;
  effectiveCostPerUnit: number;
}

interface ConsumptionRow {
  productionNumber: string;
  product: string;
  rawMaterial: string;
  qtyPlanned: number;
  qtyActual: number;
  variance: number;
}

interface CostRow {
  date: string;
  product: string;
  batchNo: string;
  materialCost: number;
  additionalCost: number;
  totalCost: number;
  costPerUnit: number;
}

interface SummaryRow {
  product: string;
  totalQuantity: number;
  runCount: number;
  totalCost: number;
}

interface DailySummaryRow {
  date: string;
  totalQty: number;
  totalCost: number;
  totalRuns: number;
}

// GET /api/reports/production/log — Excel #13 Production Report
// Note: batchNumber comes back as "" on every sample run; productionNumber is the real identifier.
function mapProductionRow(raw: any): ProductionRow {
  const batchNumber = String(raw.batchNumber ?? '').trim();
  return {
    date: raw.date ?? raw.productionDate ?? '',
    product: raw.product ?? raw.productName ?? raw.finishedProductName ?? '—',
    batchNo: batchNumber || raw.productionNumber || raw.batchNo || '—',
    qtyProduced: Number(raw.qtyProduced ?? raw.quantityProduced ?? raw.quantity ?? 0),
    uom: raw.outputUnit ?? raw.uom ?? raw.unit ?? 'PCS',
  };
}

// GET /api/reports/production/bom-consumption — Excel #15 Material Consumption
function mapConsumptionRow(raw: any): ConsumptionRow {
  return {
    productionNumber: raw.productionNumber ?? '—',
    product: raw.productName ?? raw.product ?? raw.finishedProductName ?? '—',
    rawMaterial: raw.rawMaterialName ?? raw.rawMaterial ?? raw.materialName ?? '—',
    qtyPlanned: Number(raw.quantityPlanned ?? raw.qtyPlanned ?? 0),
    qtyActual: Number(raw.quantityActual ?? raw.qtyConsumed ?? raw.qtyActual ?? 0),
    variance: Number(raw.variance ?? 0),
  };
}

// GET /api/reports/production/cost — per-run cost breakdown (Excel #17 Category 3, now live)
function mapCostRow(raw: any): CostRow {
  return {
    date: raw.productionDate ?? raw.date ?? '',
    product: raw.finishedProductName ?? raw.productName ?? '—',
    batchNo: (raw.batchNumber && String(raw.batchNumber).trim()) ? raw.batchNumber : (raw.productionNumber ?? '—'),
    materialCost: Number(raw.totalRawMaterialCost ?? 0),
    additionalCost: Number(raw.totalAdditionalCost ?? 0),
    totalCost: Number(raw.totalProductionCost ?? 0),
    costPerUnit: Number(raw.costPerUnit ?? 0),
  };
}

// GET /api/reports/production/summary — lifetime totals per finished product
function mapSummaryRow(raw: any): SummaryRow {
  return {
    product: raw.finishedProductName ?? '—',
    totalQuantity: Number(raw.totalQuantity ?? 0),
    runCount: Number(raw.runCount ?? 0),
    totalCost: Number(raw.totalCost ?? 0),
  };
}

// GET /api/reports/production/daily-summary — totals per production date
function mapDailySummaryRow(raw: any): DailySummaryRow {
  return {
    date: raw.productionDate ?? '',
    totalQty: Number(raw.totalQuantityProduced ?? 0),
    totalCost: Number(raw.totalProductionCost ?? 0),
    totalRuns: Number(raw.totalRuns ?? 0),
  };
}

// GET /api/reports/production/bom-report — one BOM per finished product with a nested components[] array; flattened to one row per component.
function flattenBomReport(list: any[]): BomRow[] {
  const rows: BomRow[] = [];
  list.forEach((bom) => {
    const components = Array.isArray(bom.components) ? bom.components : [];
    components.forEach((c: any) => {
      rows.push({
        product: bom.finishedProductName ?? '—',
        bomName: bom.bomName ?? '—',
        component: c.rawMaterialName ?? '—',
        qty: Number(c.quantity ?? 0),
        uom: c.unit ?? '—',
        rate: Number(c.rate ?? 0),
        amount: Number(c.amount ?? 0),
        contributionPercent: Number(c.contributionPercent ?? 0),
        effectiveCostPerUnit: Number(bom.effectiveRatePerUnit ?? 0),
      });
    });
  });
  return rows;
}

@Component({
  selector: 'app-production-reports',
  templateUrl: './production-reports.page.html',
  styleUrls: ['./production-reports.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
})
export class ProductionReportsPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);
  private reportsService = inject(ReportsService);

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'production';
  pager: Pager = { page: 1, pageSize: 6 };

  productionRows: ProductionRow[] = [];
  bomRows: BomRow[] = [];
  consumptionRows: ConsumptionRow[] = [];
  costRows: CostRow[] = [];
  summaryRows: SummaryRow[] = [];
  dailySummaryRows: DailySummaryRow[] = [];

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;

    const commonParams = { dateFrom: this.filters.dateFrom, dateTo: this.filters.dateTo };

    forkJoin({
      production: this.reportsService.getProductionLog(commonParams),
      consumption: this.reportsService.getBomConsumption(commonParams),
      cost: this.reportsService.getProductionCost(commonParams),
      bom: this.reportsService.getBomReport(),
      summary: this.reportsService.getProductionSummary(commonParams),
      daily: this.reportsService.getProductionDailySummary(commonParams),
    }).subscribe(({ production, consumption, cost, bom, summary, daily }) => {
      this.productionRows = production.map(mapProductionRow).sort((a, b) => b.date.localeCompare(a.date));
      this.consumptionRows = consumption.map(mapConsumptionRow);
      this.costRows = cost.map(mapCostRow).sort((a, b) => b.date.localeCompare(a.date));
      this.bomRows = flattenBomReport(bom);
      this.summaryRows = summary.map(mapSummaryRow).sort((a, b) => b.totalCost - a.totalCost);
      this.dailySummaryRows = daily.map(mapDailySummaryRow).sort((a, b) => b.date.localeCompare(a.date));
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

  get activeRowCount(): number {
    if (this.activeType === 'production') return this.productionRows.length;
    if (this.activeType === 'bom') return this.bomRows.length;
    if (this.activeType === 'consumption') return this.consumptionRows.length;
    if (this.activeType === 'cost') return this.costRows.length;
    if (this.activeType === 'summary') return this.summaryRows.length;
    return this.dailySummaryRows.length;
  }

  get pagedProductionRows(): ProductionRow[] { return paginate(this.productionRows, this.pager); }
  get pagedBomRows(): BomRow[] { return paginate(this.bomRows, this.pager); }
  get pagedConsumptionRows(): ConsumptionRow[] { return paginate(this.consumptionRows, this.pager); }
  get pagedCostRows(): CostRow[] { return paginate(this.costRows, this.pager); }
  get pagedSummaryRows(): SummaryRow[] { return paginate(this.summaryRows, this.pager); }
  get pagedDailySummaryRows(): DailySummaryRow[] { return paginate(this.dailySummaryRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }
  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  formatDisplayDate = formatDisplayDate;
  formatCurrencyFull = formatCurrencyFull;

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'production') {
      const headers = ['Date', 'Product', 'Batch No', 'Quantity Produced', 'UOM'];
      const rows = this.productionRows.map(r => [formatDisplayDate(r.date), r.product, r.batchNo, r.qtyProduced, r.uom]);
      const jsonRows = this.productionRows.map(r => ({ Date: r.date, Product: r.product, 'Batch No': r.batchNo, 'Quantity Produced': r.qtyProduced, UOM: r.uom }));
      return { headers, rows, jsonRows, title: 'Daily Production Summary' };
    }
    if (this.activeType === 'bom') {
      const headers = ['Product', 'BOM Name', 'Component', 'Qty / Unit', 'UOM', 'Rate', 'Amount', 'Contribution %', 'Effective Cost / Unit'];
      const rows = this.bomRows.map(r => [r.product, r.bomName, r.component, r.qty, r.uom, formatCurrencyFull(r.rate), formatCurrencyFull(r.amount), r.contributionPercent.toFixed(2) + '%', formatCurrencyFull(r.effectiveCostPerUnit)]);
      const jsonRows = this.bomRows.map(r => ({ Product: r.product, 'BOM Name': r.bomName, Component: r.component, 'Qty / Unit': r.qty, UOM: r.uom, Rate: r.rate, Amount: r.amount, 'Contribution %': r.contributionPercent, 'Effective Cost / Unit': r.effectiveCostPerUnit }));
      return { headers, rows, jsonRows, title: 'BOM Report' };
    }
    if (this.activeType === 'consumption') {
      const headers = ['Production No', 'Product', 'Raw Material', 'Qty Planned', 'Qty Actual', 'Variance'];
      const rows = this.consumptionRows.map(r => [r.productionNumber, r.product, r.rawMaterial, r.qtyPlanned, r.qtyActual, r.variance]);
      const jsonRows = this.consumptionRows.map(r => ({ 'Production No': r.productionNumber, Product: r.product, 'Raw Material': r.rawMaterial, 'Qty Planned': r.qtyPlanned, 'Qty Actual': r.qtyActual, Variance: r.variance }));
      return { headers, rows, jsonRows, title: 'Material Consumption' };
    }
    if (this.activeType === 'cost') {
      const headers = ['Date', 'Product', 'Batch No', 'Raw Material Cost', 'Additional Cost', 'Total Cost', 'Cost / Unit'];
      const rows = this.costRows.map(r => [formatDisplayDate(r.date), r.product, r.batchNo, formatCurrencyFull(r.materialCost), formatCurrencyFull(r.additionalCost), formatCurrencyFull(r.totalCost), formatCurrencyFull(r.costPerUnit)]);
      const jsonRows = this.costRows.map(r => ({ Date: r.date, Product: r.product, 'Batch No': r.batchNo, 'Raw Material Cost': r.materialCost, 'Additional Cost': r.additionalCost, 'Total Cost': r.totalCost, 'Cost / Unit': r.costPerUnit }));
      return { headers, rows, jsonRows, title: 'Production Cost Report' };
    }
    if (this.activeType === 'summary') {
      const headers = ['Product', 'Total Quantity', 'Run Count', 'Total Cost'];
      const rows = this.summaryRows.map(r => [r.product, r.totalQuantity, r.runCount, formatCurrencyFull(r.totalCost)]);
      const jsonRows = this.summaryRows.map(r => ({ Product: r.product, 'Total Quantity': r.totalQuantity, 'Run Count': r.runCount, 'Total Cost': r.totalCost }));
      return { headers, rows, jsonRows, title: 'Production Summary' };
    }
    const headers = ['Date', 'Total Quantity Produced', 'Total Production Cost', 'Total Runs'];
    const rows = this.dailySummaryRows.map(r => [formatDisplayDate(r.date), r.totalQty, formatCurrencyFull(r.totalCost), r.totalRuns]);
    const jsonRows = this.dailySummaryRows.map(r => ({ Date: r.date, 'Total Quantity Produced': r.totalQty, 'Total Production Cost': r.totalCost, 'Total Runs': r.totalRuns }));
    return { headers, rows, jsonRows, title: 'Daily Production Summary (Totals)' };
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
