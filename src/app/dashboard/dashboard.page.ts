// dashboard.page.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Auth } from '../services/auth';
import { DistributorDashboardPage } from './distributor-dashboard.page';
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

  currentDate = new Date();

  statsCards: StatsCard[] = [
    {
      label: 'Total Revenue',
      value: '$45,231',
      change: '+12.5%',
      icon: 'trending-up',
      bgClass: 'bg-emerald-50',
      iconClass: 'text-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-600',
      borderClass: 'border border-emerald-100 hover:border-emerald-200'
    },
    {
      label: 'Active Users',
      value: '2,845',
      change: '+8.2%',
      icon: 'people-outline',
      bgClass: 'bg-blue-50',
      iconClass: 'text-blue-500',
      badgeClass: 'bg-blue-50 text-blue-600',
      borderClass: 'border border-blue-100 hover:border-blue-200'
    },
    {
      label: 'Total Orders',
      value: '1,248',
      change: '+23.1%',
      icon: 'cart-outline',
      bgClass: 'bg-purple-50',
      iconClass: 'text-purple-500',
      badgeClass: 'bg-purple-50 text-purple-600',
      borderClass: 'border border-purple-100 hover:border-purple-200'
    },
    {
      label: 'Conversion Rate',
      value: '3.24%',
      change: '+5.4%',
      icon: 'stats-chart-outline',
      bgClass: 'bg-amber-50',
      iconClass: 'text-amber-500',
      badgeClass: 'bg-amber-50 text-amber-600',
      borderClass: 'border border-amber-100 hover:border-amber-200'
    }
  ];

  public chartOptions: Partial<ChartOptions> | undefined;
  selectedChartType: 'line' | 'bar' = 'line';

  constructor(private auth: Auth) {}

  ngOnInit() {
    this.checkUserRole();
    this.initializeChart();
  }

  checkUserRole() {
    const roleType = this.auth.getRoleType();
    // Check for both uppercase and lowercase versions
    this.isDistributor = roleType?.toUpperCase() === 'DISTRIBUTOR' || roleType?.toUpperCase() === 'SALES';
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
    this.selectedChartType = event.detail.value;
    this.initializeChart();
  }
}