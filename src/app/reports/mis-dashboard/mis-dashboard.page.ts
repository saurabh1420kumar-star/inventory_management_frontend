import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NgApexchartsModule } from 'ng-apexcharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexGrid,
  ApexTooltip,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexLegend,
  ApexResponsive
} from 'ng-apexcharts';
import { SalesService, Distributor } from '../../services/sales.service';
import { DownloadService } from '../../services/download.service';
import { Toast } from '../../services/toast';
import { HapticService } from '../../services/haptic.service';

type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  grid: ApexGrid;
  tooltip: ApexTooltip;
};

type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  responsive: ApexResponsive[];
  tooltip: ApexTooltip;
};

interface FilterState {
  dateFrom: string;
  dateTo: string;
  fy: string;
  region: string;
  distributorId: string;
}

interface KpiCard {
  label: string;
  value: string;
  change: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  borderClass: string;
}

interface ProductRow {
  rank: number;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  share: number;
}

interface RegionRow {
  region: string;
  sales: number;
  purchase: number;
  stockValue: number;
  receivable: number;
  orders: number;
}

interface ReceivableRow {
  distributor: string;
  region: string;
  invoices: number;
  outstanding: number;
  daysOverdue: number;
  status: 'Healthy' | 'Watch' | 'Overdue';
}

type TableTab = 'products' | 'region' | 'receivables';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-mis-dashboard',
  templateUrl: './mis-dashboard.page.html',
  styleUrls: ['./mis-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, NgApexchartsModule],
})
export class MisDashboardPage implements OnInit {

  private salesService = inject(SalesService);
  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);

  // Fixed categorical order — validated colorblind-safe (blue/emerald/amber/rose/violet)
  private readonly CATEGORICAL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  // Single-hue ordinal ramp (light→dark) for the ageing donut — validated with --ordinal
  private readonly AGING_COLORS = ['#60a5fa', '#3b82f6', '#2563eb', '#1e40af', '#172554'];

  private readonly REGIONS = ['North', 'South', 'East', 'West', 'Central'];
  private readonly REGION_WEIGHTS = [0.28, 0.24, 0.22, 0.16, 0.10];

  private readonly PRODUCTS = [
    { name: 'Mango Nectar 1L', category: 'Finished Goods', share: 0.28 },
    { name: 'Mixed Fruit Pulp 5kg', category: 'Finished Goods', share: 0.22 },
    { name: 'Orange Nectar 200ml', category: 'Finished Goods', share: 0.18 },
    { name: 'Guava Pulp 1kg', category: 'Finished Goods', share: 0.16 },
    { name: 'Other Products', category: 'Mixed', share: 0.16 },
  ];

  private readonly STOCK_CATEGORIES = [
    { name: 'Raw Material', share: 0.38 },
    { name: 'Finished Goods', share: 0.34 },
    { name: 'Machine Parts', share: 0.14 },
    { name: 'Scrap', share: 0.08 },
    { name: 'Promotional Items', share: 0.06 },
  ];

  private readonly AGING_BUCKETS = [
    { label: '0-30 Days', share: 0.35 },
    { label: '31-60 Days', share: 0.25 },
    { label: '61-90 Days', share: 0.20 },
    { label: '91-120 Days', share: 0.12 },
    { label: '>120 Days', share: 0.08 },
  ];

  // Relative weekly share of the current month's sales (MTD), sums to 1.0
  private readonly WEEK_SHAPE = [0.22, 0.19, 0.21, 0.18, 0.20];

  // Baseline snapshot values (default filter view mirrors the target design)
  private readonly BASE_SALES = 23545210;
  private readonly BASE_PURCHASE = 14532760;
  private readonly BASE_STOCK = 32511650;
  private readonly BASE_RECEIVABLE = 6521430;
  private readonly BASE_CHANGE = { sales: 12.3, purchase: 8.3, stock: 10.1, receivable: -4.2 };

  isLoading = true;
  lastUpdated = new Date();

  filters: FilterState = this.buildDefaultFilters();
  fyOptions: string[] = this.buildFyOptions();
  regions = this.REGIONS;
  distributors: Distributor[] = this.mockDistributors();

  kpiCards: KpiCard[] = [];
  totalSalesValue = 0;

  salesVsTargetOptions?: Partial<BarChartOptions>;
  stockCategoryOptions?: Partial<BarChartOptions>;
  agingOptions?: Partial<DonutChartOptions>;
  topProductsOptions?: Partial<BarChartOptions>;

  productRows: ProductRow[] = [];
  regionRows: RegionRow[] = [];
  receivableRows: ReceivableRow[] = [];

  activeTab: TableTab = 'products';
  tableSearch = '';
  sort: Record<TableTab, { key: string; dir: SortDir }> = {
    products: { key: 'revenue', dir: 'desc' },
    region: { key: 'sales', dir: 'desc' },
    receivables: { key: 'outstanding', dir: 'desc' },
  };

  ngOnInit() {
    this.loadDistributors();
    this.refresh();
  }

  // ── Filter handling ──────────────────────────────────

  onFilterChange() {
    this.haptic.selectionChanged();
    this.refresh();
  }

  onFyChange() {
    const match = this.filters.fy.match(/FY (\d{4})-/);
    if (match) {
      const startYear = parseInt(match[1], 10);
      const fyStart = new Date(startYear, 3, 1);
      const now = new Date();
      const isCurrentFy = now >= fyStart && now < new Date(startYear + 1, 3, 1);
      const fyEnd = isCurrentFy ? now : new Date(startYear + 1, 2, 31);
      this.filters.dateFrom = this.toDateInputValue(fyStart);
      this.filters.dateTo = this.toDateInputValue(fyEnd);
    }
    this.onFilterChange();
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.onFilterChange();
  }

  refresh() {
    this.isLoading = true;
    setTimeout(() => {
      this.buildDashboard();
      this.lastUpdated = new Date();
      this.isLoading = false;
    }, 350);
  }

  // ── Dashboard build ──────────────────────────────────

  private buildDashboard() {
    this.buildKpiCards();
    this.buildSalesVsTargetChart();
    this.buildStockCategoryChart();
    this.buildAgingChart();
    this.buildTopProductsChart();
    this.buildProductRows();
    this.buildRegionRows();
    this.buildReceivableRows();
  }

  private buildKpiCards() {
    const mult = this.effectiveMultiplier;
    const sales = this.BASE_SALES * mult;
    const purchase = this.BASE_PURCHASE * mult;
    const stock = this.BASE_STOCK * mult;
    const receivable = this.BASE_RECEIVABLE * mult;

    this.totalSalesValue = sales;

    this.kpiCards = [
      { label: 'Total Sales', value: this.formatCurrencyFull(sales), change: this.BASE_CHANGE.sales, icon: 'trending-up-outline', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', borderClass: 'border-l-4 border-l-emerald-400' },
      { label: 'Total Purchase', value: this.formatCurrencyFull(purchase), change: this.BASE_CHANGE.purchase, icon: 'cart-outline', iconBg: 'bg-blue-50', iconColor: 'text-blue-500', borderClass: 'border-l-4 border-l-blue-400' },
      { label: 'Current Stock Value', value: this.formatCurrencyFull(stock), change: this.BASE_CHANGE.stock, icon: 'cube-outline', iconBg: 'bg-violet-50', iconColor: 'text-violet-500', borderClass: 'border-l-4 border-l-violet-400' },
      { label: 'Outstanding Receivable', value: this.formatCurrencyFull(receivable), change: this.BASE_CHANGE.receivable, icon: 'wallet-outline', iconBg: 'bg-amber-50', iconColor: 'text-amber-500', borderClass: 'border-l-4 border-l-amber-400' },
    ];
  }

  private buildSalesVsTargetChart() {
    const mult = this.effectiveMultiplier;
    const monthlySales = (this.BASE_SALES / 6) * mult;
    const rng = this.seededRandom('salesTarget|' + JSON.stringify(this.filters));
    const weeks = this.WEEK_SHAPE.map((_, i) => `Week ${i + 1}`);
    const actual = this.WEEK_SHAPE.map(s => Math.round(monthlySales * s));
    const target = actual.map(v => Math.round(v * (0.9 + rng() * 0.25)));

    this.salesVsTargetOptions = {
      series: [
        { name: 'Target', data: target },
        { name: 'Actual', data: actual },
      ],
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      colors: ['#93c5fd', '#3b82f6'],
      dataLabels: { enabled: false },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 6 } },
      xaxis: {
        categories: weeks,
        labels: { style: { colors: '#64748b', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: '#64748b', fontSize: '11px' }, formatter: (v: number) => this.formatCurrencyCompact(v) }
      },
      legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px', fontFamily: 'inherit', labels: { colors: '#475569' } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { y: { formatter: (v: number) => this.formatCurrencyFull(v) } },
    };
  }

  private buildStockCategoryChart() {
    const mult = this.effectiveMultiplier;
    const categories = this.STOCK_CATEGORIES.map(c => c.name);
    const values = this.STOCK_CATEGORIES.map(c => Math.round(this.BASE_STOCK * mult * c.share));

    this.stockCategoryOptions = {
      series: [{ name: 'Stock Value', data: values }],
      chart: { type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'inherit' },
      xaxis: { categories, labels: { style: { colors: '#64748b', fontSize: '10px' } } },
      yaxis: { labels: { style: { colors: '#64748b', fontSize: '11px' }, formatter: (v: number) => this.formatCurrencyCompact(v) } },
      colors: this.CATEGORICAL_COLORS,
      dataLabels: { enabled: false },
      plotOptions: { bar: { distributed: true, borderRadius: 8, columnWidth: '55%' } },
      legend: { show: false },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { y: { formatter: (v: number) => this.formatCurrencyFull(v) } },
    };
  }

  private buildAgingChart() {
    const mult = this.effectiveMultiplier;
    const series = this.AGING_BUCKETS.map(b => Math.round(this.BASE_RECEIVABLE * mult * b.share));

    this.agingOptions = {
      series: series as ApexNonAxisChartSeries,
      chart: { type: 'donut', height: 300, fontFamily: 'inherit' },
      labels: this.AGING_BUCKETS.map(b => b.label),
      colors: this.AGING_COLORS,
      legend: { position: 'bottom', fontSize: '12px', fontFamily: 'inherit', labels: { colors: '#475569' } },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Outstanding',
                color: '#475569',
                formatter: (w: any) => this.formatCurrencyCompact(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0))
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      responsive: [{ breakpoint: 480, options: { chart: { height: 260 } } }],
      tooltip: { y: { formatter: (v: number) => this.formatCurrencyFull(v) } },
    };
  }

  private buildTopProductsChart() {
    const totalProductRevenue = this.BASE_SALES * this.effectiveMultiplier * 0.82;
    const sorted = [...this.PRODUCTS].sort((a, b) => b.share - a.share);
    const categories = sorted.map(p => p.name);
    const values = sorted.map(p => Math.round(totalProductRevenue * p.share));

    this.topProductsOptions = {
      series: [{ name: 'Sales Value', data: values }],
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      colors: ['#3b82f6'],
      dataLabels: {
        enabled: true,
        formatter: (v: number) => this.formatCurrencyCompact(v),
        style: { fontSize: '11px', fontWeight: 700, colors: ['#1e3a8a'] },
        offsetX: 24,
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '55%' } },
      xaxis: {
        categories,
        labels: { style: { colors: '#64748b', fontSize: '11px' }, formatter: (v: string) => this.formatCurrencyCompact(+v) }
      },
      yaxis: { labels: { style: { colors: '#475569', fontSize: '12px', fontWeight: 600 } } },
      legend: { show: false },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { y: { formatter: (v: number) => this.formatCurrencyFull(v) } },
    };
  }

  private buildProductRows() {
    const totalProductRevenue = this.BASE_SALES * this.effectiveMultiplier * 0.82;
    const rng = this.seededRandom('products|' + JSON.stringify(this.filters));
    this.productRows = this.PRODUCTS.map((p, i) => {
      const revenue = totalProductRevenue * p.share;
      const avgPrice = 180 + rng() * 220;
      const unitsSold = Math.round(revenue / avgPrice);
      return { rank: i + 1, name: p.name, category: p.category, unitsSold, revenue, share: p.share * 100 };
    });
  }

  private buildRegionRows() {
    const mult = this.periodMultiplier * this.distributorWeight;
    const rng = this.seededRandom('region|' + JSON.stringify(this.filters));
    let rows: RegionRow[] = this.REGIONS.map((region, i) => {
      const weight = this.REGION_WEIGHTS[i];
      return {
        region,
        sales: this.BASE_SALES * mult * weight,
        purchase: this.BASE_PURCHASE * mult * weight,
        stockValue: this.BASE_STOCK * mult * weight,
        receivable: this.BASE_RECEIVABLE * mult * weight,
        orders: Math.round(140 * weight * 5 + rng() * 40),
      };
    });
    if (this.filters.region !== 'all') {
      rows = rows.filter(r => r.region === this.filters.region);
    }
    this.regionRows = rows;
  }

  private buildReceivableRows() {
    const mult = this.periodMultiplier * this.regionWeight;
    const source = this.filters.distributorId === 'all'
      ? this.distributors
      : this.distributors.filter(d => d.id === this.filters.distributorId);

    this.receivableRows = source.map((d, i) => {
      const rng = this.seededRandom(`recv|${d.id}|${this.filters.dateFrom}|${this.filters.dateTo}`);
      const outstanding = Math.round((90000 + rng() * 820000) * mult);
      const daysOverdue = Math.round(rng() * 95);
      const invoices = Math.round(2 + rng() * 12);
      const status: ReceivableRow['status'] = daysOverdue > 60 ? 'Overdue' : daysOverdue > 30 ? 'Watch' : 'Healthy';
      return { distributor: d.name, region: this.REGIONS[i % this.REGIONS.length], invoices, outstanding, daysOverdue, status };
    });
  }

  // ── Filter-derived weighting ─────────────────────────

  private get periodMultiplier(): number {
    const seed = `${this.filters.dateFrom}|${this.filters.dateTo}`;
    return 0.85 + this.seededRandom(seed)() * 0.35;
  }

  private get regionWeight(): number {
    if (this.filters.region === 'all') return 1;
    const idx = this.REGIONS.indexOf(this.filters.region);
    return idx >= 0 ? this.REGION_WEIGHTS[idx] : 1;
  }

  private get distributorWeight(): number {
    if (this.filters.distributorId === 'all') return 1;
    return 0.02 + this.seededRandom(this.filters.distributorId)() * 0.06;
  }

  private get effectiveMultiplier(): number {
    return this.periodMultiplier * this.regionWeight * this.distributorWeight;
  }

  // ── Table search / sort ──────────────────────────────

  switchTab(tab: TableTab) {
    this.activeTab = tab;
    this.tableSearch = '';
    this.haptic.selectionChanged();
  }

  sortBy(tab: TableTab, key: string) {
    const state = this.sort[tab];
    if (state.key === key) {
      state.dir = state.dir === 'asc' ? 'desc' : 'asc';
    } else {
      state.key = key;
      state.dir = 'desc';
    }
  }

  sortIcon(tab: TableTab, key: string): string {
    const s = this.sort[tab];
    if (s.key !== key) return 'swap-vertical-outline';
    return s.dir === 'asc' ? 'caret-up-outline' : 'caret-down-outline';
  }

  get filteredProductRows(): ProductRow[] {
    const term = this.tableSearch.trim().toLowerCase();
    let rows = term
      ? this.productRows.filter(r => r.name.toLowerCase().includes(term) || r.category.toLowerCase().includes(term))
      : [...this.productRows];
    const { key, dir } = this.sort.products;
    return this.sortRows(rows, key, dir);
  }

  get filteredRegionRows(): RegionRow[] {
    const term = this.tableSearch.trim().toLowerCase();
    let rows = term ? this.regionRows.filter(r => r.region.toLowerCase().includes(term)) : [...this.regionRows];
    const { key, dir } = this.sort.region;
    return this.sortRows(rows, key, dir);
  }

  get filteredReceivableRows(): ReceivableRow[] {
    const term = this.tableSearch.trim().toLowerCase();
    let rows = term
      ? this.receivableRows.filter(r => r.distributor.toLowerCase().includes(term) || r.region.toLowerCase().includes(term))
      : [...this.receivableRows];
    const { key, dir } = this.sort.receivables;
    return this.sortRows(rows, key, dir);
  }

  private sortRows<T extends Record<string, any>>(rows: T[], key: string, dir: SortDir): T[] {
    const factor = dir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'string') return av.localeCompare(bv) * factor;
      return (av - bv) * factor;
    });
  }

  statusBadgeClass(status: ReceivableRow['status']): string {
    if (status === 'Healthy') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Watch') return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  }

  // ── Exports ───────────────────────────────────────────

  async exportExcel() {
    const { jsonRows, title } = this.getExportData();
    const worksheet = XLSX.utils.json_to_sheet(jsonRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31));
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    await this.downloadService.downloadBlob(blob, `mis-${this.slugify(title)}-${this.getStamp()}.xlsx`);
    this.toast.present('Excel exported successfully', 'success');
  }

  async exportPdf() {
    const { headers, rows, title } = this.getExportData();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(16);
    doc.setTextColor(5, 150, 105);
    doc.text(`MIS Dashboard — ${title}`, 14, 16);

    autoTable(doc, {
      startY: 24,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      bodyStyles: { textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      margin: { top: 24, left: 14, right: 14, bottom: 14 },
    });

    const blob = doc.output('blob');
    await this.downloadService.downloadBlob(blob, `mis-${this.slugify(title)}-${this.getStamp()}.pdf`);
    this.toast.present('PDF exported successfully', 'success');
  }

  private getExportData(): { headers: string[]; rows: (string | number)[][]; jsonRows: any[]; title: string } {
    if (this.activeTab === 'products') {
      const headers = ['Rank', 'Product', 'Category', 'Units Sold', 'Revenue', 'Share %'];
      const rows = this.filteredProductRows.map(r => [r.rank, r.name, r.category, r.unitsSold, this.formatCurrencyFull(r.revenue), r.share.toFixed(1) + '%']);
      const jsonRows = this.filteredProductRows.map(r => ({ Rank: r.rank, Product: r.name, Category: r.category, 'Units Sold': r.unitsSold, Revenue: Math.round(r.revenue), 'Share %': r.share.toFixed(1) }));
      return { headers, rows, jsonRows, title: 'Top Selling Products' };
    }
    if (this.activeTab === 'region') {
      const headers = ['Region', 'Sales', 'Purchase', 'Stock Value', 'Receivable', 'Orders'];
      const rows = this.filteredRegionRows.map(r => [r.region, this.formatCurrencyFull(r.sales), this.formatCurrencyFull(r.purchase), this.formatCurrencyFull(r.stockValue), this.formatCurrencyFull(r.receivable), r.orders]);
      const jsonRows = this.filteredRegionRows.map(r => ({ Region: r.region, Sales: Math.round(r.sales), Purchase: Math.round(r.purchase), 'Stock Value': Math.round(r.stockValue), Receivable: Math.round(r.receivable), Orders: r.orders }));
      return { headers, rows, jsonRows, title: 'Region-wise Performance' };
    }
    const headers = ['Distributor', 'Region', 'Invoices', 'Outstanding', 'Days Overdue', 'Status'];
    const rows = this.filteredReceivableRows.map(r => [r.distributor, r.region, r.invoices, this.formatCurrencyFull(r.outstanding), r.daysOverdue, r.status]);
    const jsonRows = this.filteredReceivableRows.map(r => ({ Distributor: r.distributor, Region: r.region, Invoices: r.invoices, Outstanding: r.outstanding, 'Days Overdue': r.daysOverdue, Status: r.status }));
    return { headers, rows, jsonRows, title: 'Outstanding Receivables' };
  }

  // ── Distributors ──────────────────────────────────────

  private loadDistributors() {
    this.salesService.getAllDistributors().subscribe({
      next: (list) => {
        const active = (list || []).filter(d => (d.status || '').toUpperCase() !== 'INACTIVE');
        if (active.length) {
          this.distributors = active;
          this.buildReceivableRows();
        }
      },
      error: () => { /* keep mock fallback */ }
    });
  }

  private mockDistributors(): Distributor[] {
    return ['Shree Distributors', 'Metro Traders', 'Sunrise Agencies', 'Coastal Supplies', 'Highland Mart'].map((name, i) => ({
      id: String(i + 1), name, salesPersonName: '', salesPerMonth: 0, salesPerQuarter: 0, salesPerYear: 0, status: 'ACTIVE', createdAt: '', updatedAt: ''
    }));
  }

  // ── Formatting helpers ────────────────────────────────

  formatCurrencyFull(val: number): string {
    const sign = val < 0 ? '-' : '';
    return `${sign}₹ ${Math.abs(Math.round(val)).toLocaleString('en-IN')}`;
  }

  formatCurrencyCompact(val: number): string {
    const sign = val < 0 ? '-' : '';
    const abs = Math.abs(val);
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
    if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
    return `${sign}₹${abs.toFixed(0)}`;
  }

  formatChange(change: number): string {
    return `${Math.abs(change).toFixed(1)}%`;
  }

  changeBadgeClass(change: number): string {
    return change >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';
  }

  // ── Date / FY helpers ─────────────────────────────────

  private buildDefaultFilters(): FilterState {
    const now = new Date();
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = new Date(fyStartYear, 3, 1);
    return {
      dateFrom: this.toDateInputValue(fyStart),
      dateTo: this.toDateInputValue(now),
      fy: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
      region: 'all',
      distributorId: 'all',
    };
  }

  private buildFyOptions(): string[] {
    const now = new Date();
    const currentFyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const list: string[] = [];
    for (let i = 0; i < 4; i++) {
      const startYear = currentFyStartYear - i;
      list.push(`FY ${startYear}-${(startYear + 1).toString().slice(-2)}`);
    }
    return list;
  }

  private buildLast6MonthLabels(endDateStr: string): string[] {
    const end = endDateStr ? new Date(endDateStr) : new Date();
    const labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    }
    return labels;
  }

  private toDateInputValue(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private getStamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Deterministic PRNG keyed by a filter signature — no MIS analytics endpoint exists yet,
  // so the same filter selection always reproduces the same figures instead of jumping around.
  private seededRandom(seed: string): () => number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }
}
