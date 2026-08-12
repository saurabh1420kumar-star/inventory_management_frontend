import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  FINISHED_PRODUCTS, RAW_MATERIALS, PLANTS,
  seededRandom, pick, toDateInputValue, formatDisplayDate, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'production' | 'bom' | 'consumption' | 'cost';
const UOMS = ['PCS', 'LTR', 'KG', 'BOX'];

interface Filters {
  plant: string;
  product: string;
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
  component: string;
  qtyPerUnit: number;
  uom: string;
  batchNo: string;
}

interface ConsumptionRow {
  date: string;
  rawMaterial: string;
  batchConsumed: string;
  qtyConsumed: number;
  uom: string;
  product: string;
}

interface CostRow {
  date: string;
  product: string;
  batchNo: string;
  materialCost: number;
  laborCost: number;
  overhead: number;
  totalCost: number;
  costPerUnit: number;
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

  plants = PLANTS;
  products = FINISHED_PRODUCTS;

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'production';
  pager: Pager = { page: 1, pageSize: 6 };

  productionRows: ProductionRow[] = [];
  bomRows: BomRow[] = [];
  consumptionRows: ConsumptionRow[] = [];
  costRows: CostRow[] = [];

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { plant: 'all', product: 'all', dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;
    setTimeout(() => {
      this.buildProductionRows();
      this.buildBomRows();
      this.buildConsumptionRows();
      this.buildCostRows();
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

  private uomFor(rng: () => number, product: string): string {
    if (product.includes('1L') || product.includes('200ml')) return 'LTR';
    if (product.includes('kg')) return 'KG';
    return pick(rng, UOMS);
  }

  private buildProductionRows() {
    const productPool = this.filters.product === 'all' ? this.products : [this.filters.product];
    const rng = seededRandom('production|' + JSON.stringify(this.filters));
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);
    const n = Math.round(16 + rng() * 34);
    let counter = 1;

    const rows: ProductionRow[] = [];
    for (let i = 0; i < n; i++) {
      const product = pick(rng, productPool);
      const date = new Date(start + rng() * span);
      rows.push({
        date: date.toISOString().slice(0, 10),
        product,
        batchNo: `FG-BATCH-${String(200 + counter++)}`,
        qtyProduced: Math.round(300 + rng() * 1800),
        uom: this.uomFor(rng, product),
      });
    }
    this.productionRows = rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  private buildBomRows() {
    const productPool = this.filters.product === 'all' ? this.products : [this.filters.product];
    const rows: BomRow[] = [];
    productPool.forEach(product => {
      const rng = seededRandom(`bom|${product}`);
      const componentCount = 3 + Math.floor(rng() * 3);
      const components = [...RAW_MATERIALS].sort(() => rng() - 0.5).slice(0, componentCount);
      components.forEach((component, idx) => {
        rows.push({
          product,
          component,
          qtyPerUnit: +(0.02 + rng() * 1.2).toFixed(3),
          uom: idx === 0 ? 'LTR' : pick(rng, ['KG', 'PCS', 'GM']),
          batchNo: `RM-BATCH-${100 + idx}`,
        });
      });
    });
    this.bomRows = rows;
  }

  private buildConsumptionRows() {
    const productPool = this.filters.product === 'all' ? this.products : [this.filters.product];
    const rng = seededRandom('consumption|' + JSON.stringify(this.filters));
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);
    const n = Math.round(14 + rng() * 30);

    const rows: ConsumptionRow[] = [];
    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * span);
      rows.push({
        date: date.toISOString().slice(0, 10),
        rawMaterial: pick(rng, RAW_MATERIALS),
        batchConsumed: `RM-BATCH-${100 + Math.floor(rng() * 4)}`,
        qtyConsumed: Math.round(50 + rng() * 500),
        uom: pick(rng, ['KG', 'LTR', 'PCS']),
        product: pick(rng, productPool),
      });
    }
    this.consumptionRows = rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  private buildCostRows() {
    const productPool = this.filters.product === 'all' ? this.products : [this.filters.product];
    const rng = seededRandom('cost|' + JSON.stringify(this.filters));
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);
    const n = Math.round(10 + rng() * 20);
    let counter = 1;

    const rows: CostRow[] = [];
    for (let i = 0; i < n; i++) {
      const product = pick(rng, productPool);
      const date = new Date(start + rng() * span);
      const qty = Math.round(300 + rng() * 1500);
      const materialCost = Math.round(qty * (18 + rng() * 12));
      const laborCost = Math.round(materialCost * (0.12 + rng() * 0.08));
      const overhead = Math.round(materialCost * (0.08 + rng() * 0.06));
      const totalCost = materialCost + laborCost + overhead;
      rows.push({
        date: date.toISOString().slice(0, 10),
        product,
        batchNo: `FG-BATCH-${String(200 + counter++)}`,
        materialCost,
        laborCost,
        overhead,
        totalCost,
        costPerUnit: +(totalCost / qty).toFixed(2),
      });
    }
    this.costRows = rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  get activeRowCount(): number {
    if (this.activeType === 'production') return this.productionRows.length;
    if (this.activeType === 'bom') return this.bomRows.length;
    if (this.activeType === 'consumption') return this.consumptionRows.length;
    return this.costRows.length;
  }

  get pagedProductionRows(): ProductionRow[] { return paginate(this.productionRows, this.pager); }
  get pagedBomRows(): BomRow[] { return paginate(this.bomRows, this.pager); }
  get pagedConsumptionRows(): ConsumptionRow[] { return paginate(this.consumptionRows, this.pager); }
  get pagedCostRows(): CostRow[] { return paginate(this.costRows, this.pager); }

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
      const headers = ['Product', 'Component', 'Qty Required / Unit', 'UOM', 'Batch No'];
      const rows = this.bomRows.map(r => [r.product, r.component, r.qtyPerUnit, r.uom, r.batchNo]);
      const jsonRows = this.bomRows.map(r => ({ Product: r.product, Component: r.component, 'Qty Required / Unit': r.qtyPerUnit, UOM: r.uom, 'Batch No': r.batchNo }));
      return { headers, rows, jsonRows, title: 'BOM Report' };
    }
    if (this.activeType === 'consumption') {
      const headers = ['Date', 'Raw Material', 'Batch Consumed', 'Qty Consumed', 'UOM', 'Product'];
      const rows = this.consumptionRows.map(r => [formatDisplayDate(r.date), r.rawMaterial, r.batchConsumed, r.qtyConsumed, r.uom, r.product]);
      const jsonRows = this.consumptionRows.map(r => ({ Date: r.date, 'Raw Material': r.rawMaterial, 'Batch Consumed': r.batchConsumed, 'Qty Consumed': r.qtyConsumed, UOM: r.uom, Product: r.product }));
      return { headers, rows, jsonRows, title: 'Material Consumption' };
    }
    const headers = ['Date', 'Product', 'Batch No', 'Material Cost', 'Labor Cost', 'Overhead', 'Total Cost', 'Cost / Unit'];
    const rows = this.costRows.map(r => [formatDisplayDate(r.date), r.product, r.batchNo, formatCurrencyFull(r.materialCost), formatCurrencyFull(r.laborCost), formatCurrencyFull(r.overhead), formatCurrencyFull(r.totalCost), formatCurrencyFull(r.costPerUnit)]);
    const jsonRows = this.costRows.map(r => ({ Date: r.date, Product: r.product, 'Batch No': r.batchNo, 'Material Cost': r.materialCost, 'Labor Cost': r.laborCost, Overhead: r.overhead, 'Total Cost': r.totalCost, 'Cost / Unit': r.costPerUnit }));
    return { headers, rows, jsonRows, title: 'Production Cost Report' };
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
