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
  toDateInputValue, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf, filterByField,
} from '../report-shared';

type ReportType = 'summary' | 'category' | 'reorder';
// Backend category code, e.g. RAW / FINISHED / SCRAP
type Category = string;
type Status = 'OK' | 'Low' | 'Critical';

interface Filters {
  category: string;
  asOfDate: string;
}

interface StockRow {
  item: string;
  sku: string;
  category: Category;
  qtyOnHand: number;
  unitValue: number;
  totalValue: number;
  minThreshold: number | null;
  belowThreshold: boolean;
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
  sku: string;
  category: Category;
  currentQty: number;
  price: number;
  reorderLevel: number;
  belowThreshold: boolean;
}

// GET /api/reports/inventory/snapshot — Excel #3 Current Stock Report
function mapStockRow(raw: any): StockRow {
  const qtyOnHand = Number(raw.quantity ?? raw.qtyOnHand ?? raw.qty ?? raw.stockQty ?? 0);
  // API sends `price` (unit price); `totalValue` can be null, so derive whichever side is missing
  const rawUnit = raw.price ?? raw.unitValue ?? raw.unitPrice ?? raw.rate ?? raw.costPrice;
  const rawTotal = raw.totalValue;
  const unitValue = rawUnit != null ? Number(rawUnit) : (rawTotal != null && qtyOnHand ? Number(rawTotal) / qtyOnHand : 0);
  const totalValue = rawTotal != null ? Number(rawTotal) : qtyOnHand * unitValue;
  const minThreshold = raw.minimumThreshold ?? raw.minStockLevel ?? null;
  return {
    item: raw.itemName ?? raw.item ?? raw.materialName ?? raw.productName ?? raw.name ?? raw.sku ?? '—',
    sku: raw.sku ?? '—',
    category: (raw.category ?? raw.itemCategory ?? 'RAW') as Category,
    qtyOnHand,
    unitValue,
    totalValue,
    minThreshold: minThreshold != null ? Number(minThreshold) : null,
    belowThreshold: !!raw.belowThreshold,
  };
}

// GET /api/reports/inventory/low-stock — Excel #7 Minimum Stock Alert
function mapReorderRow(raw: any): ReorderRow {
  const currentQty = Number(raw.quantity ?? raw.currentQty ?? raw.qtyOnHand ?? 0);
  const reorderLevel = Number(raw.minimumThreshold ?? raw.reorderLevel ?? raw.minStockLevel ?? raw.minimumStock ?? 0);
  return {
    item: raw.itemName ?? raw.item ?? raw.materialName ?? raw.name ?? raw.sku ?? '—',
    sku: raw.sku ?? '—',
    category: (raw.category ?? raw.itemCategory ?? 'RAW') as Category,
    currentQty,
    price: Number(raw.price ?? raw.unitPrice ?? raw.unitValue ?? 0),
    reorderLevel,
    belowThreshold: raw.belowThreshold != null ? !!raw.belowThreshold : currentQty < reorderLevel,
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

  // `value` is the code the reports API stores and filters on; the snapshot currently returns RAW / FINISHED / SCRAP only
  categories: { value: Category; label: string }[] = [
    { value: 'RAW', label: 'Raw Material' },
    { value: 'FINISHED', label: 'Finished Goods' },
    { value: 'MACHINE_PARTS', label: 'Machine Parts' },
    { value: 'PROMOTIONAL_ITEMS', label: 'Promotional Items' },
    { value: 'SCRAP', label: 'Scrap' },
  ];

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
    return { category: 'all', asOfDate: toDateInputValue(new Date()) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;

    const snapshotParams = { category: this.filters.category, asOfDate: this.filters.asOfDate };
    const lowStockParams = { category: this.filters.category };

    forkJoin({
      snapshot: this.reportsService.getInventorySnapshot(snapshotParams),
      lowStock: this.reportsService.getLowStock(lowStockParams),
    }).subscribe(({ snapshot, lowStock }) => {
      let stockRows = snapshot.map(mapStockRow);
      stockRows = filterByField(stockRows, this.filters.category, r => r.category);
      this.stockRows = stockRows.sort((a, b) => b.totalValue - a.totalValue);

      this.reorderRows = filterByField(lowStock.map(mapReorderRow), this.filters.category, r => r.category)
        .sort((a, b) => Number(b.belowThreshold) - Number(a.belowThreshold) || a.currentQty - b.currentQty);
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
      const headers = ['Item', 'SKU', 'Category', 'Current Qty', 'Price', 'Reorder Level', 'Status'];
      const status = (r: ReorderRow) => r.belowThreshold ? 'Not OK' : 'OK';
      const rows = this.reorderRows.map(r => [r.item, r.sku, r.category, r.currentQty, formatCurrencyFull(r.price), r.reorderLevel, status(r)]);
      const jsonRows = this.reorderRows.map(r => ({ Item: r.item, SKU: r.sku, Category: r.category, 'Current Qty': r.currentQty, Price: r.price, 'Reorder Level': r.reorderLevel, Status: status(r) }));
      return { headers, rows, jsonRows, title: 'Low Stock Reorder Report' };
    }
    const headers = ['Item', 'SKU', 'Category', 'Qty on Hand', 'Unit Price', 'Total Value', 'Min Threshold', 'Status'];
    const status = (r: StockRow) => r.belowThreshold ? 'Below Threshold' : 'OK';
    const rows = this.stockRows.map(r => [r.item, r.sku, r.category, r.qtyOnHand, formatCurrencyFull(r.unitValue), formatCurrencyFull(r.totalValue), r.minThreshold ?? '—', status(r)]);
    const jsonRows = this.stockRows.map(r => ({ Item: r.item, SKU: r.sku, Category: r.category, 'Qty on Hand': r.qtyOnHand, 'Unit Price': r.unitValue, 'Total Value': r.totalValue, 'Min Threshold': r.minThreshold ?? '', Status: status(r) }));
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
