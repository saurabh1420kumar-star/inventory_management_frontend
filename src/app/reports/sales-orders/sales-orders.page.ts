import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportsService } from '../../services/reports.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  DEALERS,
  toDateInputValue, formatDisplayDate, formatCurrencyFull, daysBetween,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'all' | 'pending' | 'dispatch';
type OrderStatus = 'Pending' | 'Approved' | 'Dispatched' | 'Delivered' | 'Cancelled';
type StatusFilter = 'all' | OrderStatus;

const STAGES: OrderStatus[] = ['Pending', 'Approved', 'Dispatched', 'Delivered'];
const KNOWN_STATUSES: OrderStatus[] = ['Pending', 'Approved', 'Dispatched', 'Delivered', 'Cancelled'];

interface Filters {
  status: StatusFilter;
  customer: string;
  dateFrom: string;
  dateTo: string;
}

interface OrderRow {
  orderNo: string;
  date: string;
  customer: string;
  status: OrderStatus;
  items: number;
  amount: number;
  expectedDelivery: string;
  requestedBy: string;
}

function normalizeStatus(raw: unknown): OrderStatus {
  const text = String(raw ?? 'Pending').trim();
  const titleCase = (text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()) as OrderStatus;
  return KNOWN_STATUSES.includes(titleCase) ? titleCase : 'Pending';
}

// GET /api/reports/sales-orders/grid — Excel #26 Sales Order Status
// Note: REPORTS_README.md flags a backend bug (Fix 3) where status-count totals are inconsistent
// when filtered by distributorId — this page only consumes the row grid, not a separate count widget.
function mapOrderRow(raw: any): OrderRow {
  return {
    orderNo: raw.orderNo ?? raw.orderNumber ?? raw.soNumber ?? '—',
    date: raw.date ?? raw.orderDate ?? raw.createdAt ?? '',
    customer: raw.customer ?? raw.customerName ?? raw.distributorName ?? '—',
    status: normalizeStatus(raw.status),
    items: Number(raw.items ?? raw.itemCount ?? raw.totalItems ?? 0),
    amount: Number(raw.amount ?? raw.totalAmount ?? 0),
    expectedDelivery: raw.expectedDelivery ?? raw.expectedDeliveryDate ?? '',
    requestedBy: raw.requestedBy ?? raw.salesmanName ?? raw.createdBy ?? '—',
  };
}

@Component({
  selector: 'app-sales-orders',
  templateUrl: './sales-orders.page.html',
  styleUrls: ['./sales-orders.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
})
export class SalesOrdersReportPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);
  private reportsService = inject(ReportsService);

  stages = STAGES;
  customers = DEALERS;

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'all';
  pager: Pager = { page: 1, pageSize: 6 };

  orderRows: OrderRow[] = [];

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { status: 'all', customer: 'all', dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;

    this.reportsService.getSalesOrdersGrid({
      status: this.filters.status === 'all' ? undefined : this.filters.status.toUpperCase(),
      distributorId: this.filters.customer,
      dateFrom: this.filters.dateFrom,
      dateTo: this.filters.dateTo,
    }).subscribe(rows => {
      this.orderRows = rows.map(mapOrderRow).sort((a, b) => b.date.localeCompare(a.date));
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

  get pendingRows(): OrderRow[] {
    return this.orderRows.filter(r => r.status === 'Pending');
  }

  get dispatchRows(): OrderRow[] {
    return this.orderRows.filter(r => r.status === 'Approved' || r.status === 'Dispatched');
  }

  dispatchStatusLabel(status: OrderStatus): string {
    return status === 'Approved' ? 'Ready to Dispatch' : 'Out for Delivery';
  }

  daysPending(dateStr: string): number {
    return daysBetween(new Date(dateStr), new Date());
  }

  get activeRowCount(): number {
    if (this.activeType === 'pending') return this.pendingRows.length;
    if (this.activeType === 'dispatch') return this.dispatchRows.length;
    return this.orderRows.length;
  }

  get pagedOrderRows(): OrderRow[] { return paginate(this.orderRows, this.pager); }
  get pagedPendingRows(): OrderRow[] { return paginate(this.pendingRows, this.pager); }
  get pagedDispatchRows(): OrderRow[] { return paginate(this.dispatchRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }
  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  stageIndex(status: OrderStatus): number {
    return STAGES.indexOf(status);
  }

  statusBadgeClass(status: OrderStatus): string {
    if (status === 'Delivered') return 'report-badge-green';
    if (status === 'Dispatched') return 'report-badge-blue';
    if (status === 'Approved') return 'report-badge-blue';
    if (status === 'Cancelled') return 'report-badge-red';
    return 'report-badge-amber';
  }

  formatDisplayDate = formatDisplayDate;
  formatCurrencyFull = formatCurrencyFull;

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'pending') {
      const headers = ['Order No', 'Date', 'Customer', 'Amount', 'Requested By', 'Days Pending'];
      const rows = this.pendingRows.map(r => [r.orderNo, formatDisplayDate(r.date), r.customer, formatCurrencyFull(r.amount), r.requestedBy, this.daysPending(r.date)]);
      const jsonRows = this.pendingRows.map(r => ({ 'Order No': r.orderNo, Date: r.date, Customer: r.customer, Amount: r.amount, 'Requested By': r.requestedBy, 'Days Pending': this.daysPending(r.date) }));
      return { headers, rows, jsonRows, title: 'Pending Approval' };
    }
    if (this.activeType === 'dispatch') {
      const headers = ['Order No', 'Date', 'Customer', 'Items', 'Amount', 'Dispatch Status'];
      const rows = this.dispatchRows.map(r => [r.orderNo, formatDisplayDate(r.date), r.customer, r.items, formatCurrencyFull(r.amount), this.dispatchStatusLabel(r.status)]);
      const jsonRows = this.dispatchRows.map(r => ({ 'Order No': r.orderNo, Date: r.date, Customer: r.customer, Items: r.items, Amount: r.amount, 'Dispatch Status': this.dispatchStatusLabel(r.status) }));
      return { headers, rows, jsonRows, title: 'Dispatch Queue' };
    }
    const headers = ['Order No', 'Date', 'Customer', 'Status', 'Items', 'Amount', 'Expected Delivery'];
    const rows = this.orderRows.map(r => [r.orderNo, formatDisplayDate(r.date), r.customer, r.status, r.items, formatCurrencyFull(r.amount), formatDisplayDate(r.expectedDelivery)]);
    const jsonRows = this.orderRows.map(r => ({ 'Order No': r.orderNo, Date: r.date, Customer: r.customer, Status: r.status, Items: r.items, Amount: r.amount, 'Expected Delivery': r.expectedDelivery }));
    return { headers, rows, jsonRows, title: 'Sales Orders' };
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
