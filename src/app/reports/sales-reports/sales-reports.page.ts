import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';
import { ReportHeroComponent } from '../report-hero/report-hero.component';
import {
  FINISHED_PRODUCTS, DEALERS, DISTRIBUTORS, SALESMEN, REGIONS,
  seededRandom, pick, toDateInputValue, formatDisplayDate, formatCurrencyFull,
  Pager, paginate, totalPages, pageWindow, pageRange,
  exportRowsToExcel, exportRowsToPdf,
} from '../report-shared';

type ReportType = 'register' | 'summary' | 'product' | 'distributor' | 'dealer' | 'top' | 'salesman';
type GroupBy = 'none' | 'product' | 'dealer' | 'distributor' | 'salesman';

interface Filters {
  dateFrom: string;
  dateTo: string;
  groupBy: GroupBy;
  dealer: string;
  distributor: string;
  salesman: string;
}

interface InvoiceRow {
  invoiceNo: string;
  date: string;
  customer: string;
  product: string;
  qty: number;
  rate: number;
  amount: number;
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

interface SalesmanRow extends PartyRow {
  achievementPct: number;
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

  dealers = DEALERS;
  distributors = DISTRIBUTORS;
  salesmen = SALESMEN;

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
  topProductRows: ProductRow[] = [];
  salesmanRows: SalesmanRow[] = [];

  totalSales = 0;
  totalInvoices = 0;
  totalQty = 0;
  avgInvoiceValue = 0;

  ngOnInit() {
    this.applyFilters();
  }

  private buildDefaultFilters(): Filters {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now), groupBy: 'none', dealer: 'all', distributor: 'all', salesman: 'all' };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.applyFilters();
  }

  applyFilters() {
    this.haptic.selectionChanged();
    this.isLoading = true;
    setTimeout(() => {
      this.buildInvoiceRows();
      this.computeStats();
      this.buildSummaryRows();
      this.buildProductRows();
      this.buildDistributorRows();
      this.buildDealerRows();
      this.buildSalesmanRows();
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

  get summaryLabel(): string {
    const map: Record<GroupBy, string> = { none: 'Period', product: 'Product', dealer: 'Dealer', distributor: 'Distributor', salesman: 'Salesman' };
    return map[this.filters.groupBy];
  }

  private groupInvoices(rows: InvoiceRow[], keyFn: (r: InvoiceRow) => string): Map<string, InvoiceRow[]> {
    const map = new Map<string, InvoiceRow[]>();
    rows.forEach(r => {
      const k = keyFn(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return map;
  }

  private regionFor(name: string): string {
    const rng = seededRandom('region|' + name);
    return pick(rng, REGIONS);
  }

  private buildInvoiceRows() {
    const rng = seededRandom('invoices|' + JSON.stringify(this.filters));
    const start = new Date(this.filters.dateFrom).getTime();
    const end = new Date(this.filters.dateTo).getTime();
    const span = Math.max(end - start, 86400000);
    const n = Math.round(140 + rng() * 260);

    const dealerPool = this.filters.dealer === 'all' ? this.dealers : [this.filters.dealer];
    const distributorPool = this.filters.distributor === 'all' ? this.distributors : [this.filters.distributor];
    const salesmanPool = this.filters.salesman === 'all' ? this.salesmen : [this.filters.salesman];

    let counter = 1;
    const rows: InvoiceRow[] = [];
    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * span);
      const product = pick(rng, FINISHED_PRODUCTS);
      const qty = Math.round(20 + rng() * 500);
      const rate = Math.round(80 + rng() * 420);
      const distributor = pick(rng, distributorPool);
      rows.push({
        invoiceNo: `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(counter++).padStart(3, '0')}`,
        date: date.toISOString().slice(0, 10),
        customer: distributor,
        product,
        qty,
        rate,
        amount: qty * rate,
        dealer: pick(rng, dealerPool),
        distributor,
        salesman: pick(rng, salesmanPool),
      });
    }
    this.invoiceRows = rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  private computeStats() {
    this.totalSales = this.invoiceRows.reduce((s, r) => s + r.amount, 0);
    this.totalInvoices = this.invoiceRows.length;
    this.totalQty = this.invoiceRows.reduce((s, r) => s + r.qty, 0);
    this.avgInvoiceValue = this.totalInvoices ? this.totalSales / this.totalInvoices : 0;
  }

  private buildSummaryRows() {
    const keyFn: Record<GroupBy, (r: InvoiceRow) => string> = {
      none: r => new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      product: r => r.product,
      dealer: r => r.dealer,
      distributor: r => r.distributor,
      salesman: r => r.salesman,
    };
    const groups = this.groupInvoices(this.invoiceRows, keyFn[this.filters.groupBy]);
    const rows: SummaryRow[] = Array.from(groups.entries()).map(([label, grp]) => {
      const totalSales = grp.reduce((s, r) => s + r.amount, 0);
      const totalInvoices = grp.length;
      const totalQty = grp.reduce((s, r) => s + r.qty, 0);
      return { label, totalSales, totalInvoices, totalQty, avgInvoiceValue: totalInvoices ? totalSales / totalInvoices : 0 };
    });
    this.summaryRows = this.filters.groupBy === 'none'
      ? rows.sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime())
      : rows.sort((a, b) => b.totalSales - a.totalSales);
  }

  private productBreakdown(): ProductRow[] {
    const groups = this.groupInvoices(this.invoiceRows, r => r.product);
    const total = this.totalSales || 1;
    return Array.from(groups.entries())
      .map(([product, grp]) => ({
        rank: 0,
        product,
        qtySold: grp.reduce((s, r) => s + r.qty, 0),
        revenue: grp.reduce((s, r) => s + r.amount, 0),
        sharePct: 0,
      }))
      .map(r => ({ ...r, sharePct: (r.revenue / total) * 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }

  private buildProductRows() {
    this.productRows = this.productBreakdown();
    this.topProductRows = this.productBreakdown().slice(0, 5);
  }

  private partyBreakdown(keyFn: (r: InvoiceRow) => string): PartyRow[] {
    const groups = this.groupInvoices(this.invoiceRows, keyFn);
    return Array.from(groups.entries())
      .map(([name, grp]) => ({
        name,
        region: this.regionFor(name),
        orders: grp.length,
        qty: grp.reduce((s, r) => s + r.qty, 0),
        revenue: grp.reduce((s, r) => s + r.amount, 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private buildDistributorRows() {
    this.distributorRows = this.partyBreakdown(r => r.distributor);
  }

  private buildDealerRows() {
    this.dealerRows = this.partyBreakdown(r => r.dealer);
  }

  private buildSalesmanRows() {
    this.salesmanRows = this.partyBreakdown(r => r.salesman).map(row => {
      const rng = seededRandom('target|' + row.name);
      const target = row.revenue * (0.75 + rng() * 0.4);
      return { ...row, achievementPct: Math.min(150, Math.round((row.revenue / target) * 100)) };
    });
  }

  get activeRowCount(): number {
    if (this.activeType === 'register') return this.invoiceRows.length;
    if (this.activeType === 'summary') return this.summaryRows.length;
    if (this.activeType === 'product') return this.productRows.length;
    if (this.activeType === 'distributor') return this.distributorRows.length;
    if (this.activeType === 'dealer') return this.dealerRows.length;
    if (this.activeType === 'top') return this.topProductRows.length;
    return this.salesmanRows.length;
  }

  get pagedInvoiceRows(): InvoiceRow[] { return paginate(this.invoiceRows, this.pager); }
  get pagedSummaryRows(): SummaryRow[] { return paginate(this.summaryRows, this.pager); }
  get pagedProductRows(): ProductRow[] { return paginate(this.productRows, this.pager); }
  get pagedDistributorRows(): PartyRow[] { return paginate(this.distributorRows, this.pager); }
  get pagedDealerRows(): PartyRow[] { return paginate(this.dealerRows, this.pager); }
  get pagedTopProductRows(): ProductRow[] { return paginate(this.topProductRows, this.pager); }
  get pagedSalesmanRows(): SalesmanRow[] { return paginate(this.salesmanRows, this.pager); }

  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.activeRowCount); }
  get totalPageCount(): number { return totalPages(this.activeRowCount, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  formatDisplayDate = formatDisplayDate;
  formatCurrencyFull = formatCurrencyFull;

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: Record<string, unknown>[]; title: string } {
    switch (this.activeType) {
      case 'register': {
        const headers = ['Invoice No', 'Date', 'Customer', 'Product', 'Qty', 'Rate', 'Amount'];
        const rows = this.invoiceRows.map(r => [r.invoiceNo, formatDisplayDate(r.date), r.customer, r.product, r.qty, formatCurrencyFull(r.rate), formatCurrencyFull(r.amount)]);
        const jsonRows = this.invoiceRows.map(r => ({ 'Invoice No': r.invoiceNo, Date: r.date, Customer: r.customer, Product: r.product, Qty: r.qty, Rate: r.rate, Amount: r.amount }));
        return { headers, rows, jsonRows, title: 'Sales Register' };
      }
      case 'summary': {
        const headers = [this.summaryLabel, 'Total Sales', 'Total Invoices', 'Total Qty', 'Avg Invoice Value'];
        const rows = this.summaryRows.map(r => [r.label, formatCurrencyFull(r.totalSales), r.totalInvoices, r.totalQty, formatCurrencyFull(r.avgInvoiceValue)]);
        const jsonRows = this.summaryRows.map(r => ({ [this.summaryLabel]: r.label, 'Total Sales': r.totalSales, 'Total Invoices': r.totalInvoices, 'Total Qty': r.totalQty, 'Avg Invoice Value': Math.round(r.avgInvoiceValue) }));
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
      case 'top': {
        const headers = ['Rank', 'Product', 'Qty Sold', 'Revenue', 'Share %'];
        const rows = this.topProductRows.map(r => [r.rank, r.product, r.qtySold, formatCurrencyFull(r.revenue), r.sharePct.toFixed(1) + '%']);
        const jsonRows = this.topProductRows.map(r => ({ Rank: r.rank, Product: r.product, 'Qty Sold': r.qtySold, Revenue: r.revenue, 'Share %': r.sharePct.toFixed(1) }));
        return { headers, rows, jsonRows, title: 'Top Selling Products' };
      }
      default: {
        const headers = ['Salesman', 'Region', 'Orders', 'Qty', 'Revenue', 'Achievement %'];
        const rows = this.salesmanRows.map(r => [r.name, r.region, r.orders, r.qty, formatCurrencyFull(r.revenue), r.achievementPct + '%']);
        const jsonRows = this.salesmanRows.map(r => ({ Salesman: r.name, Region: r.region, Orders: r.orders, Qty: r.qty, Revenue: r.revenue, 'Achievement %': r.achievementPct }));
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
