import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import { DateGroupedTableComponent, DateSummaryColumn } from '../date-grouped-table/date-grouped-table.component';
import {
  RAW_MATERIALS, FINISHED_PRODUCTS, WAREHOUSES,
  seededRandom, toDateInputValue, formatDisplayDate, daysBetween,
  DateGroup, listDistinct, sumBy,
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
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent, DateGroupedTableComponent],
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

  lotRows: LotRow[] = [];
  productionRows: ProductionRow[] = [];
  fgRows: FgBatchRow[] = [];

  readonly lotSummaryColumns: DateSummaryColumn<LotRow>[] = [
    { header: 'Items', value: rows => listDistinct(rows, r => r.itemName) },
    { header: 'Closing Qty', value: rows => sumBy(rows, r => r.closingQty).toLocaleString('en-IN') },
  ];

  readonly productionSummaryColumns: DateSummaryColumn<ProductionRow>[] = [
    { header: 'Products', value: rows => listDistinct(rows, r => r.product) },
    { header: 'Qty Produced', value: rows => sumBy(rows, r => r.qtyProduced).toLocaleString('en-IN') },
  ];

  readonly fgSummaryColumns: DateSummaryColumn<FgBatchRow>[] = [
    { header: 'Finished Goods', value: rows => listDistinct(rows, r => r.finishedGood) },
    { header: 'Qty Available', value: rows => sumBy(rows, r => r.qtyAvailable).toLocaleString('en-IN') },
  ];

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
      this.isLoading = false;
      this.lastUpdated = new Date();
    }, 300);
  }

  switchType(type: ReportType) {
    this.activeType = type;
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

  productionStatusBadgeClass(status: ProductionRow['status']): string {
    if (status === 'Completed') return 'report-badge-green';
    if (status === 'In Progress') return 'report-badge-blue';
    return 'report-badge-red';
  }

  formatDisplayDate = formatDisplayDate;

  // `source` narrows the export to one date's rows (the date modal); omitted, it exports the whole active tab.
  private getExportData(source?: any[]): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'lot') {
      const data: LotRow[] = source ?? this.lotRows;
      const headers = ['Batch No', 'Item Name', 'Mfg Date', 'Expiry Date', 'Opening Qty', 'Inward', 'Outward', 'Closing Qty'];
      const rows = data.map(r => [r.batchNo, r.itemName, formatDisplayDate(r.mfgDate), formatDisplayDate(r.expiryDate), r.openingQty, r.inward, r.outward, r.closingQty]);
      const jsonRows = data.map(r => ({ 'Batch No': r.batchNo, 'Item Name': r.itemName, 'Mfg Date': r.mfgDate, 'Expiry Date': r.expiryDate, 'Opening Qty': r.openingQty, Inward: r.inward, Outward: r.outward, 'Closing Qty': r.closingQty }));
      return { headers, rows, jsonRows, title: 'Batch Lot Tracking' };
    }
    if (this.activeType === 'production') {
      const data: ProductionRow[] = source ?? this.productionRows;
      const headers = ['Batch No', 'Product', 'Production Date', 'Qty Produced', 'Yield %', 'Status'];
      const rows = data.map(r => [r.batchNo, r.product, formatDisplayDate(r.productionDate), r.qtyProduced, r.yieldPct + '%', r.status]);
      const jsonRows = data.map(r => ({ 'Batch No': r.batchNo, Product: r.product, 'Production Date': r.productionDate, 'Qty Produced': r.qtyProduced, 'Yield %': r.yieldPct, Status: r.status }));
      return { headers, rows, jsonRows, title: 'Batch Production' };
    }
    const data: FgBatchRow[] = source ?? this.fgRows;
    const headers = ['Batch No', 'Finished Good', 'Mfg Date', 'Expiry Date', 'Qty Available', 'Warehouse'];
    const rows = data.map(r => [r.batchNo, r.finishedGood, formatDisplayDate(r.mfgDate), formatDisplayDate(r.expiryDate), r.qtyAvailable, r.warehouse]);
    const jsonRows = data.map(r => ({ 'Batch No': r.batchNo, 'Finished Good': r.finishedGood, 'Mfg Date': r.mfgDate, 'Expiry Date': r.expiryDate, 'Qty Available': r.qtyAvailable, Warehouse: r.warehouse }));
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

  async exportGroupExcel(group: DateGroup<unknown>) {
    const { jsonRows, title } = this.getExportData(group.rows);
    await exportRowsToExcel(jsonRows, title, this.downloadService, this.toast, group.label);
  }

  async exportGroupPdf(group: DateGroup<unknown>) {
    const { headers, rows, title } = this.getExportData(group.rows);
    await exportRowsToPdf(headers, rows, title, this.downloadService, this.toast, group.label);
  }
}
