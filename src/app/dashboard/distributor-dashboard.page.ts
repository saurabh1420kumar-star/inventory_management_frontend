import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowUpOutline, arrowDownOutline, arrowBackOutline, businessOutline, statsChartOutline,
  trendingUpOutline, checkmarkDoneOutline, chevronUpOutline, chevronDownOutline,
  chevronForwardOutline, barChartOutline, checkmarkCircleOutline, receiptOutline, walletOutline,
  analyticsOutline, folderOutline, documentAttachOutline, personCircleOutline,
  listOutline, carOutline, timeOutline, documentOutline, documentTextOutline,
  cubeOutline, appsOutline, gridOutline, cartOutline, personOutline,
  funnelOutline, calendarOutline, cashOutline, cardOutline,
  shieldCheckmarkOutline, settingsOutline, helpCircleOutline,
  searchOutline, downloadOutline, callOutline
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

interface Transaction {
  date: string;
  amount: string;
  txnId: string;
  status: 'Cleared' | 'In Process' | 'Pending' | 'Failed';
  type: string;
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
  activeOperationView: string | null = null;
  fiscalYear = 'FY 2025 - 2026';
  Math = Math;

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

  // Payment Report Data
  totalCollections = '₹45,210.50';
  collectionGrowth = '+12.5%';
  dateRange = 'Oct 1 - Oct 31, 2024';
  paymentFilter = 'all';

  transactions: Transaction[] = [
    { date: 'Oct 28, 2024', amount: '₹12,500.00', txnId: 'TXN-20241028-001', status: 'Cleared', type: 'NEFT' },
    { date: 'Oct 25, 2024', amount: '₹8,750.00', txnId: 'TXN-20241025-003', status: 'Cleared', type: 'UPI' },
    { date: 'Oct 22, 2024', amount: '₹5,200.00', txnId: 'TXN-20241022-007', status: 'In Process', type: 'Cheque' },
    { date: 'Oct 18, 2024', amount: '₹9,460.50', txnId: 'TXN-20241018-002', status: 'Cleared', type: 'NEFT' },
    { date: 'Oct 15, 2024', amount: '₹6,300.00', txnId: 'TXN-20241015-005', status: 'In Process', type: 'UPI' },
    { date: 'Oct 10, 2024', amount: '₹3,000.00', txnId: 'TXN-20241010-009', status: 'Cleared', type: 'Cash' }
  ];

  // Account Services Data
  distributorName = 'Rajesh Kumar';
  distributorId = 'DIST-883492';

  // Orders Data
  pendingOrdersCount = 8;
  dispatchedCount = 23;
  deliveredCount = 45;

  constructor(private router: Router) {
    addIcons({
      'arrow-up-outline': arrowUpOutline,
      'arrow-down-outline': arrowDownOutline,
      'arrow-back-outline': arrowBackOutline,
      'business-outline': businessOutline,
      'stats-chart-outline': statsChartOutline,
      'trending-up-outline': trendingUpOutline,
      'checkmark-done-outline': checkmarkDoneOutline,
      'chevron-up-outline': chevronUpOutline,
      'chevron-down-outline': chevronDownOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'bar-chart-outline': barChartOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'receipt-outline': receiptOutline,
      'wallet-outline': walletOutline,
      'analytics-outline': analyticsOutline,
      'folder-outline': folderOutline,
      'document-attach-outline': documentAttachOutline,
      'person-circle-outline': personCircleOutline,
      'list-outline': listOutline,
      'car-outline': carOutline,
      'time-outline': timeOutline,
      'document-outline': documentOutline,
      'document-text-outline': documentTextOutline,
      'cube-outline': cubeOutline,
      'apps-outline': appsOutline,
      'grid-outline': gridOutline,
      'cart-outline': cartOutline,
      'person-outline': personOutline,
      'funnel-outline': funnelOutline,
      'calendar-outline': calendarOutline,
      'cash-outline': cashOutline,
      'card-outline': cardOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline,
      'settings-outline': settingsOutline,
      'help-circle-outline': helpCircleOutline,
      'search-outline': searchOutline,
      'download-outline': downloadOutline,
      'call-outline': callOutline
    });
  }

  ngOnInit() {
    this.initializeMetrics();
  }

  initializeMetrics() {
    this.dashboardMetrics = [
      { title: 'Volume MTD', value: '0.00', unit: 'MT', icon: 'trending-up-outline', change: 0, changeType: 'neutral', bgColor: 'bg-emerald-500' },
      { title: 'Volume YTD', value: '42.00', unit: 'MT', icon: 'statistics-outline', change: 12.5, changeType: 'positive', bgColor: 'bg-emerald-600' }
    ];
    this.operationsMetrics = [
      { title: 'Total Orders', value: '1.22', unit: 'L', icon: 'business-outline', change: 5.3, changeType: 'positive', bgColor: 'bg-blue-500' },
      { title: 'Call Rate', value: '6.45', unit: 'L', icon: 'checkmark-done-outline', change: -2.1, changeType: 'negative', bgColor: 'bg-blue-600' }
    ];
  }

  switchTab(tab: 'dashboard' | 'operations') {
    this.activeTab = tab;
    this.activeOperationView = null;
  }

  goToCatalog() {
    this.router.navigate(['/distributor-cart']);
  }

  toggleMenu(menu: string) {
    this.expandedMenu = this.expandedMenu === menu ? null : menu;
  }

  openOperationView(view: string) {
    this.activeOperationView = view;
  }

  goBackToOperations() {
    this.activeOperationView = null;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Cleared': return '#10b981';
      case 'In Process': return '#f59e0b';
      case 'Pending': return '#3b82f6';
      case 'Failed': return '#ef4444';
      default: return '#64748b';
    }
  }

  getStatusBg(status: string): string {
    switch (status) {
      case 'Cleared': return 'rgba(16,185,129,0.12)';
      case 'In Process': return 'rgba(245,158,11,0.12)';
      case 'Pending': return 'rgba(59,130,246,0.12)';
      case 'Failed': return 'rgba(239,68,68,0.12)';
      default: return 'rgba(100,116,139,0.12)';
    }
  }
}
