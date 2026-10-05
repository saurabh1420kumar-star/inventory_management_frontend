import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportsService } from '../../services/reports.service';
import { DistributorService, DistributorDto, ApiResponse } from '../../services/distributor.service';
import { SalesHierarchyService } from '../../services/sales-hierarchy.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  DEALERS, REGIONS,
  seededRandom, pick, toDateInputValue, formatDisplayDate, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'register' | 'summary' | 'product' | 'distributor' | 'dealer' | 'salesman';

interface DropdownOption {
  id: string;
  name: string;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  dealer: string;
  distributor: string;
  salesperson: string;
}

interface InvoiceRow {
  invoiceNo: string;
  date: string;
  customer: string;
  product: string;
  qty: number;
  rate: number;
  amount: number;
  invoiceStatus: string;
  grandTotal: number;
  dealer: string;
  distributor: string;
  salesman: string;
}

interface SummaryRow {
  label: string;
  totalSales: number;
  totalInvoices: number;
  totalQty: number;
  avgInvoiceValue: number;
}

interface ProductRow {
  rank: number;
  product: string;
  qtySold: number;
  revenue: number;
  sharePct: number;
}

interface PartyRow {
  name: string;
  region: string;
  orders: number;
  qty: number;
  revenue: number;
}

// Mirrors the raw /sales-orders/salesman-performance response fields (minus salespersonId).
interface SalesmanRow {
  salespersonName: string;
  totalValue: number;
  orderCount: number;
  totalQuantityKg: number;
  totalQuantityTons: number;
}

// GET /api/reports/sales/invoice-grid — Excel #19 Sales Register
function mapInvoiceRow(raw: any): InvoiceRow {
  const qty = Number(raw.qty ?? raw.quantity ?? 0);
  const rate = Number(raw.rate ?? raw.unitPrice ?? raw.price ?? 0);
  return {
    invoiceNo: raw.invoiceNo ?? raw.invoiceNumber ?? '—',
    date: raw.date ?? raw.invoiceDate ?? raw.createdAt ?? '',
    customer: raw.customer ?? raw.customerName ?? raw.distributorName ?? '—',
    product: raw.product ?? raw.productName ?? raw.itemName ?? '—',
    qty,
    rate,
    amount: Number(raw.amount ?? raw.totalAmount ?? qty * rate),
    invoiceStatus: raw.invoiceStatus ?? raw.status ?? '—',
    grandTotal: Number(raw.grandTotal ?? raw.amount ?? raw.totalAmount ?? qty * rate),
    dealer: raw.dealer ?? raw.dealerName ?? '—',
    distributor: raw.distributor ?? raw.distributorName ?? raw.customer ?? raw.customerName ?? '—',
    salesman: raw.salesman ?? raw.salesmanName ?? raw.salespersonName ?? '—',
  };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GET /api/reports/sales/monthly-trend — Excel #20 Sales Summary (Period grouping)
function mapMonthlyTrendRow(raw: any): SummaryRow {
  const month = Number(raw.month ?? 0);
  return {
    label: `${MONTH_NAMES[month - 1] ?? month} ${raw.year ?? ''}`,
    totalSales: Number(raw.totalValue ?? 0),
    totalInvoices: Number(raw.invoiceCount ?? 0),
    totalQty: Number(raw.totalQty ?? 0),
    avgInvoiceValue: Number(raw.avgInvoiceValue ?? 0),
  };
}

// Shared by Excel #21 (by-product) and #27 (top-products) — same row shape.
function mapProductRows(rawList: any[]): ProductRow[] {
  const base = rawList.map(raw => ({
    product: raw.product ?? raw.productName ?? raw.itemName ?? '—',
    qtySold: Number(raw.qtySold ?? raw.qty ?? raw.quantity ?? raw.totalQty ?? 0),
    revenue: Number(raw.revenue ?? raw.totalRevenue ?? raw.totalSales ?? raw.amount ?? 0),
    sharePctRaw: raw.sharePct,
  }));
  const total = base.reduce((s, r) => s + r.revenue, 0) || 1;
  return base
    .sort((a, b) => b.revenue - a.revenue)
    .map((r, i) => ({
      rank: i + 1,
      product: r.product,
      qtySold: r.qtySold,
      revenue: r.revenue,
      sharePct: Number(r.sharePctRaw ?? (r.revenue / total) * 100),
    }));
}

// GET /api/reports/sales/by-distributor — Excel #22 Distributor Wise Sales
function mapPartyRow(raw: any): PartyRow {
  return {
    name: raw.name ?? raw.distributorName ?? raw.dealerName ?? '—',
    region: raw.region ?? '—',
    orders: Number(raw.orders ?? raw.orderCount ?? raw.invoiceCount ?? 0),
    qty: Number(raw.qty ?? raw.totalQty ?? raw.quantity ?? 0),
    revenue: Number(raw.revenue ?? raw.totalRevenue ?? raw.totalSales ?? raw.amount ?? 0),
  };
}

// GET /api/reports/sales-orders/salesman-performance — Excel #28
// Response keys are mapped 1:1 to columns (salespersonId is dropped — it's an id, not a display value).
function mapSalesmanRow(raw: any): SalesmanRow {
  return {
    salespersonName: raw.salespersonName ?? '—',
    totalValue: Number(raw.totalValue ?? 0),
    orderCount: Number(raw.orderCount ?? 0),
    totalQuantityKg: Number(raw.totalQuantityKg ?? 0),
    totalQuantityTons: Number(raw.totalQuantityTons ?? 0),
  };
}

@Component({
  selector: 'app-sales-reports',
  templateUrl: './sales-reports.page.html',
  styleUrls: ['./sales-reports.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
})
export class SalesReportsPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);
  private reportsService = inject(ReportsService);
  private distributorService = inject(DistributorService);
  private salesHierarchyService = inject(SalesHierarchyService);

  dealers = DEALERS;
  distributors: DropdownOption[] = [];
  salespersons: DropdownOption[] = [];

  filters: Filters = this.buildDefaultFilters();
  isLoading = false;
  lastUpdated: Date | null = null;
  activeType: ReportType = 'register';
  pager: Pager = { page: 1, pageSize: 5 };

  invoiceRows: InvoiceRow[] = [];
  summaryRows: SummaryRow[] = [];
  productRows: ProductRow[] = [];
  distributorRows: PartyRow[] = [];
  dealerRows: PartyRow[] = [];
  salesmanRows: SalesmanRow[] = [];

  totalSales = 0;
  totalInvoices = 0;
  totalQty = 0;
  avgInvoiceValue = 0;

  ngOnInit() {
    this.loadFilterOptions();
    this.applyFilters();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now), dealer: 'all', distributor: 'all', salesperson: 'all' };
  }

  // Distributor & Salesperson dropdowns are populated from real master data (GET /distributors,
  // GET /sales-hierarchy/list). Dealers have no global "all dealers" endpoint in this backend yet
  // (dealers are only fetchable scoped to a distributor via GET /dealers/distributor/{id}), so that
  // dropdown stays on the deterministic mock list for now.
  private loadFilterOptions() {
    this.distributorService.getAllDistributors().pipe(
      catchError(() => of({ success: false, message: '', data: [] } as ApiResponse<DistributorDto[]>))
    ).subscribe(res => {
      const list: DistributorDto[] = Array.isArray(res) ? res : (res?.data ?? []);
      this.distributors = list.map(d => ({ id: String(d.id), name: d.firmName ?? d.companyName ?? d.name ?? '—' }));
    });

    this.salesHierarchyService.getAllSalesPersons().pipe(
      catchError(() => of([]))
    ).subscribe(list => {
      this.salespersons = list.map(p => ({ id: String(p.id), name: p.name }));
    });
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.applyFilters();
  }

  applyFilters() {
    this.haptic.selectionChanged();
    this.isLoading = true;

    // Dealer Wise Sales (Excel #23) has no backend endpoint yet (REPORTS_README.md Category 3) —
    // that tab stays on deterministic mock data until a dealer-grouped query exists.
    this.buildDealerRows();

    const dateParams = { dateFrom: this.filters.dateFrom, dateTo: this.filters.dateTo };

    forkJoin({
      invoices: this.reportsService.getInvoiceGrid({ ...dateParams, dealer: this.filters.dealer, distributor: this.filters.distributor, salesman: this.filters.salesperson }),
      monthlyTrend: this.reportsService.getMonthlyTrend(dateParams),
      byProduct: this.reportsService.getSalesByProduct(dateParams),
      byDistributor: this.reportsService.getSalesByDistributor({ ...dateParams, distributorId: this.filters.distributor }),
      salesmanPerf: this.reportsService.getSalesmanPerformance(dateParams),
    }).subscribe(({ invoices, monthlyTrend, byProduct, byDistributor, salesmanPerf }) => {
      this.invoiceRows = invoices.map(mapInvoiceRow).sort((a, b) => b.date.localeCompare(a.date));
      this.computeStats();
      this.buildSummaryRows(monthlyTrend);
      this.productRows = mapProductRows(byProduct);
      this.distributorRows = byDistributor.map(mapPartyRow).sort((a, b) => b.revenue - a.revenue);
      this.salesmanRows = salesmanPerf.map(mapSalesmanRow).sort((a, b) => b.totalValue - a.totalValue);
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

  private regionFor(name: string): string {
    const rng = seededRandom('region|' + name);
    return pick(rng, REGIONS);
  }

  private computeStats() {
    this.totalSales = this.invoiceRows.reduce((s, r) => s + r.amount, 0);
    this.totalInvoices = this.invoiceRows.length;
    this.totalQty = this.invoiceRows.reduce((s, r) => s + r.qty, 0);
    this.avgInvoiceValue = this.totalInvoices ? this.totalSales / this.totalInvoices : 0;
  }

  // Sales Summary (Excel #20) maps GET /sales/monthly-trend directly (1 row per month, sorted
  // chronologically).
  private buildSummaryRows(monthlyTrend: any[]) {
    this.summaryRows = [...monthlyTrend]
      .sort((a, b) => (Number(a.year) * 12 + Number(a.month)) - (Number(b.year) * 12 + Number(b.month)))
      .map(mapMonthlyTrendRow);
  }

  private buildDealerRows() {
    const rng = seededRandom('dealer|' + JSON.stringify(this.filters));
    const dealerPool = this.filters.dealer === 'all' ? this.dealers : [this.filters.dealer];
    this.dealerRows = dealerPool.map(name => {
      const orders = 2 + Math.floor(rng() * 20);
      const qty = Math.round(50 + rng() * 4000);
      return { name, region: this.regionFor(name), orders, qty, revenue: Math.round(qty * (80 + rng() * 300)) };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  get activeRowCount(): number {
    if (this.activeType === 'register') return this.invoiceRows.length;
    if (this.activeType === 'summary') return this.summaryRows.length;
    if (this.activeType === 'product') return this.productRows.length;
    if (this.activeType === 'distributor') return this.distributorRows.length;
    if (this.activeType === 'dealer') return this.dealerRows.length;
    return this.salesmanRows.length;
  }

  get pagedInvoiceRows(): InvoiceRow[] { return paginate(this.invoiceRows, this.pager); }
  get pagedSummaryRows(): SummaryRow[] { return paginate(this.summaryRows, this.pager); }
  get pagedProductRows(): ProductRow[] { return paginate(this.productRows, this.pager); }
  get pagedDistributorRows(): PartyRow[] { return paginate(this.distributorRows, this.pager); }
  get pagedDealerRows(): PartyRow[] { return paginate(this.dealerRows, this.pager); }
  get pagedSalesmanRows(): SalesmanRow[] { return paginate(this.salesmanRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }
  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  formatDisplayDate = formatDisplayDate;
  formatCurrencyFull = formatCurrencyFull;

  statusBadgeClass(status: string): string {
    const normalized = status.toUpperCase();
    if (normalized === 'GENERATED' || normalized === 'PAID' || normalized === 'COMPLETED') return 'report-badge-green';
    if (normalized === 'PENDING') return 'report-badge-amber';
    if (normalized === 'CANCELLED' || normalized === 'REJECTED') return 'report-badge-red';
    return 'report-badge-blue';
  }

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    switch (this.activeType) {
      case 'register': {
        const headers = ['Invoice No', 'Date', 'Customer', 'Invoice Status', 'Amount'];
        const rows = this.invoiceRows.map(r => [r.invoiceNo, formatDisplayDate(r.date), r.customer, r.invoiceStatus, formatCurrencyFull(r.grandTotal)]);
        const jsonRows = this.invoiceRows.map(r => ({ 'Invoice No': r.invoiceNo, Date: r.date, Customer: r.customer, 'Invoice Status': r.invoiceStatus, Amount: r.grandTotal }));
        return { headers, rows, jsonRows, title: 'Sales Register' };
      }
      case 'summary': {
        const headers = ['Period', 'Total Sales', 'Total Invoices', 'Total Qty', 'Avg Invoice Value'];
        const rows = this.summaryRows.map(r => [r.label, formatCurrencyFull(r.totalSales), r.totalInvoices, r.totalQty, formatCurrencyFull(r.avgInvoiceValue)]);
        const jsonRows = this.summaryRows.map(r => ({ Period: r.label, 'Total Sales': r.totalSales, 'Total Invoices': r.totalInvoices, 'Total Qty': r.totalQty, 'Avg Invoice Value': Math.round(r.avgInvoiceValue) }));
        return { headers, rows, jsonRows, title: 'Sales Summary' };
      }
      case 'product': {
        const headers = ['Rank', 'Product', 'Qty Sold', 'Revenue', 'Share %'];
        const rows = this.productRows.map(r => [r.rank, r.product, r.qtySold, formatCurrencyFull(r.revenue), r.sharePct.toFixed(1) + '%']);
        const jsonRows = this.productRows.map(r => ({ Rank: r.rank, Product: r.product, 'Qty Sold': r.qtySold, Revenue: r.revenue, 'Share %': r.sharePct.toFixed(1) }));
        return { headers, rows, jsonRows, title: 'Product Wise Sales' };
      }
      case 'distributor': {
        const headers = ['Distributor', 'Region', 'Orders', 'Qty', 'Revenue'];
        const rows = this.distributorRows.map(r => [r.name, r.region, r.orders, r.qty, formatCurrencyFull(r.revenue)]);
        const jsonRows = this.distributorRows.map(r => ({ Distributor: r.name, Region: r.region, Orders: r.orders, Qty: r.qty, Revenue: r.revenue }));
        return { headers, rows, jsonRows, title: 'Distributor Wise Sales' };
      }
      case 'dealer': {
        const headers = ['Dealer', 'Region', 'Orders', 'Qty', 'Revenue'];
        const rows = this.dealerRows.map(r => [r.name, r.region, r.orders, r.qty, formatCurrencyFull(r.revenue)]);
        const jsonRows = this.dealerRows.map(r => ({ Dealer: r.name, Region: r.region, Orders: r.orders, Qty: r.qty, Revenue: r.revenue }));
        return { headers, rows, jsonRows, title: 'Dealer Wise Sales' };
      }
      default: {
        const headers = ['Salesperson Name', 'Order Count', 'Total Qty (Kg)', 'Total Qty (Tons)', 'Total Value'];
        const rows = this.salesmanRows.map(r => [r.salespersonName, r.orderCount, r.totalQuantityKg, r.totalQuantityTons, formatCurrencyFull(r.totalValue)]);
        const jsonRows = this.salesmanRows.map(r => ({
          'Salesperson Name': r.salespersonName,
          'Order Count': r.orderCount,
          'Total Qty (Kg)': r.totalQuantityKg,
          'Total Qty (Tons)': r.totalQuantityTons,
          'Total Value': r.totalValue,
        }));
        return { headers, rows, jsonRows, title: 'Salesman Performance' };
      }
    }
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
