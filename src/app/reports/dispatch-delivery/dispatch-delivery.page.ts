import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  DEALERS, VEHICLES, ROUTES, DRIVERS,
  seededRandom, pick, toDateInputValue, formatDisplayDate, formatCurrencyFull, daysBetween,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'register' | 'status' | 'pending' | 'vehicle' | 'confirmation';
type DispatchStatus = 'Pending' | 'In-Transit' | 'Delivered';
type StatusFilter = 'all' | DispatchStatus;

const STAGES: DispatchStatus[] = ['Pending', 'In-Transit', 'Delivered'];

interface Filters {
  dateFrom: string;
  dateTo: string;
  vehicle: string;
  route: string;
  status: StatusFilter;
}

interface DispatchRow {
  challanNo: string;
  dispatchDate: string;
  vehicleNo: string;
  driver: string;
  route: string;
  customer: string;
  status: DispatchStatus;
  items: number;
  amount: number;
  expectedDelivery: string;
  deliveredDate: string | null;
  receivedBy: string | null;
  podConfirmed: boolean;
}

interface VehicleRow {
  vehicleNo: string;
  driver: string;
  route: string;
  trips: number;
  totalDeliveries: number;
  onTimePct: number;
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

  stages = STAGES;
  vehicles = VEHICLES;
  routes = ROUTES;

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'register';
  pager: Pager = { page: 1, pageSize: 5 };

  dispatchRows: DispatchRow[] = [];
  vehicleRows: VehicleRow[] = [];

  ngOnInit() {
    this.viewReport();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 14);
    return { dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now), vehicle: 'all', route: 'all', status: 'all' };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.viewReport();
  }

  viewReport() {
    this.haptic.selectionChanged();
    this.isLoading = true;
    setTimeout(() => {
      this.buildDispatchRows();
      this.buildVehicleRows();
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

  private buildDispatchRows() {
    const rng = seededRandom('dispatch|' + JSON.stringify(this.filters));
    const vehiclePool = this.filters.vehicle === 'all' ? this.vehicles : [this.filters.vehicle];
    const routePool = this.filters.route === 'all' ? this.routes : [this.filters.route];
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);
    const n = Math.round(80 + rng() * 160);
    let counter = 1;

    const rows: DispatchRow[] = [];
    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * span);
      const roll = rng();
      const status: DispatchStatus = roll < 0.18 ? 'Pending' : roll < 0.42 ? 'In-Transit' : 'Delivered';
      const expected = new Date(date.getTime() + (1 + rng() * 3) * 86400000);
      const delivered = status === 'Delivered';
      rows.push({
        challanNo: `CH-${date.getFullYear().toString().slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(counter++).padStart(3, '0')}`,
        dispatchDate: date.toISOString().slice(0, 10),
        vehicleNo: pick(rng, vehiclePool),
        driver: pick(rng, DRIVERS),
        route: pick(rng, routePool),
        customer: pick(rng, DEALERS),
        status,
        items: 1 + Math.floor(rng() * 12),
        amount: Math.round(6000 + rng() * 150000),
        expectedDelivery: expected.toISOString().slice(0, 10),
        deliveredDate: delivered ? expected.toISOString().slice(0, 10) : null,
        receivedBy: delivered ? pick(rng, ['Store Manager', 'Front Desk', 'Warehouse In-charge', 'Owner']) : null,
        podConfirmed: delivered ? rng() > 0.2 : false,
      });
    }

    const filtered = this.filters.status === 'all' ? rows : rows.filter(r => r.status === this.filters.status);
    this.dispatchRows = filtered.sort((a, b) => b.dispatchDate.localeCompare(a.dispatchDate));
  }

  private buildVehicleRows() {
    const rng = seededRandom('vehicles|' + JSON.stringify(this.filters));
    const vehiclePool = this.filters.vehicle === 'all' ? this.vehicles : [this.filters.vehicle];
    this.vehicleRows = vehiclePool.map(vehicleNo => {
      const rows = this.dispatchRows.filter(r => r.vehicleNo === vehicleNo);
      return {
        vehicleNo,
        driver: rows[0]?.driver ?? pick(rng, DRIVERS),
        route: rows[0]?.route ?? pick(rng, this.routes),
        trips: rows.length,
        totalDeliveries: rows.filter(r => r.status === 'Delivered').length,
        onTimePct: Math.round(78 + rng() * 20),
      };
    }).sort((a, b) => b.trips - a.trips);
  }

  get pendingRows(): DispatchRow[] { return this.dispatchRows.filter(r => r.status === 'Pending'); }
  get deliveredRows(): DispatchRow[] { return this.dispatchRows.filter(r => r.status === 'Delivered'); }

  daysReady(dateStr: string): number {
    return daysBetween(new Date(dateStr), new Date());
  }

  stageIndex(status: DispatchStatus): number {
    return STAGES.indexOf(status);
  }

  statusBadgeClass(status: DispatchStatus): string {
    if (status === 'Delivered') return 'report-badge-green';
    if (status === 'In-Transit') return 'report-badge-blue';
    return 'report-badge-amber';
  }

  get activeRowCount(): number {
    if (this.activeType === 'pending') return this.pendingRows.length;
    if (this.activeType === 'confirmation') return this.deliveredRows.length;
    if (this.activeType === 'vehicle') return this.vehicleRows.length;
    return this.dispatchRows.length;
  }

  get pagedDispatchRows(): DispatchRow[] { return paginate(this.dispatchRows, this.pager); }
  get pagedPendingRows(): DispatchRow[] { return paginate(this.pendingRows, this.pager); }
  get pagedDeliveredRows(): DispatchRow[] { return paginate(this.deliveredRows, this.pager); }
  get pagedVehicleRows(): VehicleRow[] { return paginate(this.vehicleRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }
  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  formatDisplayDate = formatDisplayDate;
  formatCurrencyFull = formatCurrencyFull;

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    if (this.activeType === 'status') {
      const headers = ['Challan No', 'Customer', 'Route', 'Dispatch Date', 'Status', 'Expected Delivery'];
      const rows = this.dispatchRows.map(r => [r.challanNo, r.customer, r.route, formatDisplayDate(r.dispatchDate), r.status, formatDisplayDate(r.expectedDelivery)]);
      const jsonRows = this.dispatchRows.map(r => ({ 'Challan No': r.challanNo, Customer: r.customer, Route: r.route, 'Dispatch Date': r.dispatchDate, Status: r.status, 'Expected Delivery': r.expectedDelivery }));
      return { headers, rows, jsonRows, title: 'Delivery Status' };
    }
    if (this.activeType === 'pending') {
      const headers = ['Challan No', 'Customer', 'Items', 'Amount', 'Ready Since (days)'];
      const rows = this.pendingRows.map(r => [r.challanNo, r.customer, r.items, formatCurrencyFull(r.amount), this.daysReady(r.dispatchDate)]);
      const jsonRows = this.pendingRows.map(r => ({ 'Challan No': r.challanNo, Customer: r.customer, Items: r.items, Amount: r.amount, 'Ready Since (days)': this.daysReady(r.dispatchDate) }));
      return { headers, rows, jsonRows, title: 'Pending Dispatch' };
    }
    if (this.activeType === 'vehicle') {
      const headers = ['Vehicle No', 'Driver', 'Route', 'Trips', 'Total Deliveries', 'On-Time %'];
      const rows = this.vehicleRows.map(r => [r.vehicleNo, r.driver, r.route, r.trips, r.totalDeliveries, r.onTimePct + '%']);
      const jsonRows = this.vehicleRows.map(r => ({ 'Vehicle No': r.vehicleNo, Driver: r.driver, Route: r.route, Trips: r.trips, 'Total Deliveries': r.totalDeliveries, 'On-Time %': r.onTimePct }));
      return { headers, rows, jsonRows, title: 'Vehicle Wise Dispatch' };
    }
    if (this.activeType === 'confirmation') {
      const headers = ['Challan No', 'Customer', 'Delivered Date', 'Received By', 'POD Status'];
      const rows = this.deliveredRows.map(r => [r.challanNo, r.customer, formatDisplayDate(r.deliveredDate ?? ''), r.receivedBy ?? '', r.podConfirmed ? 'Confirmed' : 'Pending']);
      const jsonRows = this.deliveredRows.map(r => ({ 'Challan No': r.challanNo, Customer: r.customer, 'Delivered Date': r.deliveredDate, 'Received By': r.receivedBy, 'POD Status': r.podConfirmed ? 'Confirmed' : 'Pending' }));
      return { headers, rows, jsonRows, title: 'Delivery Confirmation' };
    }
    const headers = ['Challan No', 'Dispatch Date', 'Vehicle No', 'Customer', 'Status'];
    const rows = this.dispatchRows.map(r => [r.challanNo, formatDisplayDate(r.dispatchDate), r.vehicleNo, r.customer, r.status]);
    const jsonRows = this.dispatchRows.map(r => ({ 'Challan No': r.challanNo, 'Dispatch Date': r.dispatchDate, 'Vehicle No': r.vehicleNo, Customer: r.customer, Status: r.status }));
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
