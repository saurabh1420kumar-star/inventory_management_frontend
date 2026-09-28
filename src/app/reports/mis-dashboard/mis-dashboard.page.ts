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
import { ReportsService } from '../../services/reports.service';
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

interface DropdownOption {
  id: string;
  name: string;
}

interface KpiCard {
  label: string;
  value: string;
  change: number | null;
  compareLabel: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  borderClass: string;
}

// Mirrors GET /reports/mis/dashboard .productPerformance / .topProducts rows (minus productId — an
// internal key). categoryName isn't returned by this endpoint, unlike other reports' product rows.
interface ProductRow {
  rank: number;
  name: string;
  unitsSold: number;
  invoices: number;
  revenue: number;
  share: number;
}

// Mirrors .regionPerformance rows — no purchase/stockValue/receivable breakdown per region exists in
// this response, only sales + invoice + distributor counts.
interface RegionRow {
  region: string;
  totalSales: number;
  invoiceCount: number;
  distributorCount: number;
}

// Mirrors .distributorOutstanding rows. distributorId is kept (unlike other dropped id fields) because
// it's needed to drive the Distributor filter dropdown; region/daysOverdue/status don't exist in this
// response (no per-distributor ageing or due-date data), so the old health badge is dropped.
interface DistributorOutstandingRow {
  distributorId: number;
  distributorName: string;
  totalInvoices: number;
  totalSales: number;
  receivedAmount: number;
  outstandingAmount: number;
}

interface MisMetric {
  amount: number;
  changePercentage: number | null;
  comparedTo: string | null;
}

function metricOrZero(raw: any): MisMetric {
  return {
    amount: Number(raw?.amount ?? 0),
    changePercentage: raw?.changePercentage ?? null,
    comparedTo: raw?.comparedTo ?? null,
  };
}

function comparedToLabel(comparedTo: string | null): string {
  if (comparedTo === 'PREV_PERIOD') return 'vs previous period';
  if (comparedTo === 'PREV_MONTH') return 'vs last month';
  if (comparedTo === 'PREV_YEAR') return 'vs last year';
  return '';
}

const CATEGORY_LABELS: Record<string, string> = {
  RAW: 'Raw Material',
  FINISHED: 'Finished Goods',
  SCRAP: 'Scrap',
  MACHINE_PARTS: 'Machine Parts',
  PROMOTIONAL_ITEMS: 'Promotional Items',
};

function prettifyCategory(code: string): string {
  if (CATEGORY_LABELS[code]) return CATEGORY_LABELS[code];
  return code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// Fixed display order/labels for the ageing donut — the raw object's key order isn't guaranteed to be
// chronological (the backend has been observed to serialize "90+" before "0-30").
const AGING_BUCKETS = [
  { key: '0-30', label: '0-30 Days' },
  { key: '31-60', label: '31-60 Days' },
  { key: '61-90', label: '61-90 Days' },
  { key: '90+', label: '90+ Days' },
];

function mapProductRow(raw: any): ProductRow {
  return {
    rank: Number(raw.rank ?? 0),
    name: (raw.productName ?? '—').trim(),
    unitsSold: Number(raw.totalQuantity ?? 0),
    invoices: Number(raw.invoiceCount ?? 0),
    revenue: Number(raw.totalAmount ?? 0),
    share: Number(raw.sharePercentage ?? 0),
  };
}

function mapRegionRow(raw: any): RegionRow {
  return {
    region: raw.region ?? '—',
    totalSales: Number(raw.totalSales ?? 0),
    invoiceCount: Number(raw.invoiceCount ?? 0),
    distributorCount: Number(raw.distributorCount ?? 0),
  };
}

function mapDistributorOutstandingRow(raw: any): DistributorOutstandingRow {
  return {
    distributorId: Number(raw.distributorId ?? 0),
    distributorName: (raw.distributorName ?? '—').trim(),
    totalInvoices: Number(raw.totalInvoices ?? 0),
    totalSales: Number(raw.totalSales ?? 0),
    receivedAmount: Number(raw.receivedAmount ?? 0),
    outstandingAmount: Number(raw.outstandingAmount ?? 0),
  };
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

  private reportsService = inject(ReportsService);
  private downloadService = inject(DownloadService);
  private toast = inject(Toast);
  private haptic = inject(HapticService);

  // Fixed categorical order — validated colorblind-safe (blue/emerald/amber/rose/violet)
  private readonly CATEGORICAL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  // Single-hue ordinal ramp (light→dark) for the ageing donut — one shade per AGING_BUCKETS entry
  private readonly AGING_COLORS = ['#60a5fa', '#3b82f6', '#2563eb', '#1e40af'];

  isLoading = true;
  lastUpdated = new Date();

  filters: FilterState = this.buildDefaultFilters();
  fyOptions: string[] = this.buildFyOptions();
  regions: string[] = [];
  distributors: DropdownOption[] = [];

  kpiCards: KpiCard[] = [];

  salesVsTargetOptions?: Partial<BarChartOptions>;
  stockCategoryOptions?: Partial<BarChartOptions>;
  agingOptions?: Partial<DonutChartOptions>;
  topProductsOptions?: Partial<BarChartOptions>;

  productRows: ProductRow[] = [];
  regionRows: RegionRow[] = [];
  receivableRows: DistributorOutstandingRow[] = [];

  private allRegionRows: RegionRow[] = [];
  private allDistributorRows: DistributorOutstandingRow[] = [];

  activeTab: TableTab = 'products';
  tableSearch = '';
  sort: Record<TableTab, { key: string; dir: SortDir }> = {
    products: { key: 'revenue', dir: 'desc' },
    region: { key: 'totalSales', dir: 'desc' },
    receivables: { key: 'outstandingAmount', dir: 'desc' },
  };

  ngOnInit() {
    this.refresh();
  }

  // ── Filter handling ──────────────────────────────────

  onFilterChange() {
    this.haptic.selectionChanged();
    this.refresh();
  }

  // Region/Distributor only narrow their own drill-down table client-side (see applyRowFilters) —
  // the dashboard summary/charts come from one unfiltered snapshot call for the date range.
  onRowFilterChange() {
    this.haptic.selectionChanged();
    this.applyRowFilters();
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
    this.reportsService.getMisDashboard({ dateFrom: this.filters.dateFrom, dateTo: this.filters.dateTo })
      .subscribe(res => {
        this.buildDashboard(res ?? {});
        this.lastUpdated = new Date();
        this.isLoading = false;
      });
  }

  // ── Dashboard build ──────────────────────────────────

  private buildDashboard(raw: any) {
    this.buildKpiCards(raw.summary ?? {});
    this.buildSalesVsTargetChart(raw.salesTarget ?? []);
    this.buildTopProductsChart(raw.topProducts ?? []);
    this.buildStockCategoryChart(raw.stockByCategory ?? []);
    this.buildAgingChart(raw.receivableAging ?? {});
    this.productRows = (raw.productPerformance ?? []).map(mapProductRow);

    this.allRegionRows = (raw.regionPerformance ?? []).map(mapRegionRow).sort((a: RegionRow, b: RegionRow) => b.totalSales - a.totalSales);
    this.regions = this.allRegionRows.map(r => r.region);

    this.allDistributorRows = (raw.distributorOutstanding ?? []).map(mapDistributorOutstandingRow).sort((a: DistributorOutstandingRow, b: DistributorOutstandingRow) => b.outstandingAmount - a.outstandingAmount);
    this.distributors = [...this.allDistributorRows]
      .sort((a, b) => a.distributorName.localeCompare(b.distributorName))
      .map(r => ({ id: String(r.distributorId), name: r.distributorName }));

    this.applyRowFilters();
  }

  private applyRowFilters() {
    this.regionRows = this.filters.region === 'all' ? this.allRegionRows : this.allRegionRows.filter(r => r.region === this.filters.region);
    this.receivableRows = this.filters.distributorId === 'all' ? this.allDistributorRows : this.allDistributorRows.filter(r => String(r.distributorId) === this.filters.distributorId);
  }

  private buildKpiCards(summary: any) {
    this.kpiCards = [
      this.buildKpiCard('Total Sales', metricOrZero(summary.totalSales), 'trending-up-outline', 'bg-emerald-50', 'text-emerald-500', 'border-l-4 border-l-emerald-400'),
      this.buildKpiCard('Total Purchase', metricOrZero(summary.totalPurchase), 'cart-outline', 'bg-blue-50', 'text-blue-500', 'border-l-4 border-l-blue-400'),
      this.buildKpiCard('Current Stock Value', metricOrZero(summary.currentStockValue), 'cube-outline', 'bg-violet-50', 'text-violet-500', 'border-l-4 border-l-violet-400'),
      this.buildKpiCard('Outstanding Receivable', metricOrZero(summary.outstandingReceivable), 'wallet-outline', 'bg-amber-50', 'text-amber-500', 'border-l-4 border-l-amber-400'),
    ];
  }

  private buildKpiCard(label: string, metric: MisMetric, icon: string, iconBg: string, iconColor: string, borderClass: string): KpiCard {
    return {
      label,
      value: this.formatCurrencyFull(metric.amount),
      change: metric.changePercentage,
      compareLabel: comparedToLabel(metric.comparedTo),
      icon, iconBg, iconColor, borderClass,
    };
  }

  private buildSalesVsTargetChart(salesTarget: any[]) {
    const periods = salesTarget.map(w => w.period ?? '—');
    const actual = salesTarget.map(w => Number(w.actual ?? 0));
    const hasTarget = salesTarget.some(w => w.target !== null && w.target !== undefined);
    const target = salesTarget.map(w => Number(w.target ?? 0));

    const series: ApexAxisChartSeries = hasTarget
      ? [{ name: 'Target', data: target }, { name: 'Actual', data: actual }]
      : [{ name: 'Actual', data: actual }];

    this.salesVsTargetOptions = {
      series,
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      colors: hasTarget ? ['#93c5fd', '#3b82f6'] : ['#3b82f6'],
      dataLabels: { enabled: false },
      plotOptions: { bar: { columnWidth: hasTarget ? '55%' : '45%', borderRadius: 6 } },
      xaxis: {
        categories: periods,
        labels: { style: { colors: '#64748b', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: '#64748b', fontSize: '11px' }, formatter: (v: number) => this.formatCurrencyCompact(v) }
      },
      legend: hasTarget
        ? { position: 'top', horizontalAlign: 'right', fontSize: '12px', fontFamily: 'inherit', labels: { colors: '#475569' } }
        : { show: false },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { y: { formatter: (v: number) => this.formatCurrencyFull(v) } },
    };
  }

  private buildStockCategoryChart(stockByCategory: any[]) {
    const categories = stockByCategory.map(c => prettifyCategory(c.categoryName ?? ''));
    const values = stockByCategory.map(c => Number(c.stockValue ?? 0));

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

  private buildAgingChart(receivableAging: Record<string, number>) {
    const series = AGING_BUCKETS.map(b => Number(receivableAging[b.key] ?? 0));

    this.agingOptions = {
      series: series as ApexNonAxisChartSeries,
      chart: { type: 'donut', height: 300, fontFamily: 'inherit' },
      labels: AGING_BUCKETS.map(b => b.label),
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

  private buildTopProductsChart(topProducts: any[]) {
    const sorted = [...topProducts].sort((a, b) => Number(a.rank ?? 0) - Number(b.rank ?? 0));
    const categories = sorted.map(p => (p.productName ?? '—').trim());
    const values = sorted.map(p => Number(p.totalAmount ?? 0));

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
    let rows = term ? this.productRows.filter(r => r.name.toLowerCase().includes(term)) : [...this.productRows];
    const { key, dir } = this.sort.products;
    return this.sortRows(rows, key, dir);
  }

  get filteredRegionRows(): RegionRow[] {
    const term = this.tableSearch.trim().toLowerCase();
    let rows = term ? this.regionRows.filter(r => r.region.toLowerCase().includes(term)) : [...this.regionRows];
    const { key, dir } = this.sort.region;
    return this.sortRows(rows, key, dir);
  }

  get filteredReceivableRows(): DistributorOutstandingRow[] {
    const term = this.tableSearch.trim().toLowerCase();
    let rows = term ? this.receivableRows.filter(r => r.distributorName.toLowerCase().includes(term)) : [...this.receivableRows];
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
      const headers = ['Rank', 'Product', 'Units Sold', 'Invoices', 'Revenue', 'Share %'];
      const rows = this.filteredProductRows.map(r => [r.rank, r.name, r.unitsSold, r.invoices, this.formatCurrencyFull(r.revenue), r.share.toFixed(1) + '%']);
      const jsonRows = this.filteredProductRows.map(r => ({ Rank: r.rank, Product: r.name, 'Units Sold': r.unitsSold, Invoices: r.invoices, Revenue: Math.round(r.revenue), 'Share %': r.share.toFixed(1) }));
      return { headers, rows, jsonRows, title: 'Top Selling Products' };
    }
    if (this.activeTab === 'region') {
      const headers = ['Region', 'Total Sales', 'Invoices', 'Distributors'];
      const rows = this.filteredRegionRows.map(r => [r.region, this.formatCurrencyFull(r.totalSales), r.invoiceCount, r.distributorCount]);
      const jsonRows = this.filteredRegionRows.map(r => ({ Region: r.region, 'Total Sales': Math.round(r.totalSales), Invoices: r.invoiceCount, Distributors: r.distributorCount }));
      return { headers, rows, jsonRows, title: 'Region-wise Performance' };
    }
    const headers = ['Distributor', 'Total Invoices', 'Total Sales', 'Received', 'Outstanding'];
    const rows = this.filteredReceivableRows.map(r => [r.distributorName, r.totalInvoices, this.formatCurrencyFull(r.totalSales), this.formatCurrencyFull(r.receivedAmount), this.formatCurrencyFull(r.outstandingAmount)]);
    const jsonRows = this.filteredReceivableRows.map(r => ({ Distributor: r.distributorName, 'Total Invoices': r.totalInvoices, 'Total Sales': Math.round(r.totalSales), Received: Math.round(r.receivedAmount), Outstanding: Math.round(r.outstandingAmount) }));
    return { headers, rows, jsonRows, title: 'Outstanding by Distributor' };
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

  private toDateInputValue(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private getStamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
