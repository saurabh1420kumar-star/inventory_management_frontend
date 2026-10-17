import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportsService } from '../../services/reports.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import { DateGroupedTableComponent, DateSummaryColumn } from '../date-grouped-table/date-grouped-table.component';
import {
  DEALERS,
  toDateInputValue, formatDisplayDate, formatCurrencyFull, daysBetween,
  DateGroup, listDistinct, sumBy,
  exportRowsToExcel, exportRowsToPdf, filterByDateRange, filterByField,
} from '../report-shared';

type ReportType = 'all' | 'pending' | 'dispatch';
type OrderStatus = 'Pending' | 'Approved' | 'In Progress' | 'Dispatched' | 'Delivered' | 'Cancelled';
type StatusFilter = 'all' | OrderStatus;

const KNOWN_STATUSES: OrderStatus[] = ['Pending', 'Approved', 'In Progress', 'Dispatched', 'Delivered', 'Cancelled'];

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
  requestedBy: string;
}

// Backend statuses are upper-snake-case (e.g. "IN_PROGRESS") — normalize to "In Progress" and
// match against the known Title Case vocabulary instead of just capitalizing the first letter.
function normalizeStatus(raw: unknown): OrderStatus {
  const text = String(raw ?? 'Pending').trim().replace(/_/g, ' ');
  const titleCase = text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) as OrderStatus;
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
    status: normalizeStatus(raw.currentStatus ?? raw.status),
    items: Number(raw.items ?? raw.itemCount ?? raw.totalItems ?? 0),
    amount: Number(raw.amount ?? raw.totalAmount ?? 0),
    requestedBy: raw.requestedBy ?? raw.salesmanName ?? raw.createdBy ?? '—',
  };
}

@Component({
  selector: 'app-sales-orders',
  templateUrl: './sales-orders.page.html',
  styleUrls: ['./sales-orders.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent, DateGroupedTableComponent],
})
export class SalesOrdersReportPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);
  private reportsService = inject(ReportsService);

  customers = DEALERS;

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'all';

  orderRows: OrderRow[] = [];
  pendingRows: OrderRow[] = [];
  dispatchRows: OrderRow[] = [];

  readonly orderSummaryColumns: DateSummaryColumn<OrderRow>[] = [
    { header: 'Customers', value: rows => listDistinct(rows, r => r.customer) },
    { header: 'Total Amount', value: rows => formatCurrencyFull(sumBy(rows, r => r.amount)) },
  ];

  readonly dispatchSummaryColumns: DateSummaryColumn<OrderRow>[] = [
    { header: 'Customers', value: rows => listDistinct(rows, r => r.customer) },
    { header: 'Total Items', value: rows => sumBy(rows, r => r.items).toLocaleString('en-IN') },
    { header: 'Total Amount', value: rows => formatCurrencyFull(sumBy(rows, r => r.amount)) },
  ];

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
      let orderRows = filterByDateRange(rows.map(mapOrderRow), this.filters.dateFrom, this.filters.dateTo, r => r.date);
      orderRows = filterByField(orderRows, this.filters.status, r => r.status);
      orderRows = filterByField(orderRows, this.filters.customer, r => r.customer);
      this.orderRows = orderRows.sort((a, b) => b.date.localeCompare(a.date));
      // Stable arrays (not filtering getters): they're bound to the date-grouped table's [rows] input.
      this.pendingRows = this.orderRows.filter(r => r.status === 'Pending');
      this.dispatchRows = this.orderRows.filter(r => r.status === 'Approved' || r.status === 'Dispatched');
      this.isLoading = false;
      this.lastUpdated = new Date();
    });
  }

  switchType(type: ReportType) {
    this.activeType = type;
    this.haptic.selectionChanged();
  }

  dispatchStatusLabel(status: OrderStatus): string {
    return status === 'Approved' ? 'Ready to Dispatch' : 'Out for Delivery';
  }

  daysPending(dateStr: string): number {
    return daysBetween(new Date(dateStr), new Date());
  }

  statusBadgeClass(status: OrderStatus): string {
    if (status === 'Delivered') return 'report-badge-green';
    if (status === 'Dispatched') return 'report-badge-blue';
    if (status === 'Approved') return 'report-badge-blue';
    if (status === 'In Progress') return 'report-badge-blue';
    if (status === 'Cancelled') return 'report-badge-red';
    return 'report-badge-amber';
  }

  formatDisplayDate = formatDisplayDate;
  formatCurrencyFull = formatCurrencyFull;

  // `source` narrows the export to one date's rows (the date modal); omitted, it exports the whole active tab.
  private getExportData(source?: OrderRow[]): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'pending') {
      const data = source ?? this.pendingRows;
      const headers = ['Order No', 'Date', 'Customer', 'Amount', 'Requested By', 'Days Pending'];
      const rows = data.map(r => [r.orderNo, formatDisplayDate(r.date), r.customer, formatCurrencyFull(r.amount), r.requestedBy, this.daysPending(r.date)]);
      const jsonRows = data.map(r => ({ 'Order No': r.orderNo, Date: r.date, Customer: r.customer, Amount: r.amount, 'Requested By': r.requestedBy, 'Days Pending': this.daysPending(r.date) }));
      return { headers, rows, jsonRows, title: 'Pending Approval' };
    }
    if (this.activeType === 'dispatch') {
      const data = source ?? this.dispatchRows;
      const headers = ['Order No', 'Date', 'Customer', 'Items', 'Amount', 'Dispatch Status'];
      const rows = data.map(r => [r.orderNo, formatDisplayDate(r.date), r.customer, r.items, formatCurrencyFull(r.amount), this.dispatchStatusLabel(r.status)]);
      const jsonRows = data.map(r => ({ 'Order No': r.orderNo, Date: r.date, Customer: r.customer, Items: r.items, Amount: r.amount, 'Dispatch Status': this.dispatchStatusLabel(r.status) }));
      return { headers, rows, jsonRows, title: 'Dispatch Queue' };
    }
    const data = source ?? this.orderRows;
    const headers = ['Order No', 'Date', 'Customer', 'Status', 'Amount'];
    const rows = data.map(r => [r.orderNo, formatDisplayDate(r.date), r.customer, r.status, formatCurrencyFull(r.amount)]);
    const jsonRows = data.map(r => ({ 'Order No': r.orderNo, Date: r.date, Customer: r.customer, Status: r.status, Amount: r.amount }));
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

  async exportGroupExcel(group: DateGroup<OrderRow>) {
    const { jsonRows, title } = this.getExportData(group.rows);
    await exportRowsToExcel(jsonRows, title, this.downloadService, this.toast, group.label);
  }

  async exportGroupPdf(group: DateGroup<OrderRow>) {
    const { headers, rows, title } = this.getExportData(group.rows);
    await exportRowsToPdf(headers, rows, title, this.downloadService, this.toast, group.label);
  }
}
