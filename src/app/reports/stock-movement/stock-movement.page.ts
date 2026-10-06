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
  RAW_MATERIALS, FINISHED_PRODUCTS, WAREHOUSES,
  toDateInputValue, formatDisplayDate,
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
  material: string;
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

// GET /api/reports/stock-movement/ledger
function mapLedgerRow(raw: any): LedgerRow {
  const movementType = String(raw.movementType ?? '').toUpperCase();
  const type: LedgerRow['type'] = movementType === 'INWARD' ? 'Inward' : movementType === 'OUTWARD' ? 'Outward' : 'Adjustment';
  return {
    date: raw.date ?? '',
    voucherNo: raw.voucherNo ?? raw.reference ?? '—',
    type,
    material: raw.materialName ?? raw.materialCode ?? '—',
    party: raw.partyName ?? raw.supplierName ?? '—',
    inwardQty: Number(raw.inwardQty ?? 0),
    outwardQty: Number(raw.outwardQty ?? 0),
    balanceQty: Number(raw.balanceQty ?? 0),
  };
}

// GET /api/reports/stock-movement/supplier-wise
function mapSupplierRow(raw: any): SupplierRow {
  return {
    supplier: raw.supplierName ?? '—',
    receipts: Number(raw.receiptsCount ?? 0),
    totalQty: Number(raw.totalQtyReceived ?? 0),
    lastReceipt: raw.lastReceiptDate ?? '',
    topItem: raw.topItem ?? '—',
  };
}

// GET /api/reports/stock-movement/material-inward
function mapMaterialInwardRow(raw: any): MaterialInwardRow {
  return {
    date: raw.date ?? '',
    item: raw.itemName ?? '—',
    batchNo: raw.batchNo ?? '—',
    supplier: raw.supplierName ?? '—',
    qty: Number(raw.qtyReceived ?? 0),
    voucherNo: raw.voucherNo ?? '—',
    warehouse: raw.warehouseLocation ?? '—',
  };
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
  private reportsService = inject(ReportsService);

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

    const params = { item: this.filters.item, warehouse: this.filters.warehouse, dateFrom: this.filters.dateFrom, dateTo: this.filters.dateTo };

    forkJoin({
      ledger: this.reportsService.getStockLedger(params),
      supplier: this.reportsService.getSupplierWiseInward(params),
      material: this.reportsService.getMaterialInward(params),
    }).subscribe(({ ledger, supplier, material }) => {
      this.ledgerRows = ledger.map(mapLedgerRow).sort((a, b) => b.date.localeCompare(a.date));
      this.supplierRows = supplier.map(mapSupplierRow).sort((a, b) => b.totalQty - a.totalQty);
      this.materialRows = material.map(mapMaterialInwardRow).sort((a, b) => b.date.localeCompare(a.date));
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
      const headers = ['Date', 'Voucher No', 'Type', 'Material', 'Party / Ref No', 'Inward Qty', 'Outward Qty', 'Balance Qty'];
      const rows = this.ledgerRows.map(r => [formatDisplayDate(r.date), r.voucherNo, r.type, r.material, r.party, r.inwardQty || '-', r.outwardQty || '-', r.balanceQty]);
      const jsonRows = this.ledgerRows.map(r => ({ Date: r.date, 'Voucher No': r.voucherNo, Type: r.type, Material: r.material, 'Party / Ref No': r.party, 'Inward Qty': r.inwardQty, 'Outward Qty': r.outwardQty, 'Balance Qty': r.balanceQty }));
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
