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
  WAREHOUSES,
  toDateInputValue, formatCurrencyFull,
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

// GET /api/reports/inventory/snapshot — Excel #3 Current Stock Report (⚠️ warehouse field may be missing per REPORTS_README.md)
function mapStockRow(raw: any): StockRow {
  const qtyOnHand = Number(raw.qtyOnHand ?? raw.quantity ?? raw.qty ?? raw.stockQty ?? 0);
  const unitValue = Number(raw.unitValue ?? raw.unitPrice ?? raw.rate ?? raw.costPrice ?? 0);
  return {
    item: raw.item ?? raw.itemName ?? raw.materialName ?? raw.productName ?? raw.name ?? '—',
    category: (raw.category ?? raw.itemCategory ?? 'Raw Material') as Category,
    warehouse: raw.warehouse ?? raw.warehouseName ?? raw.warehouseId ?? '—',
    qtyOnHand,
    unitValue,
    totalValue: Number(raw.totalValue ?? qtyOnHand * unitValue),
  };
}

// GET /api/reports/inventory/low-stock — Excel #7 Minimum Stock Alert
function mapReorderRow(raw: any): ReorderRow {
  const currentQty = Number(raw.currentQty ?? raw.qtyOnHand ?? raw.quantity ?? 0);
  const reorderLevel = Number(raw.reorderLevel ?? raw.minStockLevel ?? raw.minimumStock ?? 0);
  const shortfall = Number(raw.shortfall ?? Math.max(0, reorderLevel - currentQty));
  const status: Status = raw.status ?? (currentQty < reorderLevel * 0.5 ? 'Critical' : currentQty < reorderLevel ? 'Low' : 'OK');
  return {
    item: raw.item ?? raw.itemName ?? raw.materialName ?? raw.name ?? '—',
    category: (raw.category ?? raw.itemCategory ?? 'Raw Material') as Category,
    currentQty,
    reorderLevel,
    shortfall,
    status,
  };
}

@Component({
  selector: 'app-inventory-reports',
  templateUrl: './inventory-reports.page.html',
  styleUrls: ['./inventory-reports.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule, ReportHeroComponent],
})
export class InventoryReportsPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);
  private reportsService = inject(ReportsService);

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

    const snapshotParams = { category: this.filters.category, warehouse: this.filters.warehouse, asOfDate: this.filters.asOfDate };
    const lowStockParams = { category: this.filters.category, warehouse: this.filters.warehouse };

    forkJoin({
      snapshot: this.reportsService.getInventorySnapshot(snapshotParams),
      lowStock: this.reportsService.getLowStock(lowStockParams),
    }).subscribe(({ snapshot, lowStock }) => {
      this.stockRows = snapshot.map(mapStockRow).sort((a, b) => b.totalValue - a.totalValue);
      this.reorderRows = lowStock.map(mapReorderRow).sort((a, b) => b.shortfall - a.shortfall);
      this.buildCategoryRows();
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
