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
  ROUTES,
  toDateInputValue, formatDisplayDate, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'register' | 'pending' | 'confirmation';
type DispatchStatus = 'Pending' | 'In-Transit' | 'Delivered';
type StatusFilter = 'all' | DispatchStatus;

interface Filters {
  dateFrom: string;
  dateTo: string;
  route: string;
  status: StatusFilter;
}

// Mirrors the raw GET /reports/dispatch/register response fields (minus id and orderId — internal
// foreign keys, not display values). deliveryStatus is normalized to the same DispatchStatus union
// used everywhere else on this page, so statusBadgeClass() works unchanged.
interface DispatchRegisterRow {
  gdnNumber: string;
  gdnDate: string;
  customerName: string;
  vehicleNo: string;
  driverName: string;
  driverMobile: string;
  transportName: string;
  itemCount: number;
  totalPackages: number;
  totalWeight: number;
  shippingAddress: string;
  status: DispatchStatus;
}

function normalizeDeliveryStatus(raw: string): DispatchStatus {
  const s = (raw ?? '').toUpperCase();
  if (s === 'DELIVERED') return 'Delivered';
  if (s === 'IN_TRANSIT' || s === 'IN-TRANSIT' || s === 'INTRANSIT') return 'In-Transit';
  return 'Pending';
}

function mapDispatchRegisterRow(raw: any): DispatchRegisterRow {
  return {
    gdnNumber: raw.gdnNumber ?? '—',
    gdnDate: raw.gdnDate ?? '',
    customerName: (raw.customerName ?? '—').trim(),
    vehicleNo: raw.vehicleNo ?? '—',
    driverName: raw.driverName ?? '—',
    driverMobile: raw.driverMobile ?? '',
    transportName: raw.transportName ?? '—',
    itemCount: Number(raw.itemCount ?? 0),
    totalPackages: Number(raw.totalPackages ?? 0),
    totalWeight: Number(raw.totalWeight ?? 0),
    shippingAddress: (raw.shippingAddress ?? '—').replace(/\n/g, ', '),
    status: normalizeDeliveryStatus(raw.deliveryStatus),
  };
}

// Mirrors the raw GET /reports/dispatch/pending response fields (minus id — an internal key, not a display value).
interface PendingDispatchRow {
  challanNo: string;
  customer: string;
  items: number;
  amount: number;
  readySinceDays: number;
  gdnDate: string;
}

function mapPendingDispatchRow(raw: any): PendingDispatchRow {
  return {
    challanNo: raw.challanNo ?? '—',
    customer: (raw.customer ?? '—').trim(),
    items: Number(raw.items ?? 0),
    amount: Number(raw.amount ?? 0),
    readySinceDays: Number(raw.readySinceDays ?? 0),
    gdnDate: raw.gdnDate ?? '',
  };
}

// Mirrors the raw GET /reports/dispatch/delivery-confirmation response fields (minus id).
interface DeliveryConfirmationRow {
  challanNo: string;
  customer: string;
  deliveredDate: string;
  receivedBy: string | null;
  podStatus: string;
}

function mapDeliveryConfirmationRow(raw: any): DeliveryConfirmationRow {
  return {
    challanNo: raw.challanNo || '—',
    customer: (raw.customer ?? '—').trim(),
    deliveredDate: raw.deliveredDate ?? '',
    receivedBy: raw.receivedBy ?? null,
    podStatus: raw.podStatus ?? '—',
  };
}

@Component({
  selector: 'app-dispatch-delivery',
  templateUrl: './dispatch-delivery.page.html',
  styleUrls: ['./dispatch-delivery.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
})
export class DispatchDeliveryReportPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);
  private reportsService = inject(ReportsService);

  routes = ROUTES;

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'register';
  pager: Pager = { page: 1, pageSize: 5 };

  dispatchRegisterRows: DispatchRegisterRow[] = [];
  pendingDispatchRows: PendingDispatchRow[] = [];
  deliveryConfirmationRows: DeliveryConfirmationRow[] = [];

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 14);
    return { dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now), route: 'all', status: 'all' };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;

    const dateParams = { dateFrom: this.filters.dateFrom, dateTo: this.filters.dateTo };
    forkJoin({
      register: this.reportsService.getDispatchRegister(dateParams),
      pending: this.reportsService.getDispatchPending(dateParams),
      confirmation: this.reportsService.getDeliveryConfirmation(dateParams),
    }).subscribe(({ register, pending, confirmation }) => {
      this.dispatchRegisterRows = register.map(mapDispatchRegisterRow).sort((a, b) => b.gdnDate.localeCompare(a.gdnDate));
      this.pendingDispatchRows = pending.map(mapPendingDispatchRow);
      this.deliveryConfirmationRows = confirmation.map(mapDeliveryConfirmationRow);
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

  statusBadgeClass(status: DispatchStatus): string {
    if (status === 'Delivered') return 'report-badge-green';
    if (status === 'In-Transit') return 'report-badge-blue';
    return 'report-badge-amber';
  }

  get activeRowCount(): number {
    if (this.activeType === 'pending') return this.pendingDispatchRows.length;
    if (this.activeType === 'confirmation') return this.deliveryConfirmationRows.length;
    return this.dispatchRegisterRows.length;
  }

  get pagedDispatchRows(): DispatchRegisterRow[] { return paginate(this.dispatchRegisterRows, this.pager); }
  get pagedPendingRows(): PendingDispatchRow[] { return paginate(this.pendingDispatchRows, this.pager); }
  get pagedDeliveredRows(): DeliveryConfirmationRow[] { return paginate(this.deliveryConfirmationRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }
  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  formatDisplayDate = formatDisplayDate;
  formatCurrencyFull = formatCurrencyFull;

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'pending') {
      const headers = ['Challan No', 'Customer', 'Items', 'Amount', 'GDN Date', 'Ready Since (days)'];
      const rows = this.pendingDispatchRows.map(r => [r.challanNo, r.customer, r.items, formatCurrencyFull(r.amount), formatDisplayDate(r.gdnDate), r.readySinceDays]);
      const jsonRows = this.pendingDispatchRows.map(r => ({ 'Challan No': r.challanNo, Customer: r.customer, Items: r.items, Amount: r.amount, 'GDN Date': r.gdnDate, 'Ready Since (days)': r.readySinceDays }));
      return { headers, rows, jsonRows, title: 'Pending Dispatch' };
    }
    if (this.activeType === 'confirmation') {
      const headers = ['Challan No', 'Customer', 'Delivered Date', 'Received By', 'POD Status'];
      const rows = this.deliveryConfirmationRows.map(r => [r.challanNo, r.customer, formatDisplayDate(r.deliveredDate), r.receivedBy ?? '—', r.podStatus]);
      const jsonRows = this.deliveryConfirmationRows.map(r => ({ 'Challan No': r.challanNo, Customer: r.customer, 'Delivered Date': r.deliveredDate, 'Received By': r.receivedBy, 'POD Status': r.podStatus }));
      return { headers, rows, jsonRows, title: 'Delivery Confirmation' };
    }
    const headers = ['GDN No', 'GDN Date', 'Customer', 'Vehicle No', 'Driver', 'Driver Mobile', 'Transport', 'Items', 'Packages', 'Weight (Kg)', 'Shipping Address', 'Status'];
    const rows = this.dispatchRegisterRows.map(r => [
      r.gdnNumber, formatDisplayDate(r.gdnDate), r.customerName, r.vehicleNo, r.driverName, r.driverMobile,
      r.transportName, r.itemCount, r.totalPackages, r.totalWeight, r.shippingAddress, r.status,
    ]);
    const jsonRows = this.dispatchRegisterRows.map(r => ({
      'GDN No': r.gdnNumber, 'GDN Date': r.gdnDate, Customer: r.customerName, 'Vehicle No': r.vehicleNo,
      Driver: r.driverName, 'Driver Mobile': r.driverMobile, Transport: r.transportName, Items: r.itemCount,
      Packages: r.totalPackages, 'Weight (Kg)': r.totalWeight, 'Shipping Address': r.shippingAddress, Status: r.status,
    }));
    return { headers, rows, jsonRows, title: 'Dispatch Register' };
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
