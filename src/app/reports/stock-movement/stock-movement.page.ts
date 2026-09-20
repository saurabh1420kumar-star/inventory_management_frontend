import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  RAW_MATERIALS, FINISHED_PRODUCTS, WAREHOUSES, SUPPLIERS,
  seededRandom, pick, toDateInputValue, formatDisplayDate,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'ledger' | 'supplier' | 'material';

interface Filters {
  item: string;
  warehouse: string;
  dateFrom: string;
  dateTo: string;
}

interface LedgerRow {
  date: string;
  voucherNo: string;
  type: 'Inward' | 'Outward' | 'Adjustment';
  party: string;
  inwardQty: number;
  outwardQty: number;
  balanceQty: number;
}

interface SupplierRow {
  supplier: string;
  receipts: number;
  totalQty: number;
  lastReceipt: string;
  topItem: string;
}

interface MaterialInwardRow {
  date: string;
  item: string;
  batchNo: string;
  supplier: string;
  qty: number;
  voucherNo: string;
  warehouse: string;
}

@Component({
  selector: 'app-stock-movement',
  templateUrl: './stock-movement.page.html',
  styleUrls: ['./stock-movement.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
})
export class StockMovementPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);

  items = [...RAW_MATERIALS, ...FINISHED_PRODUCTS];
  warehouses = WAREHOUSES;

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'ledger';
  pager: Pager = { page: 1, pageSize: 6 };

  ledgerRows: LedgerRow[] = [];
  supplierRows: SupplierRow[] = [];
  materialRows: MaterialInwardRow[] = [];

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { item: 'all', warehouse: 'all', dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;
    setTimeout(() => {
      this.buildLedgerRows();
      this.buildSupplierRows();
      this.buildMaterialRows();
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

  private rowCount(rng: () => number, min: number, max: number): number {
    return Math.round(min + rng() * (max - min));
  }

  private buildLedgerRows() {
    const rng = seededRandom('ledger|' + JSON.stringify(this.filters));
    const itemPool = this.filters.item === 'all' ? this.items : [this.filters.item];
    const n = this.rowCount(rng, 24, 60);
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);

    const rows: LedgerRow[] = [];
    let balance = 400 + Math.round(rng() * 400);
    let purCounter = 1, issueCounter = 1, adjCounter = 1;

    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * span);
      const roll = rng();
      const type: LedgerRow['type'] = roll < 0.5 ? 'Inward' : roll < 0.9 ? 'Outward' : 'Adjustment';
      let voucherNo = '';
      let party = '';
      let inwardQty = 0;
      let outwardQty = 0;

      if (type === 'Inward') {
        voucherNo = `PUR-${String(purCounter++).padStart(4, '0')}`;
        party = pick(rng, SUPPLIERS);
        inwardQty = this.rowCount(rng, 50, 500);
        balance += inwardQty;
      } else if (type === 'Outward') {
        voucherNo = `ISSUE-${String(issueCounter++).padStart(4, '0')}`;
        party = 'Production';
        outwardQty = Math.min(balance, this.rowCount(rng, 40, 300));
        balance -= outwardQty;
      } else {
        voucherNo = `ADJ-${String(adjCounter++).padStart(4, '0')}`;
        party = 'Stock Audit';
        const delta = this.rowCount(rng, -30, 30);
        balance = Math.max(0, balance + delta);
        if (delta >= 0) inwardQty = delta; else outwardQty = -delta;
      }

      rows.push({
        date: date.toISOString().slice(0, 10),
        voucherNo,
        type,
        party,
        inwardQty,
        outwardQty,
        balanceQty: balance,
      });
    }

    rows.sort((a, b) => a.date.localeCompare(b.date));
    this.ledgerRows = rows.map(r => ({ ...r, party: this.filters.item === 'all' ? r.party : `${r.party} (${pick(rng, itemPool)})` })).reverse();
  }

  private buildSupplierRows() {
    const rng = seededRandom('supplier|' + JSON.stringify(this.filters));
    this.supplierRows = SUPPLIERS.map(supplier => ({
      supplier,
      receipts: this.rowCount(rng, 4, 28),
      totalQty: this.rowCount(rng, 800, 6000),
      lastReceipt: new Date(new Date(this.filters.dateTo).getTime() - rng() * 10 * 86400000).toISOString().slice(0, 10),
      topItem: pick(rng, this.filters.item === 'all' ? this.items : [this.filters.item]),
    })).sort((a, b) => b.totalQty - a.totalQty);
  }

  private buildMaterialRows() {
    const rng = seededRandom('material|' + JSON.stringify(this.filters));
    const itemPool = this.filters.item === 'all' ? this.items : [this.filters.item];
    const warehousePool = this.filters.warehouse === 'all' ? this.warehouses : [this.filters.warehouse];
    const n = this.rowCount(rng, 18, 45);
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);
    let counter = 1;

    const rows: MaterialInwardRow[] = [];
    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * span);
      rows.push({
        date: date.toISOString().slice(0, 10),
        item: pick(rng, itemPool),
        batchNo: `RM-BATCH-${String(this.rowCount(rng, 100, 999))}`,
        supplier: pick(rng, SUPPLIERS),
        qty: this.rowCount(rng, 100, 1200),
        voucherNo: `PUR-${String(counter++).padStart(4, '0')}`,
        warehouse: pick(rng, warehousePool),
      });
    }
    this.materialRows = rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  get activeRowCount(): number {
    if (this.activeType === 'ledger') return this.ledgerRows.length;
    if (this.activeType === 'supplier') return this.supplierRows.length;
    return this.materialRows.length;
  }

  get pagedLedgerRows(): LedgerRow[] { return paginate(this.ledgerRows, this.pager); }
  get pagedSupplierRows(): SupplierRow[] { return paginate(this.supplierRows, this.pager); }
  get pagedMaterialRows(): MaterialInwardRow[] { return paginate(this.materialRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }

  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') {
    if (p === '...') return;
    this.pager.page = p;
  }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  typeBadgeClass(type: LedgerRow['type']): string {
    if (type === 'Inward') return 'report-badge-green';
    if (type === 'Outward') return 'report-badge-blue';
    return 'report-badge-amber';
  }

  formatDisplayDate = formatDisplayDate;

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'ledger') {
      const headers = ['Date', 'Voucher No', 'Type', 'Party / Ref No', 'Inward Qty', 'Outward Qty', 'Balance Qty'];
      const rows = this.ledgerRows.map(r => [formatDisplayDate(r.date), r.voucherNo, r.type, r.party, r.inwardQty || '-', r.outwardQty || '-', r.balanceQty]);
      const jsonRows = this.ledgerRows.map(r => ({ Date: r.date, 'Voucher No': r.voucherNo, Type: r.type, 'Party / Ref No': r.party, 'Inward Qty': r.inwardQty, 'Outward Qty': r.outwardQty, 'Balance Qty': r.balanceQty }));
      return { headers, rows, jsonRows, title: 'Stock Ledger' };
    }
    if (this.activeType === 'supplier') {
      const headers = ['Supplier', 'Receipts', 'Total Qty Received', 'Last Receipt', 'Top Item'];
      const rows = this.supplierRows.map(r => [r.supplier, r.receipts, r.totalQty, formatDisplayDate(r.lastReceipt), r.topItem]);
      const jsonRows = this.supplierRows.map(r => ({ Supplier: r.supplier, Receipts: r.receipts, 'Total Qty Received': r.totalQty, 'Last Receipt': r.lastReceipt, 'Top Item': r.topItem }));
      return { headers, rows, jsonRows, title: 'Supplier Wise Inward' };
    }
    const headers = ['Date', 'Item', 'Batch No', 'Supplier', 'Qty Received', 'Voucher No', 'Warehouse'];
    const rows = this.materialRows.map(r => [formatDisplayDate(r.date), r.item, r.batchNo, r.supplier, r.qty, r.voucherNo, r.warehouse]);
    const jsonRows = this.materialRows.map(r => ({ Date: r.date, Item: r.item, 'Batch No': r.batchNo, Supplier: r.supplier, 'Qty Received': r.qty, 'Voucher No': r.voucherNo, Warehouse: r.warehouse }));
    return { headers, rows, jsonRows, title: 'Material Inward' };
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
