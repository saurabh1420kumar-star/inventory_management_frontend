// dashboard.page.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Auth } from '../services/auth';
import { LegalDocsModalComponent } from '../components/legal-docs-modal/legal-docs-modal.component';
import { Router, ActivatedRoute } from '@angular/router';
import { DistributorDashboardPage } from './distributor-dashboard.page';
import { HapticService } from '../services/haptic.service';
import { DashboardService, DashboardAnalytics, MonthlySalesResponse } from '../services/dashboard.service';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexDataLabels,
  ApexGrid,
  ApexFill,
  ApexTooltip,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexLegend,
  ApexResponsive
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  colors: string[];
  fill: ApexFill;
  tooltip: ApexTooltip;
};

export type DonutChartOptions = {
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

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  grid: ApexGrid;
  tooltip: ApexTooltip;
};

export type Period = 'wtd' | 'mtd' | 'ytd';

interface StatsCard {
  label: string;
  value: string;
  change: string;
  icon: string;
  bgClass: string;
  iconClass: string;
  badgeClass: string;
  borderClass: string;
}

interface UserStatCard {
  label: string;
  value: number;
  icon: string;
  bgClass: string;
  iconClass: string;
  textClass: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NgApexchartsModule,
    DistributorDashboardPage,
    LegalDocsModalComponent
  ],
})
export class DashboardPage implements OnInit {

  currentUser = { name: 'Admin' };
  isDistributor = false;
  isReady = false;
  isLoading = true;

  currentDate = new Date();
  selectedPeriod: Period = 'mtd';

  analytics: DashboardAnalytics | null = null;

  // KPI Stats cards (period-aware)
  statsCards: StatsCard[] = [
    {
      label: 'Total Sales',
      value: '₹0',
      change: '—',
      icon: 'trending-up',
      bgClass: 'bg-emerald-50',
      iconClass: 'text-emerald-500',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      borderClass: 'border-l-4 border-l-emerald-400'
    },
    {
      label: 'Transactions',
      value: '0',
      change: '—',
      icon: 'swap-horizontal-outline',
      bgClass: 'bg-blue-50',
      iconClass: 'text-blue-500',
      badgeClass: 'bg-blue-100 text-blue-700',
      borderClass: 'border-l-4 border-l-blue-400'
    },
    {
      label: 'Avg Order Value',
      value: '₹0',
      change: '—',
      icon: 'stats-chart-outline',
      bgClass: 'bg-violet-50',
      iconClass: 'text-violet-500',
      badgeClass: 'bg-violet-100 text-violet-700',
      borderClass: 'border-l-4 border-l-violet-400'
    },
    {
      label: 'Total Orders',
      value: '0',
      change: '—',
      icon: 'cart-outline',
      bgClass: 'bg-amber-50',
      iconClass: 'text-amber-500',
      badgeClass: 'bg-amber-100 text-amber-700',
      borderClass: 'border-l-4 border-l-amber-400'
    }
  ];

  // Period comparison rows
  periodRows: { label: string; wtd: string; mtd: string; ytd: string }[] = [];

  // User stats cards
  userStatCards: UserStatCard[] = [];

  // Indian Financial Year month order: Apr → Mar
  private readonly FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  // Month index in calendar year for each FY position (Apr=3, May=4 ... Mar=2)
  private readonly FY_MONTH_INDICES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];

  // Region chart data
  regionLabels: string[] = [];
  regionValues: number[] = [];

  // Chart options
  public chartOptions: Partial<ChartOptions> | undefined;
  public regionDonutOptions: Partial<DonutChartOptions> | undefined;
  public regionBarOptions: Partial<BarChartOptions> | undefined;
  selectedChartType: 'line' | 'bar' = 'line';

  showPdfModal = false;
  pdfModalTitle = '';
  legalDocType: 'privacy' | 'terms' = 'privacy';

  private haptic = inject(HapticService);

  constructor(
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private dashboardService: DashboardService
  ) {}

  openLegalDoc(type: 'privacy' | 'terms', title: string): void {
    this.legalDocType = type;
    this.pdfModalTitle = title;
    this.showPdfModal = true;
  }

  closePdfModal(): void {
    this.showPdfModal = false;
  }

  ngOnInit() {
    this.checkUserRole();
    this.initializeChart();
    this.loadDashboardAnalytics();
  }

  get periods(): { key: Period; label: string }[] {
    return [
      { key: 'wtd', label: 'Week' },
      { key: 'mtd', label: 'Month' },
      { key: 'ytd', label: 'Year' }
    ];
  }

  selectPeriod(p: Period) {
    this.selectedPeriod = p;
    if (this.analytics) {
      this.updateStatsCards(this.analytics);
      this.buildRegionCharts(this.analytics);
    }
  }

  formatCurrency(val: number): string {
    if (val >= 100000) return '₹' + (val / 100000).toFixed(2) + 'L';
    if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
    return '₹' + val;
  }

  formatNumber(val: number): string {
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toString();
  }

  loadDashboardAnalytics() {
    this.isLoading = true;
    this.dashboardService.getAnalytics().subscribe({
      next: (data: DashboardAnalytics) => {
        if (data && Object.keys(data).length > 0) {
          this.analytics = data;
          this.updateStatsCards(data);
          this.buildPeriodRows(data);
          this.buildUserStatCards(data);
          this.buildRegionCharts(data);
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    this.dashboardService.getMonthlySales().subscribe({
      next: (res: MonthlySalesResponse) => {
        if (res?.months?.length) {
          this.buildMonthlyChartFromResponse(res);
        }
      }
    });
  }

  private updateStatsCards(data: DashboardAnalytics) {
    const periodMap = {
      wtd: data.weekToDate,
      mtd: data.monthToDate,
      ytd: data.yearToDate
    };
    const metrics = periodMap[this.selectedPeriod] || data.monthToDate;

    this.statsCards[0].value = this.formatCurrency(metrics.totalSales || 0);
    this.statsCards[1].value = (metrics.transactionCount || 0).toString();
    this.statsCards[2].value = this.formatCurrency(metrics.averageOrderValue || 0);
    this.statsCards[3].value = (data.totalOrders || 0).toString();

    // change badges: YTD vs MTD comparison for first 3, keep static for orders
    const mtd = data.monthToDate;
    const ytd = data.yearToDate;
    const pctChange = (a: number, b: number) =>
      b > 0 ? ((a - b) / b * 100).toFixed(1) + '%' : '—';

    this.statsCards[0].change = pctChange(mtd.totalSales, ytd.totalSales);
    this.statsCards[1].change = pctChange(mtd.transactionCount, ytd.transactionCount);
    this.statsCards[2].change = pctChange(mtd.averageOrderValue, ytd.averageOrderValue);
    this.statsCards[3].change = 'All time';
  }

  private buildPeriodRows(data: DashboardAnalytics) {
    this.periodRows = [
      {
        label: 'Total Sales',
        wtd: this.formatCurrency(data.weekToDate?.totalSales || 0),
        mtd: this.formatCurrency(data.monthToDate?.totalSales || 0),
        ytd: this.formatCurrency(data.yearToDate?.totalSales || 0)
      },
      {
        label: 'Transactions',
        wtd: (data.weekToDate?.transactionCount || 0).toString(),
        mtd: (data.monthToDate?.transactionCount || 0).toString(),
        ytd: (data.yearToDate?.transactionCount || 0).toString()
      },
      {
        label: 'Avg Order Value',
        wtd: this.formatCurrency(data.weekToDate?.averageOrderValue || 0),
        mtd: this.formatCurrency(data.monthToDate?.averageOrderValue || 0),
        ytd: this.formatCurrency(data.yearToDate?.averageOrderValue || 0)
      }
    ];
  }

  private buildUserStatCards(data: DashboardAnalytics) {
    const us = data.userStats || { dealers: 0, distributors: 0, salespersons: 0, totalUsers: 0, users: 0 };
    this.userStatCards = [
      { label: 'Dealers', value: us.dealers, icon: 'storefront-outline', bgClass: 'bg-blue-50', iconClass: 'text-blue-500', textClass: 'text-blue-700' },
      { label: 'Distributors', value: us.distributors, icon: 'business-outline', bgClass: 'bg-emerald-50', iconClass: 'text-emerald-500', textClass: 'text-emerald-700' },
      { label: 'Salespersons', value: us.salespersons, icon: 'person-outline', bgClass: 'bg-violet-50', iconClass: 'text-violet-500', textClass: 'text-violet-700' },
      { label: 'Registered Users', value: us.users, icon: 'people-circle-outline', bgClass: 'bg-amber-50', iconClass: 'text-amber-500', textClass: 'text-amber-700' },
      { label: 'Total Users', value: us.totalUsers, icon: 'people-outline', bgClass: 'bg-rose-50', iconClass: 'text-rose-500', textClass: 'text-rose-700' }
    ];
  }

  private buildRegionCharts(data: DashboardAnalytics) {
    const periodMetrics = { wtd: data.weekToDate, mtd: data.monthToDate, ytd: data.yearToDate }[this.selectedPeriod];

    let region: { [key: string]: number };

    if (periodMetrics?.salesByRegion) {
      // Backend provides per-period regional breakdown — use it directly
      region = periodMetrics.salesByRegion;
    } else {
      // Scale global salesByRegion proportionally to the selected period's totalSales
      const globalRegion = data.salesByRegion || {};
      const globalTotal = Object.values(globalRegion).reduce((a, b) => a + b, 0);
      const periodTotal = periodMetrics?.totalSales ?? 0;

      if (globalTotal > 0 && periodTotal > 0) {
        region = Object.keys(globalRegion).reduce((acc, k) => {
          acc[k] = Math.round((globalRegion[k] / globalTotal) * periodTotal);
          return acc;
        }, {} as { [key: string]: number });
      } else {
        region = globalRegion;
      }
    }

    this.regionLabels = Object.keys(region);
    this.regionValues = Object.values(region);

    this.regionDonutOptions = {
      series: this.regionValues as ApexNonAxisChartSeries,
      chart: { type: 'donut', height: 280, fontFamily: 'inherit' },
      labels: this.regionLabels,
      colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
      legend: { position: 'bottom', fontSize: '12px', fontFamily: 'inherit', labels: { colors: '#475569' } },
      plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', color: '#475569', formatter: (w: any) => this.formatCurrency(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) } } } } },
      dataLabels: { enabled: false },
      responsive: [{ breakpoint: 480, options: { chart: { height: 220 } } }],
      tooltip: { y: { formatter: (val: number) => this.formatCurrency(val) } }
    };

    this.regionBarOptions = {
      series: [{ name: 'Sales', data: this.regionValues }],
      chart: { type: 'bar', height: 240, toolbar: { show: false }, fontFamily: 'inherit' },
      xaxis: { categories: this.regionLabels, labels: { style: { colors: '#64748b', fontSize: '11px' } } },
      yaxis: { labels: { style: { colors: '#64748b', fontSize: '11px' }, formatter: (v: number) => this.formatCurrency(v) } },
      colors: ['#10b981'],
      dataLabels: { enabled: false },
      plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { y: { formatter: (val: number) => this.formatCurrency(val) } }
    };
  }

  checkUserRole() {
    const roleType = this.auth.getRoleType()?.toUpperCase() || '';
    const isSalesRole = roleType.includes('SALES') || roleType === 'SALESPERSON' || roleType === 'NSM' || roleType === 'RSM' || roleType === 'TSM' || roleType === 'ASM';
    if (isSalesRole) {
      const fromSales = this.route.snapshot.queryParams['fromSales'];
      if (fromSales) {
        this.isDistributor = true;
        this.isReady = true;
        return;
      }
      this.router.navigate(['/sales/sales-dashboard'], { replaceUrl: true });
      return;
    }
    this.isDistributor = roleType === 'DISTRIBUTOR';
    this.isReady = true;
  }

  initializeChart(revenueData?: number[], ordersData?: number[]) {
    const rev = revenueData ?? new Array(12).fill(0);
    const ord = ordersData ?? new Array(12).fill(0);
    const maxVal = Math.max(...rev, ...ord);
    // When no real data exists, default the Y-axis to a 5L range so the axis shows Lakh scale
    const yMax = maxVal > 0 ? undefined : 500000;

    this.chartOptions = {
      series: [
        { name: 'Revenue (₹)', data: rev },
        { name: 'Orders', data: ord }
      ],
      chart: { height: 300, type: this.selectedChartType, toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#10b981', '#3b82f6'],
      dataLabels: { enabled: false },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 5 },
      xaxis: {
        categories: this.FY_MONTHS,
        labels: { style: { colors: '#64748b', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
        title: { text: 'FY (Apr – Mar)', style: { color: '#94a3b8', fontSize: '10px' } }
      },
      yaxis: {
        min: 0,
        max: yMax,
        tickAmount: 5,
        labels: {
          style: { colors: '#64748b', fontSize: '11px' },
          formatter: (value: number) => {
            if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
            if (value >= 100000)   return '₹' + (value / 100000).toFixed(1) + 'L';
            if (value >= 1000)     return '₹' + (value / 1000).toFixed(1) + 'K';
            return '₹' + value.toFixed(0);
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.3, gradientToColors: ['#34d399', '#60a5fa'], opacityFrom: 0.6, opacityTo: 0.05, stops: [0, 100] }
      },
      tooltip: {
        y: {
          formatter: (value: number) => {
            if (value >= 10000000) return '₹' + (value / 10000000).toFixed(2) + ' Cr';
            if (value >= 100000)   return '₹' + (value / 100000).toFixed(2) + ' L';
            if (value >= 1000)     return '₹' + (value / 1000).toFixed(1) + 'K';
            return '₹' + value.toLocaleString('en-IN');
          }
        }
      }
    };
  }

  private buildMonthlyChartFromResponse(res: MonthlySalesResponse) {
    // API returns months already in FY order (Apr → Mar); build a lookup by month name
    const byMonth = new Map(res.months.map(m => [m.month, m]));

    const revenueData = this.FY_MONTHS.map(m => byMonth.get(m)?.revenue ?? 0);
    const ordersData  = this.FY_MONTHS.map(m => byMonth.get(m)?.orderCount ?? 0);

    const hasData = revenueData.some(v => v > 0) || ordersData.some(v => v > 0);
    if (hasData) {
      this.initializeChart(revenueData, ordersData);
    }
  }

  onChartTypeChange(event: any) {
    this.haptic.selectionChanged();
    this.selectedChartType = event.detail.value;
    const series = this.chartOptions?.series as any[];
    const rev = series?.[0]?.data;
    const ord = series?.[1]?.data;
    this.initializeChart(rev, ord);
  }
}
