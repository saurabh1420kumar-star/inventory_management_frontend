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
  seededRandom, pick, toDateInputValue, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'summary' | 'category' | 'reorder';
type Category = 'Raw Material' | 'Finished Goods' | 'Machine Parts' | 'Promotional Items' | 'Scrap';
type Status = 'OK' | 'Low' | 'Critical';

interface Filters {
  category: 'all' | Category;
  warehouse: string;
  asOfDate: string;
}

interface CatalogItem {
  name: string;
  category: Category;
  reorderLevel: number;
}

interface StockRow {
  item: string;
  category: Category;
  warehouse: string;
  qtyOnHand: number;
  unitValue: number;
  totalValue: number;
}

interface CategoryRow {
  category: Category;
  items: number;
  totalQty: number;
  totalValue: number;
  sharePct: number;
}

interface ReorderRow {
  item: string;
  category: Category;
  currentQty: number;
  reorderLevel: number;
  shortfall: number;
  status: Status;
}

const MACHINE_PARTS = ['Filling Nozzle Set', 'Conveyor Belt', 'Capping Head', 'Sensor Module', 'Drive Motor'];
const PROMOTIONAL_ITEMS = ['Branded Cap', 'Standee', 'Banner', 'Umbrella', 'T-Shirt'];
const SCRAP_ITEMS = ['Raw Material Scrap', 'Packing Scrap', 'Rejected FG', 'Plastic Waste'];

const CATALOG: CatalogItem[] = [
  ...RAW_MATERIALS.map(name => ({ name, category: 'Raw Material' as Category, reorderLevel: 200 })),
  ...FINISHED_PRODUCTS.map(name => ({ name, category: 'Finished Goods' as Category, reorderLevel: 150 })),
  ...MACHINE_PARTS.map(name => ({ name, category: 'Machine Parts' as Category, reorderLevel: 10 })),
  ...PROMOTIONAL_ITEMS.map(name => ({ name, category: 'Promotional Items' as Category, reorderLevel: 50 })),
  ...SCRAP_ITEMS.map(name => ({ name, category: 'Scrap' as Category, reorderLevel: 0 })),
];

@Component({
  selector: 'app-inventory-reports',
  templateUrl: './inventory-reports.page.html',
  styleUrls: ['./inventory-reports.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
})
export class InventoryReportsPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);

  categories: Category[] = ['Raw Material', 'Finished Goods', 'Machine Parts', 'Promotional Items', 'Scrap'];
  warehouses = WAREHOUSES;

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'summary';
  pager: Pager = { page: 1, pageSize: 6 };

  stockRows: StockRow[] = [];
  categoryRows: CategoryRow[] = [];
  reorderRows: ReorderRow[] = [];

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    return { category: 'all', warehouse: 'all', asOfDate: toDateInputValue(new Date()) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;
    setTimeout(() => {
      this.buildStockRows();
      this.buildCategoryRows();
      this.buildReorderRows();
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

  private catalogPool(): CatalogItem[] {
    return this.filters.category === 'all' ? CATALOG : CATALOG.filter(c => c.category === this.filters.category);
  }

  private buildStockRows() {
    const warehousePool = this.filters.warehouse === 'all' ? this.warehouses : [this.filters.warehouse];
    this.stockRows = this.catalogPool().map(entry => {
      const rng = seededRandom(`stock|${entry.name}|${this.filters.asOfDate}`);
      const qtyOnHand = Math.round(entry.reorderLevel * (0.4 + rng() * 2.2)) || Math.round(50 + rng() * 400);
      const unitValue = entry.category === 'Machine Parts' ? Math.round(800 + rng() * 4000)
        : entry.category === 'Scrap' ? Math.round(5 + rng() * 20)
        : Math.round(30 + rng() * 220);
      return {
        item: entry.name,
        category: entry.category,
        warehouse: pick(rng, warehousePool),
        qtyOnHand,
        unitValue,
        totalValue: qtyOnHand * unitValue,
      };
    }).sort((a, b) => b.totalValue - a.totalValue);
  }

  private buildCategoryRows() {
    const totalValue = this.stockRows.reduce((s, r) => s + r.totalValue, 0) || 1;
    const groups = new Map<Category, StockRow[]>();
    this.stockRows.forEach(r => {
      if (!groups.has(r.category)) groups.set(r.category, []);
      groups.get(r.category)!.push(r);
    });
    this.categoryRows = Array.from(groups.entries()).map(([category, rows]) => ({
      category,
      items: rows.length,
      totalQty: rows.reduce((s, r) => s + r.qtyOnHand, 0),
      totalValue: rows.reduce((s, r) => s + r.totalValue, 0),
      sharePct: (rows.reduce((s, r) => s + r.totalValue, 0) / totalValue) * 100,
    })).sort((a, b) => b.totalValue - a.totalValue);
  }

  private buildReorderRows() {
    const rows: ReorderRow[] = this.catalogPool()
      .filter(entry => entry.reorderLevel > 0)
      .map(entry => {
        const stock = this.stockRows.find(r => r.item === entry.name);
        const currentQty = stock?.qtyOnHand ?? 0;
        const shortfall = Math.max(0, entry.reorderLevel - currentQty);
        const status: Status = currentQty < entry.reorderLevel * 0.5 ? 'Critical' : currentQty < entry.reorderLevel ? 'Low' : 'OK';
        return { item: entry.name, category: entry.category, currentQty, reorderLevel: entry.reorderLevel, shortfall, status };
      })
      .filter(r => r.status !== 'OK');
    this.reorderRows = rows.sort((a, b) => b.shortfall - a.shortfall);
  }

  get activeRowCount(): number {
    if (this.activeType === 'category') return this.categoryRows.length;
    if (this.activeType === 'reorder') return this.reorderRows.length;
    return this.stockRows.length;
  }

  get pagedStockRows(): StockRow[] { return paginate(this.stockRows, this.pager); }
  get pagedCategoryRows(): CategoryRow[] { return paginate(this.categoryRows, this.pager); }
  get pagedReorderRows(): ReorderRow[] { return paginate(this.reorderRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }
  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  statusBadgeClass(status: Status): string {
    if (status === 'Critical') return 'report-badge-red';
    if (status === 'Low') return 'report-badge-amber';
    return 'report-badge-green';
  }

  formatCurrencyFull = formatCurrencyFull;

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'category') {
      const headers = ['Category', 'Items', 'Total Qty', 'Total Value', 'Share %'];
      const rows = this.categoryRows.map(r => [r.category, r.items, r.totalQty, formatCurrencyFull(r.totalValue), r.sharePct.toFixed(1) + '%']);
      const jsonRows = this.categoryRows.map(r => ({ Category: r.category, Items: r.items, 'Total Qty': r.totalQty, 'Total Value': r.totalValue, 'Share %': r.sharePct.toFixed(1) }));
      return { headers, rows, jsonRows, title: 'Category Wise Valuation' };
    }
    if (this.activeType === 'reorder') {
      const headers = ['Item', 'Category', 'Current Qty', 'Reorder Level', 'Shortfall', 'Status'];
      const rows = this.reorderRows.map(r => [r.item, r.category, r.currentQty, r.reorderLevel, r.shortfall, r.status]);
      const jsonRows = this.reorderRows.map(r => ({ Item: r.item, Category: r.category, 'Current Qty': r.currentQty, 'Reorder Level': r.reorderLevel, Shortfall: r.shortfall, Status: r.status }));
      return { headers, rows, jsonRows, title: 'Low Stock Reorder Report' };
    }
    const headers = ['Item', 'Category', 'Warehouse', 'Qty on Hand', 'Unit Value', 'Total Value'];
    const rows = this.stockRows.map(r => [r.item, r.category, r.warehouse, r.qtyOnHand, formatCurrencyFull(r.unitValue), formatCurrencyFull(r.totalValue)]);
    const jsonRows = this.stockRows.map(r => ({ Item: r.item, Category: r.category, Warehouse: r.warehouse, 'Qty on Hand': r.qtyOnHand, 'Unit Value': r.unitValue, 'Total Value': r.totalValue }));
    return { headers, rows, jsonRows, title: 'Stock Summary' };
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
