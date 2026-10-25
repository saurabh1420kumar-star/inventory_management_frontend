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
import { DealerService } from '../../services/dealer.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import { DateGroupedTableComponent, DateSummaryColumn } from '../date-grouped-table/date-grouped-table.component';
import {
  toDateInputValue, formatDisplayDate, formatCurrencyFull,
  DateGroup, listDistinct, sumBy,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf, filterByDateRange, filterByField,
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
  totalWeight: number;
}

interface ProductRow {
  rank: number;
  product: string;
  qtySold: number;
  revenue: number;
  invoiceCount: number;
}

// GET /reports/sales/by-distributor row (distributorId is dropped — it's an id, not a display value).
interface DistributorSalesRow {
  name: string;
  orders: number;
  qty: number;
  weightKg: number;
  revenue: number;
}

// GET /reports/sales/by-dealer row (dealerId is dropped — it's an id, not a display value).
interface DealerSalesRow {
  name: string;
  distributor: string;
  distributorId: string;
  orders: number;
  qty: number;
  weightKg: number;
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
    totalWeight: Number(raw.totalWeight ?? 0),
  };
}

// GET /api/reports/sales/by-product — Excel #21 Product Wise Sales
// Response: { rank, productId, productName, totalQuantity, totalAmount, invoiceCount, sharePercentage }
// (productId and sharePercentage are not displayed.)
function mapProductRow(raw: any): ProductRow {
  return {
    rank: Number(raw.rank ?? 0),
    product: raw.productName ?? '—',
    qtySold: Number(raw.totalQuantity ?? 0),
    revenue: Number(raw.totalAmount ?? 0),
    invoiceCount: Number(raw.invoiceCount ?? 0),
  };
}

// GET /api/reports/sales/by-distributor — Excel #22 Distributor Wise Sales
// Response: { distributorId, distributorName, invoiceCount, totalQuantity, totalValue, totalWeight (Kg) }
function mapDistributorSalesRow(raw: any): DistributorSalesRow {
  return {
    name: raw.distributorName ?? '—',
    orders: Number(raw.invoiceCount ?? 0),
    qty: Number(raw.totalQuantity ?? 0),
    weightKg: Number(raw.totalWeight ?? 0),
    revenue: Number(raw.totalValue ?? 0),
  };
}

// GET /api/reports/sales/by-dealer — Excel #23 Dealer Wise Sales
// Response: { dealerId, dealerName, distributorId, distributorName, orderCount, totalQty, totalRevenue, totalWeight (Kg) }
function mapDealerSalesRow(raw: any): DealerSalesRow {
  return {
    name: raw.dealerName ?? '—',
    distributor: raw.distributorName ?? '—',
    distributorId: String(raw.distributorId ?? ''),
    orders: Number(raw.orderCount ?? 0),
    qty: Number(raw.totalQty ?? 0),
    weightKg: Number(raw.totalWeight ?? 0),
    revenue: Number(raw.totalRevenue ?? 0),
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
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent, DateGroupedTableComponent],
})
export class SalesReportsPage implements OnInit {

  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);
  private reportsService = inject(ReportsService);
  private distributorService = inject(DistributorService);
  private salesHierarchyService = inject(SalesHierarchyService);
  private dealerService = inject(DealerService);

  dealers: string[] = [];
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
  distributorRows: DistributorSalesRow[] = [];
  dealerRows: DealerSalesRow[] = [];
  salesmanRows: SalesmanRow[] = [];

  readonly invoiceSummaryColumns: DateSummaryColumn<InvoiceRow>[] = [
    { header: 'Customers', value: rows => listDistinct(rows, r => r.customer) },
    { header: 'Total Amount', value: rows => formatCurrencyFull(sumBy(rows, r => r.grandTotal)) },
  ];

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

  // Distributor, Salesperson & Dealer dropdowns are all populated from real master data
  // (GET /distributors, GET /sales-hierarchy/list, GET /dealers — the last one is the global,
  // unscoped dealer directory, distinct from the distributor-scoped /dealers/distributor/{id}).
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

    this.dealerService.getAllDealers().subscribe(list => {
      this.dealers = list.map(d => d.fullName);
    });
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.applyFilters();
  }

  applyFilters() {
    this.haptic.selectionChanged();
    this.isLoading = true;

    const dateParams = { dateFrom: this.filters.dateFrom, dateTo: this.filters.dateTo };

    forkJoin({
      invoices: this.reportsService.getInvoiceGrid({ ...dateParams, dealer: this.filters.dealer, distributor: this.filters.distributor, salesman: this.filters.salesperson }),
      monthlyTrend: this.reportsService.getMonthlyTrend(dateParams),
      byProduct: this.reportsService.getSalesByProduct(dateParams),
      byDistributor: this.reportsService.getSalesByDistributor({ ...dateParams, distributorId: this.filters.distributor }),
      byDealer: this.reportsService.getSalesByDealer({ ...dateParams, distributorId: this.filters.distributor }),
      salesmanPerf: this.reportsService.getSalesmanPerformance(dateParams),
    }).subscribe(({ invoices, monthlyTrend, byProduct, byDistributor, byDealer, salesmanPerf }) => {
      const distributorName = this.distributors.find(d => d.id === this.filters.distributor)?.name ?? this.filters.distributor;
      const salespersonName = this.salespersons.find(s => s.id === this.filters.salesperson)?.name ?? this.filters.salesperson;

      let invoiceRows = filterByDateRange(invoices.map(mapInvoiceRow), this.filters.dateFrom, this.filters.dateTo, r => r.date);
      invoiceRows = filterByField(invoiceRows, this.filters.dealer, r => r.dealer);
      invoiceRows = filterByField(invoiceRows, distributorName, r => r.distributor);
      invoiceRows = filterByField(invoiceRows, salespersonName, r => r.salesman);
      this.invoiceRows = invoiceRows.sort((a, b) => b.date.localeCompare(a.date));

      this.computeStats();
      this.buildSummaryRows(monthlyTrend);
      this.productRows = byProduct.map(mapProductRow).sort((a, b) => a.rank - b.rank);
      this.distributorRows = filterByField(byDistributor.map(mapDistributorSalesRow), distributorName, r => r.name)
        .sort((a, b) => b.revenue - a.revenue);
      // by-dealer returns every dealer×distributor pair; the Distributor / Dealer filters also narrow it
      // client-side (distributor by id, dealer by name) in case the backend ignores the query params.
      this.dealerRows = filterByField(
        filterByField(byDealer.map(mapDealerSalesRow), this.filters.distributor, r => r.distributorId),
        this.filters.dealer, r => r.name,
      ).sort((a, b) => b.revenue - a.revenue);
      // getSalesmanPerformance has no salesperson param server-side — the Salesperson filter above
      // can only narrow this tab client-side, keyed by name since salespersonId isn't in the response.
      this.salesmanRows = filterByField(salesmanPerf.map(mapSalesmanRow), salespersonName, r => r.salespersonName)
        .sort((a, b) => b.totalValue - a.totalValue);
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

  get activeRowCount(): number {
    if (this.activeType === 'register') return this.invoiceRows.length;
    if (this.activeType === 'summary') return this.summaryRows.length;
    if (this.activeType === 'product') return this.productRows.length;
    if (this.activeType === 'distributor') return this.distributorRows.length;
    if (this.activeType === 'dealer') return this.dealerRows.length;
    return this.salesmanRows.length;
  }

  get pagedSummaryRows(): SummaryRow[] { return paginate(this.summaryRows, this.pager); }
  get pagedProductRows(): ProductRow[] { return paginate(this.productRows, this.pager); }
  get pagedDistributorRows(): DistributorSalesRow[] { return paginate(this.distributorRows, this.pager); }
  get pagedDealerRows(): DealerSalesRow[] { return paginate(this.dealerRows, this.pager); }
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

  // `source` narrows the Sales Register export to one date's invoices (the date modal); omitted, it exports every row.
  private getExportData(source?: InvoiceRow[]): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    switch (this.activeType) {
      case 'register': {
        const data = source ?? this.invoiceRows;
        const headers = ['Invoice No', 'Date', 'Customer', 'Invoice Status', 'Amount'];
        const rows = data.map(r => [r.invoiceNo, formatDisplayDate(r.date), r.customer, r.invoiceStatus, formatCurrencyFull(r.grandTotal)]);
        const jsonRows = data.map(r => ({ 'Invoice No': r.invoiceNo, Date: r.date, Customer: r.customer, 'Invoice Status': r.invoiceStatus, Amount: r.grandTotal }));
        return { headers, rows, jsonRows, title: 'Sales Register' };
      }
      case 'summary': {
        const headers = ['Period', 'Total Sales', 'Total Invoices', 'Total Qty', 'Avg Invoice Value', 'Total Weight (Kg)'];
        const rows = this.summaryRows.map(r => [r.label, formatCurrencyFull(r.totalSales), r.totalInvoices, r.totalQty, formatCurrencyFull(r.avgInvoiceValue), r.totalWeight]);
        const jsonRows = this.summaryRows.map(r => ({ Period: r.label, 'Total Sales': r.totalSales, 'Total Invoices': r.totalInvoices, 'Total Qty': r.totalQty, 'Avg Invoice Value': Math.round(r.avgInvoiceValue), 'Total Weight (Kg)': r.totalWeight }));
        return { headers, rows, jsonRows, title: 'Sales Summary' };
      }
      case 'product': {
        const headers = ['Rank', 'Product', 'Qty Sold', 'Invoices', 'Revenue'];
        const rows = this.productRows.map(r => [r.rank, r.product, r.qtySold, r.invoiceCount, formatCurrencyFull(r.revenue)]);
        const jsonRows = this.productRows.map(r => ({ Rank: r.rank, Product: r.product, 'Qty Sold': r.qtySold, Invoices: r.invoiceCount, Revenue: r.revenue }));
        return { headers, rows, jsonRows, title: 'Product Wise Sales' };
      }
      case 'distributor': {
        const headers = ['Distributor', 'Orders', 'Qty', 'Weight (Kg)', 'Revenue'];
        const rows = this.distributorRows.map(r => [r.name, r.orders, r.qty, r.weightKg, formatCurrencyFull(r.revenue)]);
        const jsonRows = this.distributorRows.map(r => ({ Distributor: r.name, Orders: r.orders, Qty: r.qty, 'Weight (Kg)': r.weightKg, Revenue: r.revenue }));
        return { headers, rows, jsonRows, title: 'Distributor Wise Sales' };
      }
      case 'dealer': {
        const headers = ['Dealer', 'Distributor', 'Orders', 'Qty', 'Weight (Kg)', 'Revenue'];
        const rows = this.dealerRows.map(r => [r.name, r.distributor, r.orders, r.qty, r.weightKg, formatCurrencyFull(r.revenue)]);
        const jsonRows = this.dealerRows.map(r => ({ Dealer: r.name, Distributor: r.distributor, Orders: r.orders, Qty: r.qty, 'Weight (Kg)': r.weightKg, Revenue: r.revenue }));
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

  async exportGroupExcel(group: DateGroup<InvoiceRow>) {
    const { jsonRows, title } = this.getExportData(group.rows);
    await exportRowsToExcel(jsonRows, title, this.downloadService, this.toast, group.label);
  }

  async exportGroupPdf(group: DateGroup<InvoiceRow>) {
    const { headers, rows, title } = this.getExportData(group.rows);
    await exportRowsToPdf(headers, rows, title, this.downloadService, this.toast, group.label);
  }
}
