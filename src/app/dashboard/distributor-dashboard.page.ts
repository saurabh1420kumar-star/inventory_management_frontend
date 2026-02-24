import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowUpOutline,
  arrowDownOutline,
  businessOutline,
  statsChartOutline,
  trendingUpOutline,
  checkmarkDoneOutline,
  chevronUpOutline,
  chevronDownOutline
} from 'ionicons/icons';

interface MetricCard {
  title: string;
  value: string;
  unit: string;
  icon: string;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  bgColor: string;
}

interface PeriodMetrics {
  volMTD: string;
  volYTD: string;
  valueMTD: string;
  valueYTD: string;
  totalOrders: string;
  callMTD: string;
  callYTD: string;
}

@Component({
  selector: 'app-distributor-dashboard',
  templateUrl: './distributor-dashboard.page.html',
  styleUrls: ['./distributor-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class DistributorDashboardPage implements OnInit {
  activeTab: 'dashboard' | 'operations' = 'dashboard';
  expandedMenu: string | null = null;
  fiscalYear = 'FY 2025 - 2026';
  Math = Math; // Expose Math to template

  dashboardMetrics: MetricCard[] = [];
  operationsMetrics: MetricCard[] = [];

  periodData: PeriodMetrics = {
    volMTD: '0.00 MT',
    volYTD: '42.00 MT',
    valueMTD: 'Rs 0.00 L',
    valueYTD: 'Rs 8.02 L',
    totalOrders: '152',
    callMTD: '12',
    callYTD: '145'
  };

  constructor() {
    addIcons({
      'arrow-up-outline': arrowUpOutline,
      'arrow-down-outline': arrowDownOutline,
      'business-outline': businessOutline,
      'stats-chart-outline': statsChartOutline,
      'trending-up-outline': trendingUpOutline,
      'checkmark-done-outline': checkmarkDoneOutline,
      'chevron-up-outline': chevronUpOutline,
      'chevron-down-outline': chevronDownOutline
    });
  }

  ngOnInit() {
    this.initializeMetrics();
  }

  initializeMetrics() {
    this.dashboardMetrics = [
      {
        title: 'Volume MTD',
        value: '0.00',
        unit: 'MT',
        icon: 'trending-up-outline',
        change: 0,
        changeType: 'neutral',
        bgColor: 'bg-emerald-500'
      },
      {
        title: 'Volume YTD',
        value: '42.00',
        unit: 'MT',
        icon: 'statistics-outline',
        change: 12.5,
        changeType: 'positive',
        bgColor: 'bg-emerald-600'
      }
    ];

    this.operationsMetrics = [
      {
        title: 'Total Orders',
        value: '1.22',
        unit: 'L',
        icon: 'business-outline',
        change: 5.3,
        changeType: 'positive',
        bgColor: 'bg-blue-500'
      },
      {
        title: 'Call Rate',
        value: '6.45',
        unit: 'L',
        icon: 'checkmark-done-outline',
        change: -2.1,
        changeType: 'negative',
        bgColor: 'bg-blue-600'
      }
    ];
  }

  switchTab(tab: 'dashboard' | 'operations') {
    this.activeTab = tab;
  }

  toggleMenu(menu: string) {
    this.expandedMenu = this.expandedMenu === menu ? null : menu;
  }
}
