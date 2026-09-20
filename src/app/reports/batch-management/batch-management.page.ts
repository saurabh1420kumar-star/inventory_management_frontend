import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  RAW_MATERIALS, FINISHED_PRODUCTS, WAREHOUSES,
  seededRandom, toDateInputValue, formatDisplayDate, daysBetween,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'lot' | 'production' | 'fg';

interface Filters {
  item: string;
  batchNo: string;
  dateFrom: string;
  dateTo: string;
}

interface BatchPoolEntry {
  batchNo: string;
  item: string;
  type: 'RM' | 'FG';
  shelfLifeDays: number;
}

interface LotRow {
  batchNo: string;
  itemName: string;
  mfgDate: string;
  expiryDate: string;
  openingQty: number;
  inward: number;
  outward: number;
  closingQty: number;
  elapsedPct: number;
  lifecycleStatus: 'good' | 'warning' | 'critical';
}

interface ProductionRow {
  batchNo: string;
  product: string;
  productionDate: string;
  qtyProduced: number;
  yieldPct: number;
  status: 'Completed' | 'In Progress' | 'QC Hold';
}

interface FgBatchRow {
  batchNo: string;
  finishedGood: string;
  mfgDate: string;
  expiryDate: string;
  qtyAvailable: number;
  warehouse: string;
}

const BATCH_POOL: BatchPoolEntry[] = [
  { batchNo: 'RM-BATCH-101', item: 'Mango Pulp Concentrate', type: 'RM', shelfLifeDays: 180 },
  { batchNo: 'RM-BATCH-102', item: 'Sugar', type: 'RM', shelfLifeDays: 365 },
  { batchNo: 'RM-BATCH-103', item: 'Citric Acid', type: 'RM', shelfLifeDays: 365 },
  { batchNo: 'RM-BATCH-104', item: 'PET Bottles 1L', type: 'RM', shelfLifeDays: 730 },
  { batchNo: 'FG-BATCH-201', item: 'Mango Nectar 1L', type: 'FG', shelfLifeDays: 270 },
  { batchNo: 'FG-BATCH-202', item: 'Mixed Fruit Pulp 5kg', type: 'FG', shelfLifeDays: 240 },
  { batchNo: 'FG-BATCH-203', item: 'Orange Nectar 200ml', type: 'FG', shelfLifeDays: 270 },
  { batchNo: 'FG-BATCH-204', item: 'Guava Pulp 1kg', type: 'FG', shelfLifeDays: 210 },
];

@Component({
  selector: 'app-batch-management',
  templateUrl: './batch-management.page.html',
  styleUrls: ['./batch-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
})
export class BatchManagementPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);

  items = [...RAW_MATERIALS, ...FINISHED_PRODUCTS];
  batchCodes = BATCH_POOL.map(b => b.batchNo);

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'lot';
  pager: Pager = { page: 1, pageSize: 6 };

  lotRows: LotRow[] = [];
  productionRows: ProductionRow[] = [];
  fgRows: FgBatchRow[] = [];

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 90);
    return { item: 'all', batchNo: 'all', dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;
    setTimeout(() => {
      this.buildLotRows();
      this.buildProductionRows();
      this.buildFgRows();
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

  private lifecycleStatus(pct: number): LotRow['lifecycleStatus'] {
    if (pct >= 90) return 'critical';
    if (pct >= 65) return 'warning';
    return 'good';
  }

  private buildLotRows() {
    const pool = BATCH_POOL.filter(b => this.filters.batchNo === 'all' || b.batchNo === this.filters.batchNo)
      .filter(b => this.filters.item === 'all' || b.item === this.filters.item);
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);
    const now = new Date();

    const rows: LotRow[] = [];
    pool.forEach(entry => {
      const rng = seededRandom(`lot|${entry.batchNo}|${JSON.stringify(this.filters)}`);
      const lots = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < lots; i++) {
        const mfg = new Date(start + rng() * span);
        const expiry = new Date(mfg.getTime() + entry.shelfLifeDays * 86400000);
        const opening = Math.round(200 + rng() * 400);
        const inward = Math.round(rng() * 400);
        const outward = Math.round(rng() * (opening + inward) * 0.6);
        const closing = Math.max(0, opening + inward - outward);
        const elapsedPct = Math.min(100, Math.max(0, Math.round((daysBetween(mfg, now) / entry.shelfLifeDays) * 100)));

        rows.push({
          batchNo: lots > 1 ? `${entry.batchNo}-${String.fromCharCode(65 + i)}` : entry.batchNo,
          itemName: entry.item,
          mfgDate: mfg.toISOString().slice(0, 10),
          expiryDate: expiry.toISOString().slice(0, 10),
          openingQty: opening,
          inward,
          outward,
          closingQty: closing,
          elapsedPct,
          lifecycleStatus: this.lifecycleStatus(elapsedPct),
        });
      }
    });
    this.lotRows = rows.sort((a, b) => b.mfgDate.localeCompare(a.mfgDate));
  }

  private buildProductionRows() {
    const pool = BATCH_POOL.filter(b => b.type === 'FG')
      .filter(b => this.filters.batchNo === 'all' || b.batchNo === this.filters.batchNo)
      .filter(b => this.filters.item === 'all' || b.item === this.filters.item);
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);

    const rows: ProductionRow[] = [];
    pool.forEach(entry => {
      const rng = seededRandom(`prod|${entry.batchNo}|${JSON.stringify(this.filters)}`);
      const runs = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < runs; i++) {
        const date = new Date(start + rng() * span);
        const yieldPct = Math.round(84 + rng() * 15);
        const statusRoll = rng();
        const status: ProductionRow['status'] = statusRoll < 0.75 ? 'Completed' : statusRoll < 0.92 ? 'In Progress' : 'QC Hold';
        rows.push({
          batchNo: runs > 1 ? `${entry.batchNo}-${String.fromCharCode(65 + i)}` : entry.batchNo,
          product: entry.item,
          productionDate: date.toISOString().slice(0, 10),
          qtyProduced: Math.round(500 + rng() * 2000),
          yieldPct,
          status,
        });
      }
    });
    this.productionRows = rows.sort((a, b) => b.productionDate.localeCompare(a.productionDate));
  }

  private buildFgRows() {
    const pool = BATCH_POOL.filter(b => b.type === 'FG')
      .filter(b => this.filters.batchNo === 'all' || b.batchNo === this.filters.batchNo)
      .filter(b => this.filters.item === 'all' || b.item === this.filters.item);
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);

    this.fgRows = pool.map(entry => {
      const rng = seededRandom(`fg|${entry.batchNo}|${JSON.stringify(this.filters)}`);
      const mfg = new Date(start + rng() * span);
      const expiry = new Date(mfg.getTime() + entry.shelfLifeDays * 86400000);
      return {
        batchNo: entry.batchNo,
        finishedGood: entry.item,
        mfgDate: mfg.toISOString().slice(0, 10),
        expiryDate: expiry.toISOString().slice(0, 10),
        qtyAvailable: Math.round(100 + rng() * 900),
        warehouse: WAREHOUSES[Math.floor(rng() * WAREHOUSES.length)],
      };
    }).sort((a, b) => b.mfgDate.localeCompare(a.mfgDate));
  }

  get activeRowCount(): number {
    if (this.activeType === 'lot') return this.lotRows.length;
    if (this.activeType === 'production') return this.productionRows.length;
    return this.fgRows.length;
  }

  get pagedLotRows(): LotRow[] { return paginate(this.lotRows, this.pager); }
  get pagedProductionRows(): ProductionRow[] { return paginate(this.productionRows, this.pager); }
  get pagedFgRows(): FgBatchRow[] { return paginate(this.fgRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }
  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  productionStatusBadgeClass(status: ProductionRow['status']): string {
    if (status === 'Completed') return 'report-badge-green';
    if (status === 'In Progress') return 'report-badge-blue';
    return 'report-badge-red';
  }

  formatDisplayDate = formatDisplayDate;

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'lot') {
      const headers = ['Batch No', 'Item Name', 'Mfg Date', 'Expiry Date', 'Opening Qty', 'Inward', 'Outward', 'Closing Qty'];
      const rows = this.lotRows.map(r => [r.batchNo, r.itemName, formatDisplayDate(r.mfgDate), formatDisplayDate(r.expiryDate), r.openingQty, r.inward, r.outward, r.closingQty]);
      const jsonRows = this.lotRows.map(r => ({ 'Batch No': r.batchNo, 'Item Name': r.itemName, 'Mfg Date': r.mfgDate, 'Expiry Date': r.expiryDate, 'Opening Qty': r.openingQty, Inward: r.inward, Outward: r.outward, 'Closing Qty': r.closingQty }));
      return { headers, rows, jsonRows, title: 'Batch Lot Tracking' };
    }
    if (this.activeType === 'production') {
      const headers = ['Batch No', 'Product', 'Production Date', 'Qty Produced', 'Yield %', 'Status'];
      const rows = this.productionRows.map(r => [r.batchNo, r.product, formatDisplayDate(r.productionDate), r.qtyProduced, r.yieldPct + '%', r.status]);
      const jsonRows = this.productionRows.map(r => ({ 'Batch No': r.batchNo, Product: r.product, 'Production Date': r.productionDate, 'Qty Produced': r.qtyProduced, 'Yield %': r.yieldPct, Status: r.status }));
      return { headers, rows, jsonRows, title: 'Batch Production' };
    }
    const headers = ['Batch No', 'Finished Good', 'Mfg Date', 'Expiry Date', 'Qty Available', 'Warehouse'];
    const rows = this.fgRows.map(r => [r.batchNo, r.finishedGood, formatDisplayDate(r.mfgDate), formatDisplayDate(r.expiryDate), r.qtyAvailable, r.warehouse]);
    const jsonRows = this.fgRows.map(r => ({ 'Batch No': r.batchNo, 'Finished Good': r.finishedGood, 'Mfg Date': r.mfgDate, 'Expiry Date': r.expiryDate, 'Qty Available': r.qtyAvailable, Warehouse: r.warehouse }));
    return { headers, rows, jsonRows, title: 'FG Batch Report' };
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
