import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowUpOutline, arrowDownOutline, arrowBackOutline, businessOutline, statsChartOutline,
  trendingUpOutline, checkmarkDoneOutline, chevronUpOutline, chevronDownOutline,
  chevronForwardOutline, barChartOutline, checkmarkCircleOutline, receiptOutline, walletOutline,
  analyticsOutline, folderOutline, documentAttachOutline, personCircleOutline,
  listOutline, carOutline, timeOutline, documentOutline, documentTextOutline,
  cubeOutline, appsOutline, gridOutline, cartOutline, personOutline,
  funnelOutline, calendarOutline, cashOutline, cardOutline,
  shieldCheckmarkOutline, settingsOutline, helpCircleOutline,
  searchOutline, downloadOutline, callOutline,
  closeOutline, refreshOutline, createOutline, informationCircleOutline,
  chatbubbleEllipsesOutline, cloudUploadOutline, imageOutline, phonePortraitOutline
} from 'ionicons/icons';
import { DistributorService, DistributorOrder } from '../services/distributor.service';
import { Auth } from '../services/auth';
import { LedgerService } from '../services/accountsLedger.service';
import { HapticService } from '../services/haptic.service';
import { environment } from '../../environments/environment';

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
  imports: [CommonModule, FormsModule, IonicModule]
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
  distributorId: number | null = null;

  showAddPaymentModal = false;
  isSubmittingPayment = false;
  receiptFile: File | null = null;
  receiptFileName = '';
  paymentForm = {
    date: new Date().toISOString().split('T')[0],
    balanceType: 'credit' as 'credit' | 'debit',
    reference: '',
    amount: '',
    description: '',
    paymentMethod: '' as '' | 'rtgs' | 'neft' | 'cheque' | 'imps' | 'upi',
    utrNumber: '',
    bankName: '',
    chequeNumber: '',
    transactionNumber: '',
    notes: ''
  };
  paymentMethods = [
    { value: 'rtgs', label: 'RTGS', icon: 'business-outline' },
    { value: 'neft', label: 'NEFT', icon: 'document-outline' },
    { value: 'cheque', label: 'Cheque', icon: 'document-text-outline' },
    { value: 'imps', label: 'IMPS', icon: 'phone-portrait-outline' },
    { value: 'upi', label: 'UPI', icon: 'wallet-outline' },
  ];

  // Orders Data
  orders: DistributorOrder[] = [];
  expandedOrderId: number | null = null;
  isLoadingOrders = false;
  pendingOrdersCount = 8;
  dispatchedCount = 23;
  deliveredCount = 45;

  // Analytics
  selectedPeriod: 'today' | 'month' | 'year' = 'month';
  isLoadingAnalytics = false;
  distributorAnalytics: { totalOrders: number; totalAmount: number } | null = null;

  // Payment Collections
  paymentCollections: any[] = [];
  isLoadingPaymentCollections = false;
  totalCollectionAmount = 0;

  private haptic = inject(HapticService);

  constructor(
    private router: Router,
    private distributorService: DistributorService,
    private auth: Auth,
    private ledgerService: LedgerService,
    private toastController: ToastController,
    private http: HttpClient
  ) {
    addIcons({
      'add-outline': addOutline,
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
      'call-outline': callOutline,
      'close-outline': closeOutline,
      'refresh-outline': refreshOutline,
      'create-outline': createOutline,
      'information-circle-outline': informationCircleOutline,
      'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'image-outline': imageOutline,
      'phone-portrait-outline': phonePortraitOutline
    });
  }

  ngOnInit() {
    this.initializeMetrics();
    this.getDistributorId();
    this.loadOrders();
    this.loadDistributorAnalytics();
  }

  getDistributorId() {
    this.distributorId = this.auth.getUserId();
    console.log('Dashboard - Distributor ID:', this.distributorId);
  }

  loadOrders() {
    if (!this.distributorId) {
      console.warn('Distributor ID not available for loading orders');
      return;
    }

    this.isLoadingOrders = true;
    this.distributorService.getDistributorOrders(this.distributorId).subscribe({
      next: (response) => {
        this.orders = response.data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.isLoadingOrders = false;
        console.log('Orders loaded:', this.orders.length);
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.isLoadingOrders = false;
      }
    });
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
    this.haptic.selectionChanged();
    this.activeTab = tab;
    this.activeOperationView = null;
    if (tab === 'dashboard') {
      this.loadPaymentCollections();
    }
  }

  goToCatalog() {
    this.haptic.medium();
    this.router.navigate(['/distributor-cart']);
  }

  toggleMenu(menu: string) {
    this.haptic.light();
    this.expandedMenu = this.expandedMenu === menu ? null : menu;
  }

  openOperationView(view: string) {
    this.haptic.medium();
    this.activeOperationView = view;
    if (view === 'account-services') {
      this.loadPaymentCollections();
    } else if (view === 'collections') {
      this.loadPaymentCollections();
    }
  }

  openAddPaymentModal() {
    this.haptic.medium();
    this.generatePaymentReference();
    this.showAddPaymentModal = true;
  }

  closeAddPaymentModal() {
    this.haptic.light();
    this.showAddPaymentModal = false;
    this.resetPaymentForm();
  }

  generatePaymentReference() {
    const prefix = this.paymentForm.balanceType === 'credit' ? 'CR' : 'DR';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.paymentForm.reference = `${prefix}-${randomNum}`;
  }

  onPaymentReceiptSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.receiptFile = input.files[0];
      this.receiptFileName = input.files[0].name;
    }
  }

  removePaymentReceipt() {
    this.receiptFile = null;
    this.receiptFileName = '';
  }

  submitPayment() {
    this.haptic.heavy();
    if (!this.distributorId) {
      this.showToast('Distributor account not found', 'danger');
      return;
    }

    const { date, balanceType, reference, amount, description, paymentMethod, utrNumber, bankName, chequeNumber, transactionNumber } = this.paymentForm;

    if (!date || !reference || !amount || !description) {
      this.showToast('Please fill all required fields', 'danger');
      return;
    }

    if ((paymentMethod === 'rtgs' || paymentMethod === 'neft') && !utrNumber) {
      this.showToast('Please enter UTR Number', 'danger');
      return;
    }

    if (paymentMethod === 'cheque' && (!bankName || !chequeNumber)) {
      this.showToast('Please enter Bank Name and Cheque Number', 'danger');
      return;
    }

    if ((paymentMethod === 'imps' || paymentMethod === 'upi') && !transactionNumber) {
      this.showToast('Please enter Transaction Number', 'danger');
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      this.showToast('Please enter a valid amount', 'danger');
      return;
    }

    this.isSubmittingPayment = true;
    this.ledgerService.updateBalanceDirect(
      this.distributorId,
      parsedAmount,
      description,
      balanceType.toUpperCase()
    ).subscribe({
      next: (response) => {
        this.transactions.unshift({
          date: new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          amount: this.formatAmount(parsedAmount),
          txnId: reference,
          status: 'In Process',
          type: paymentMethod ? paymentMethod.toUpperCase() : balanceType.toUpperCase()
        });

        const msg = response?.message || 'Payment added for approval';
        this.showToast(msg, 'success');
        this.isSubmittingPayment = false;
        this.closeAddPaymentModal();
        this.paymentFilter = 'all';
      },
      error: (error) => {
        console.error('Error adding payment:', error);
        this.isSubmittingPayment = false;
        this.showToast(error?.error?.message || 'Failed to add payment', 'danger');
      }
    });
  }

  resetPaymentForm() {
    this.paymentForm = {
      date: new Date().toISOString().split('T')[0],
      balanceType: 'credit',
      reference: '',
      amount: '',
      description: '',
      paymentMethod: '',
      utrNumber: '',
      bankName: '',
      chequeNumber: '',
      transactionNumber: '',
      notes: ''
    };
    this.removePaymentReceipt();
  }

  goBackToOperations() {
    this.haptic.light();
    this.activeOperationView = null;
  }

  loadDistributorAnalytics() {
    if (!this.distributorId) return;
    this.isLoadingAnalytics = true;
    const url = `${environment.apiUrl}/dashboard/distributor-orders?period=${this.selectedPeriod}&distributorId=${this.distributorId}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.distributorAnalytics = res?.data ?? res ?? null;
        this.isLoadingAnalytics = false;
      },
      error: () => { this.isLoadingAnalytics = false; }
    });
  }

  onAnalyticsPeriodChange() {
    this.loadDistributorAnalytics();
  }

  loadPaymentCollections() {
    if (!this.distributorId) {
      console.warn('Distributor ID not available for loading payment collections');
      return;
    }

    console.log('💳 Fetching payment collections for distributorId:', this.distributorId);
    this.isLoadingPaymentCollections = true;

    this.ledgerService.getPaymentsByDistributorAndStatus(this.distributorId, 'LEDGER_UPDATED').subscribe({
      next: (response: any) => {
        console.log('✅ Payment Collections Fetched:', response);
        this.paymentCollections = Array.isArray(response) ? response : response?.data || [];
        this.totalCollectionAmount = this.paymentCollections.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        this.isLoadingPaymentCollections = false;
      },
      error: (error) => {
        console.error('❌ Error Fetching Payment Collections:', error);
        this.isLoadingPaymentCollections = false;
      }
    });
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

  toggleOrderDetails(orderId: number) {
    this.haptic.light();
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }

  getStatusColorClass(status: string): string {
    switch(status) {
      case 'APPROVED':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'PAYMENT_APPROVED':
        return 'text-teal-400 bg-teal-400/10 border-teal-400/30';
      case 'DISMISSED':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  }
}
