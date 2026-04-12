// dashboard.page.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Auth } from '../services/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { DistributorDashboardPage } from './distributor-dashboard.page';
import { HapticService } from '../services/haptic.service';
import { DashboardService } from '../services/dashboard.service';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexDataLabels,
  ApexGrid,
  ApexFill,
  ApexTooltip
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
    DistributorDashboardPage
  ],
})
export class DashboardPage implements OnInit {
  
  currentUser = {
    name: 'John Doe'
  };

  isDistributor = false;
  isReady = false;

  currentDate = new Date();

  statsCards: StatsCard[] = [
    {
      label: 'Total Revenue',
      value: '₹0',
      change: '+0%',
      icon: 'trending-up',
      bgClass: 'bg-emerald-50',
      iconClass: 'text-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-600',
      borderClass: 'border border-emerald-100 hover:border-emerald-200'
    },
    {
      label: 'Active Users',
      value: '0',
      change: '+0%',
      icon: 'people-outline',
      bgClass: 'bg-blue-50',
      iconClass: 'text-blue-500',
      badgeClass: 'bg-blue-50 text-blue-600',
      borderClass: 'border border-blue-100 hover:border-blue-200'
    },
    {
      label: 'Total Orders',
      value: '0',
      change: '+0%',
      icon: 'cart-outline',
      bgClass: 'bg-purple-50',
      iconClass: 'text-purple-500',
      badgeClass: 'bg-purple-50 text-purple-600',
      borderClass: 'border border-purple-100 hover:border-purple-200'
    },
    {
      label: 'Conversion Rate',
      value: '0%',
      change: '+0%',
      icon: 'stats-chart-outline',
      bgClass: 'bg-amber-50',
      iconClass: 'text-amber-500',
      badgeClass: 'bg-amber-50 text-amber-600',
      borderClass: 'border border-amber-100 hover:border-amber-200'
    }
  ];

  public chartOptions: Partial<ChartOptions> | undefined;
  selectedChartType: 'line' | 'bar' = 'line';

  private haptic = inject(HapticService);

  constructor(
    private auth: Auth, 
    private router: Router, 
    private route: ActivatedRoute,
    private dashboardService: DashboardService
  ) {}

  ngOnInit() {
    this.checkUserRole();
    this.initializeChart();
    this.loadDashboardAnalytics();
  }

  /**
   * Load dashboard analytics from API
   * Maps API response data to stats cards
   */
  loadDashboardAnalytics() {
    console.log('📊 Loading dashboard analytics...');
    this.dashboardService.getAnalytics().subscribe({
      next: (analytics: any) => {
        console.log('✅ Analytics data received:', analytics);
        
        if (analytics && Object.keys(analytics).length > 0) {
          // Extract Month-To-Date metrics
          const mtd = analytics.monthToDate || {};
          const ytd = analytics.yearToDate || {};
          const wtd = analytics.weekToDate || {};
          
          // Calculate totals and metrics
          const totalSales = mtd.totalSales || 0;
          const transactionCount = mtd.transactionCount || 0;
          const avgOrderValue = mtd.averageOrderValue || 0;
          
          // Get sales by category (sum all categories)
          const salesByCategory = analytics.salesByCategory || {};
          const totalCategoryRevenue = Object.values(salesByCategory).reduce((sum: any, val: any) => sum + val, 0);
          
          // Get sales by region (sum all regions)
          const salesByRegion = analytics.salesByRegion || {};
          const topRegion = Object.entries(salesByRegion).reduce((max: any, [region, amount]: any) => 
            amount > (max.amount || 0) ? { region, amount } : max, {});
          
          // Calculate growth metrics
          const wtdSales = wtd.totalSales || 0;
          const ytdSales = ytd.totalSales || 0;
          const mtdGrowth = wtdSales > 0 ? ((totalSales - wtdSales) / wtdSales * 100).toFixed(1) : 0;
          
          // Update stats cards with API data
          this.statsCards[0].value = `₹${(totalSales / 100000).toFixed(2)}L`;
          this.statsCards[0].change = `+${mtdGrowth}%`;
          
          this.statsCards[1].value = `${transactionCount}`;
          this.statsCards[1].change = `+${transactionCount > 0 ? '100' : '0'}%`;
          
          this.statsCards[2].value = `₹${(avgOrderValue / 1000).toFixed(1)}K`;
          this.statsCards[2].change = `+${((avgOrderValue / totalSales * 100) || 0).toFixed(1)}%`;
          
          this.statsCards[3].value = Object.keys(salesByCategory).length.toString();
          this.statsCards[3].change = `+${topRegion.region ? '100' : '0'}%`;
          
          console.log('📈 Stats Updated:', {
            totalSales: `₹${(totalSales / 100000).toFixed(2)}L`,
            transactions: transactionCount,
            avgOrder: `₹${(avgOrderValue / 1000).toFixed(1)}K`,
            categories: Object.keys(salesByCategory).length,
            topRegion: topRegion.region
          });
        }
      },
      error: (err) => {
        console.error('❌ Failed to load dashboard analytics:', err);
      }
    });
  }

  checkUserRole() {
    const roleType = this.auth.getRoleType()?.toUpperCase() || '';
    const isSalesRole = roleType.includes('SALES') || roleType === 'SALESPERSON' || roleType === 'NSM' || roleType === 'RSM' || roleType === 'TSM' || roleType === 'ASM';
    if (isSalesRole) {
      const fromSales = this.route.snapshot.queryParams['fromSales'];
      if (fromSales) {
        // Salesperson navigated here for dealer features — show distributor dashboard
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

  initializeChart() {
    this.chartOptions = {
      series: [
        {
          name: 'Revenue',
          data: [31000, 40000, 28000, 51000, 42000, 109000, 100000, 85000, 95000, 88000, 92000, 105000]
        },
        {
          name: 'Expenses',
          data: [11000, 32000, 45000, 32000, 34000, 52000, 41000, 55000, 48000, 52000, 58000, 62000]
        }
      ],
      chart: {
        height: 350,
        type: this.selectedChartType,
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        },
        fontFamily: 'inherit'
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      colors: ['#10b981', '#3b82f6'],
      dataLabels: {
        enabled: false
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 5,
        padding: {
          top: 0,
          right: 10,
          bottom: 0,
          left: 10
        }
      },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        labels: {
          style: {
            colors: '#64748b',
            fontSize: '12px',
            fontWeight: 500
          }
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#64748b',
            fontSize: '12px',
            fontWeight: 500
          },
          formatter: (value) => {
            return '$' + (value / 1000) + 'k';
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.3,
          gradientToColors: ['#34d399', '#60a5fa'],
          opacityFrom: 0.7,
          opacityTo: 0.2,
          stops: [0, 100]
        }
      },
      tooltip: {
        y: {
          formatter: (value) => {
            return '$' + value.toLocaleString();
          }
        },
        theme: 'light',
        style: {
          fontSize: '12px',
          fontFamily: 'inherit'
        }
      }
    };
  }

  onChartTypeChange(event: any) {
    this.haptic.selectionChanged();
    this.selectedChartType = event.detail.value;
    this.initializeChart();
  }
}