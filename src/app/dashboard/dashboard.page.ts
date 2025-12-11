import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexDataLabels,
  ApexTooltip,
  ApexFill,
  ApexGrid,
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  fill: ApexFill;
  grid: ApexGrid;
  colors: string[];
};

interface StatCard {
  label: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, NgApexchartsModule,FormsModule],
})
export class DashboardPage {
  public chartOptions: Partial<ChartOptions> = {};
  public selectedChartType: 'line' | 'bar' = 'line';

  currentUser = {
    name: 'John Doe',
    email: 'john.doe@nexus.com',
    role: 'Admin',
  };

  statsCards: StatCard[] = [
    {
      label: 'Total Revenue',
      value: '₹45,231',
      change: '+20.1% from last month',
      changeType: 'up',
      icon: 'cash-outline',
    },
    {
      label: 'Inventory Items',
      value: '1,234',
      change: '+15 new items',
      changeType: 'up',
      icon: 'cube-outline',
    },
    {
      label: 'Active Orders',
      value: '+573',
      change: '+201 since last hour',
      changeType: 'up',
      icon: 'pulse-outline',
    },
    {
      label: 'Growth',
      value: '+12.5%',
      change: '+4.5% from last quarter',
      changeType: 'up',
      icon: 'trending-up-outline',
    },
  ];

  constructor(private router: Router) {
    this.initializeChart();
  }

  initializeChart() {
    this.chartOptions = {
      series: [
        {
          name: 'Revenue',
          data: [4000, 3000, 2000, 2800, 2000, 2500],
        },
        {
          name: 'Expenses',
          data: [2500, 1500, 10000, 4000, 4800, 3800],
        },
      ],
      chart: {
        height: 320,
        type: this.selectedChartType,
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: ['#3b82f6', '#10b981'], // More vibrant blue and green
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 4, // Thicker lines
      },
      grid: {
        borderColor: '#e5e7eb',
        strokeDashArray: 4,
      },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        labels: {
          style: {
            colors: '#6b7280',
            fontSize: '12px',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#6b7280',
            fontSize: '12px',
          },
          formatter: (val: number) => `₹${val}`,
        },
      },
      tooltip: {
        y: {
          formatter: (val: number) => `₹${val}`,
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.5,
          gradientToColors: ['#60a5fa', '#34d399'], // Lighter gradient colors
          opacityFrom: 0.8,
          opacityTo: 0.2,
          stops: [0, 100],
        },
      },
    };
  }

  // Method to change chart type
  onChartTypeChange(event: any) {
    this.selectedChartType = event.detail.value;
    this.updateChartType();
  }

  updateChartType() {
    this.chartOptions = {
      ...this.chartOptions,
      chart: {
        ...this.chartOptions.chart,
        type: this.selectedChartType,
      },
      stroke: {
        ...this.chartOptions.stroke,
        // Bar charts don't need stroke width
        width: this.selectedChartType === 'bar' ? 4 : 0,
      },
    };
  }

  logout() {
    this.router.navigateByUrl('/login');
  }

  getStatusChipClass(status: string): string {
    switch (status) {
      case 'Delivered':
        return 'status-chip delivered';
      case 'In Transit':
        return 'status-chip transit';
      case 'Pending':
        return 'status-chip pending';
      default:
        return 'status-chip';
    }
  }
}
