import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  chatbubbleEllipsesOutline, cloudUploadOutline, imageOutline, phonePortraitOutline,
  storefrontOutline, peopleOutline, bagOutline, personAddOutline, pricetagOutline,
  bookOutline, swapVerticalOutline, trendingDownOutline,
  folderOpenOutline, locationOutline,
  mailOutline, chevronBackOutline,
  homeOutline
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

interface Sale {
  id: number;
  itemName: string;
  quantity: number;
  amount: number;
  date: string;
}

interface Dealer {
  id: number;
  fullName: string;
  phone: string;
  address: string;
  sales: Sale[];
}

interface PriceMasterProduct {
  id: number;
  productName: string;
  quantity: number;
  price: number;
}

interface DealerLedgerTxn {
  id: string;
  date: string;
  description: string;
  reference: string;
  type: 'credit' | 'debit' | 'jv';
  debit: number;
  credit: number;
  balance: number;
  category: string;
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

  get currentFYLabel(): string {
    const now = new Date();
    const month = now.getMonth(); // 0-based
    const year = now.getFullYear();
    const startYear = month >= 3 ? year : year - 1;
    return `FY ${startYear} - ${startYear + 1}`;
  }

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
  distributorUsername: string | null = null;
  distributorRole: string | null = null;
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

  // Dealer Management
  dealers: Dealer[] = [];
  showAddDealerModal = false;
  dealerForm = { fullName: '', phone: '', address: '' };
  expandedDealerId: number | null = null;
  inlineSaleForm: { [dealerId: number]: { product: string; amount: string } } = {};
  isLoadingDealers = false;

  // Dealer Orders
  allDealerOrders: any[] = [];
  isLoadingDealerOrders = false;
  dealerOrdersSearch = '';

  // Price Master
  selectedPriceMasterDealer: Dealer | null = null;
  dealerProducts: { [dealerId: number]: PriceMasterProduct[] } = {};
  priceMasterRows: { productName: string; quantity: number | null; price: number | null }[] = [{ productName: '', quantity: null, price: null }];
  finishedProductsList: { id: number; name: string }[] = [];
  isLoadingFinishedProducts = false;

  // Dealer Ledger
  selectedLedgerDealer: Dealer | null = null;
  isDealerLedgerSelectorOpen = false;
  dealerLedgerSearch = '';
  dealerLedgerTxnSearch = '';
  dealerLedgerStartDate = '';
  dealerLedgerEndDate = '';
  dealerLedgerSortField: 'date' | 'debit' | 'credit' | 'balance' = 'date';
  dealerLedgerSortDir: 'asc' | 'desc' = 'desc';
  dealerLedgerCurrentPage = 1;
  dealerLedgerRowsPerPage = 10;
  dealerLedgerRowsOptions = [5, 10, 25, 50];
  isDealerLedgerDateOpen = false;
  isLoadingLedger = false;
  dealerLedgerTxnsData: DealerLedgerTxn[] = [];
  dealerLedgerTotalRecords = 0;
  dealerLedgerSummaryData = { totalDebits: 0, totalCredits: 0, netBalance: 0, closingBalance: 0, transactionCount: 0 };
  isLedgerEntryOpen = false;
  isSubmittingLedgerEntry = false;
  ledgerEntryForm = { description: '', type: 'CREDIT', amount: null as number | null, category: 'Payment', date: new Date().toISOString().split('T')[0] };
  ledgerEntryCategories = ['Payment', 'Purchase', 'Journal', 'Return', 'Adjustment'];
  ledgerEntryTypes = ['CREDIT', 'DEBIT', 'JV'];

  private haptic = inject(HapticService);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
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
      'phone-portrait-outline': phonePortraitOutline,
      'storefront-outline': storefrontOutline,
      'people-outline': peopleOutline,
      'bag-outline': bagOutline,
      'person-add-outline': personAddOutline,
      'pricetag-outline': pricetagOutline,
      'book-outline': bookOutline,
      'swap-vertical-outline': swapVerticalOutline,
      'trending-down-outline': trendingDownOutline,
      'folder-open-outline': folderOpenOutline,
      'location-outline': locationOutline,
      'mail-outline': mailOutline,
      'chevron-back-outline': chevronBackOutline,
      'home-outline': homeOutline
    });
  }

  ngOnInit() {
    this.initializeMetrics();
    this.getDistributorId();
    this.loadOrders();
    this.loadDealers();
    this.loadDistributorAnalytics();
    const view = this.route.snapshot.queryParams['view'];
    if (view) {
      setTimeout(() => {
        if (view === 'add-dealer') {
          this.openAddDealerModal();
        } else {
          this.openOperationView(view);
        }
      }, 600);
    }
  }

  getDistributorId() {
    this.distributorId = this.auth.getUserId();
    this.distributorUsername = this.auth.getUsername();
    this.distributorRole = this.auth.getRoleType();
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
        // Show all orders EXCEPT ACTIVE
        // ACTIVE orders are already being processed, so hide them
        const visibleOrders = (response.data || []).filter((order: any) => {
          const status = order.status?.toUpperCase();
          return status !== 'ACTIVE';
        });

        this.orders = visibleOrders.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.isLoadingOrders = false;
        console.log('📋 Orders loaded (excluding ACTIVE):', this.orders.length, '(filtered from', response.data?.length, 'total)');
        
        // Log order statuses for debugging
        this.orders.forEach(o => {
          console.log('   - Order ID:', o.id, 'Status:', o.status, 'Created:', o.createdAt);
        });
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

  goToOrderTracking() {
    this.haptic.medium();
    this.router.navigate(['/order-details']);
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
    } else if (view === 'dealer-orders') {
      this.loadDealerOrders();
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

  // ─── Dealer Management ───────────────────────────────────────────

  loadDealers() {
    if (!this.distributorId) return;
    this.isLoadingDealers = true;
    this.http.get<any>(`${environment.dealersUrl}/distributor/${this.distributorId}`).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res) ? res : (res?.dealers ?? res?.data ?? []);
        this.dealers = list.map((d: any) => ({
          id: d.id,
          fullName: d.fullName ?? d.full_name ?? d.name ?? '',
          phone: d.phone ?? '',
          address: d.address ?? '',
          sales: []
        }));
        this.dealers.forEach(d => {
          if (!this.inlineSaleForm[d.id]) {
            this.inlineSaleForm[d.id] = { product: '', amount: '' };
          }
        });
        this.isLoadingDealers = false;
        this.loadAllDealerSales();
      },
      error: (err) => {
        console.error('Error loading dealers:', err);
        this.isLoadingDealers = false;
      }
    });
  }

  loadAllDealerSales() {
    if (!this.distributorId) return;
    this.http.get<any>(`${environment.apiUrl}/dealer-sales/distributor/${this.distributorId}`).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res) ? res : (res?.sales ?? res?.data ?? []);
        // Group sales by dealerId and assign to respective dealers
        const salesMap: { [dealerId: number]: Sale[] } = {};
        list.forEach((s: any) => {
          const dId = s.dealerId ?? s.dealer_id;
          if (!dId) return;
          if (!salesMap[dId]) salesMap[dId] = [];
          salesMap[dId].push({
            id: s.id ?? s.saleId ?? Date.now(),
            itemName: s.itemName ?? s.item_name ?? s.productName ?? '',
            quantity: s.quantity ?? 1,
            amount: s.amount ?? 0,
            date: s.date ?? ''
          });
        });
        this.allDealerOrders = list;
        this.dealers.forEach(d => { d.sales = salesMap[d.id] ?? []; });
      },
      error: (err) => console.error('Error loading dealer sales:', err)
    });
  }

  loadDealerOrders() {
    if (!this.distributorId) return;
    this.isLoadingDealerOrders = true;
    this.http.get<any>(`${environment.apiUrl}/dealer-sales/distributor/${this.distributorId}`).subscribe({
      next: (res) => {
        this.allDealerOrders = Array.isArray(res) ? res : (res?.sales ?? res?.data ?? []);
        this.isLoadingDealerOrders = false;
      },
      error: () => { this.isLoadingDealerOrders = false; }
    });
  }

  get filteredDealerOrders(): any[] {
    const q = this.dealerOrdersSearch.toLowerCase().trim();
    if (!q) return this.allDealerOrders;
    return this.allDealerOrders.filter(o =>
      (o.itemName ?? '').toLowerCase().includes(q) ||
      String(o.dealerId ?? o.dealer_id ?? '').includes(q) ||
      (this.getDealerName(o.dealerId ?? o.dealer_id ?? 0)).toLowerCase().includes(q)
    );
  }

  getDealerName(dealerId: number): string {
    return this.dealers.find(d => d.id === dealerId)?.fullName ?? `Dealer #${dealerId}`;
  }

  getTotalDealerOrdersAmount(): number {
    return this.filteredDealerOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
  }

  openAddDealerModal() {
    this.haptic.medium();
    this.showAddDealerModal = true;
  }

  closeAddDealerModal() {
    this.haptic.light();
    this.showAddDealerModal = false;
    this.dealerForm = { fullName: '', phone: '', address: '' };
  }

  submitDealer() {
    this.haptic.heavy();
    const { fullName, phone, address } = this.dealerForm;
    if (!fullName.trim()) { this.showToast('Please enter dealer full name', 'danger'); return; }
    if (!phone.trim()) { this.showToast('Please enter phone number', 'danger'); return; }
    
    // Validate phone number: must be exactly 10 digits
    const phoneDigits = phone.trim().replace(/\D/g, '');
    if (phoneDigits.length !== 10) { 
      this.showToast('Phone must be a valid 10-digit Indian mobile number', 'danger'); 
      return; 
    }
    
    if (!address.trim()) { this.showToast('Please enter address', 'danger'); return; }
    
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    
    this.http.post<{ dealer?: any; data?: any; [key: string]: any }>(
      `${environment.dealersUrl}`,
      {
        fullName: fullName.trim(),
        phone: phoneDigits,
        address: address.trim(),
        openingBalance: 0
      },
      { 
        params: { distributorId: String(this.distributorId) },
        headers: headers 
      }
    ).subscribe({
      next: (res) => {
        const d = res?.['dealer'] ?? res?.['data'] ?? res;
        const newDealer: Dealer = {
          id: d?.id ?? Date.now(),
          fullName: d?.fullName ?? d?.full_name ?? fullName.trim(),
          phone: d?.phone ?? phone.trim(),
          address: d?.address ?? address.trim(),
          sales: []
        };
        this.dealers.unshift(newDealer);
        this.inlineSaleForm[newDealer.id] = { product: '', amount: '' };
        this.showToast('Dealer is created', 'success');
        this.closeAddDealerModal();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Failed to add dealer. Please try again.';
        this.showToast(msg, 'danger');
        console.error('Error adding dealer:', err);
      }
    });
  }

  toggleDealerAccordion(dealerId: number) {
    this.haptic.light();
    if (this.expandedDealerId === dealerId) {
      this.expandedDealerId = null;
    } else {
      this.expandedDealerId = dealerId;
      if (!this.inlineSaleForm[dealerId]) {
        this.inlineSaleForm[dealerId] = { product: '', amount: '' };
      }
    }
  }

  addInlineSale(dealer: Dealer) {
    this.haptic.heavy();
    const form = this.inlineSaleForm[dealer.id];
    if (!form) return;
    if (!form.product.trim()) { this.showToast('Please enter product name', 'danger'); return; }
    if (!form.amount || Number(form.amount) <= 0) { this.showToast('Please enter a valid amount', 'danger'); return; }
    const payload = {
      dealerId: dealer.id,
      itemName: form.product.trim(),
      quantity: 1,
      amount: Number(form.amount),
      date: new Date().toISOString().split('T')[0]
    };
    this.http.post<any>(`${environment.apiUrl}/dealer-sales`, payload, { params: { distributorId: String(this.distributorId ?? this.auth.getUserId()) } }).subscribe({
      next: (res) => {
        const saved = res?.data ?? res;
        const newSale: Sale = {
          id: saved?.id ?? Date.now(),
          itemName: payload.itemName,
          quantity: 1,
          amount: payload.amount,
          date: payload.date
        };
        dealer.sales.unshift(newSale);
        this.inlineSaleForm[dealer.id] = { product: '', amount: '' };
        this.showToast('Sale added', 'success');
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Failed to add sale. Please try again.';
        this.showToast(msg, 'danger');
        console.error('Error adding sale:', err);
      }
    });
  }

  dealerTotalSales(dealer: Dealer): number {
    return dealer.sales.reduce((sum, s) => sum + s.amount, 0);
  }

  selectPriceMasterDealer(dealer: Dealer) {
    this.haptic.light();
    this.selectedPriceMasterDealer = dealer;
    if (!this.dealerProducts[dealer.id]) {
      this.dealerProducts[dealer.id] = [];
    }
    this.priceMasterRows = [{ productName: '', quantity: null, price: null }];
    this.loadFinishedProducts();
  }

  loadFinishedProducts() {
    if (this.finishedProductsList.length > 0) return;
    this.isLoadingFinishedProducts = true;
    this.http.get<any[]>(`${environment.productsUrl}/finished-products`).subscribe({
      next: (products) => {
        this.finishedProductsList = (products || []).map(p => ({ id: p.id, name: p.name }));
        this.isLoadingFinishedProducts = false;
      },
      error: () => { this.isLoadingFinishedProducts = false; }
    });
  }

  backToPriceMasterList() {
    this.haptic.light();
    this.selectedPriceMasterDealer = null;
    this.priceMasterRows = [{ productName: '', quantity: null, price: null }];
  }

  addPriceMasterRow() {
    this.priceMasterRows.push({ productName: '', quantity: null, price: null });
  }

  removePriceMasterRow(index: number) {
    if (this.priceMasterRows.length === 1) {
      this.priceMasterRows = [{ productName: '', quantity: null, price: null }];
    } else {
      this.priceMasterRows.splice(index, 1);
    }
  }

  saveAllPriceMasterProducts() {
    if (!this.selectedPriceMasterDealer) return;
    const validRows = this.priceMasterRows.filter(r => r.productName?.trim() && r.quantity && r.price);
    if (validRows.length === 0) { this.showToast('Please fill at least one product row', 'danger'); return; }
    const dealerId = this.selectedPriceMasterDealer.id;
    const today = new Date().toISOString().split('T')[0];
    const requests = validRows.map(r =>
      this.http.post<any>(`${environment.apiUrl}/dealer-sales`, {
        dealerId,
        itemName: r.productName.trim(),
        quantity: r.quantity,
        amount: r.price,
        date: today
      }, { params: { distributorId: String(this.distributorId ?? this.auth.getUserId()) } })
    );
    Promise.all(requests.map(req => req.toPromise().catch(e => e))).then(results => {
      const failed = results.filter(r => r instanceof Error || r?.status >= 400).length;
      const saved = validRows.length - failed;
      if (saved > 0) {
        const newProducts: PriceMasterProduct[] = validRows.slice(0, saved).map(r => ({
          id: Date.now() + Math.random(),
          productName: r.productName.trim(),
          quantity: r.quantity!,
          price: r.price!
        }));
        this.dealerProducts[dealerId] = [...newProducts, ...(this.dealerProducts[dealerId] ?? [])];
        this.priceMasterRows = [{ productName: '', quantity: null, price: null }];
        this.showToast(`${saved} product${saved > 1 ? 's' : ''} saved`, 'success');
      }
      if (failed > 0) this.showToast(`${failed} product${failed > 1 ? 's' : ''} failed to save`, 'danger');
    });
  }

  removePriceMasterProduct(dealerId: number, productId: number) {
    this.dealerProducts[dealerId] = (this.dealerProducts[dealerId] ?? []).filter(p => p.id !== productId);
  }

  // ── Dealer Ledger ───────────────────────────────────────────────
  get filteredLedgerDealers(): Dealer[] {
    const q = this.dealerLedgerSearch.toLowerCase();
    return q ? this.dealers.filter(d => d.fullName.toLowerCase().includes(q)) : this.dealers;
  }

  selectLedgerDealer(dealer: Dealer) {
    this.haptic.light();
    this.selectedLedgerDealer = dealer;
    this.isDealerLedgerSelectorOpen = false;
    this.dealerLedgerCurrentPage = 1;
    this.dealerLedgerTxnSearch = '';
    this.dealerLedgerStartDate = '';
    this.dealerLedgerEndDate = '';
    this.dealerLedgerTxnsData = [];
    this.dealerLedgerSummaryData = { totalDebits: 0, totalCredits: 0, netBalance: 0, closingBalance: 0, transactionCount: 0 };
    this.loadDealerLedger();
    this.loadDealerLedgerSummary();
  }

  loadDealerLedger() {
    if (!this.selectedLedgerDealer) return;
    const page = this.dealerLedgerCurrentPage - 1; // API is 0-indexed
    const size = this.dealerLedgerRowsPerPage;
    console.log('loadDealerLedger — dealerId:', this.selectedLedgerDealer.id, 'type:', typeof this.selectedLedgerDealer.id);
    this.isLoadingLedger = true;
    this.http.get<any>(`${environment.dealerLedgerUrl}/by-distributor`, {
      params: { dealerId: String(this.selectedLedgerDealer.id), page: String(page), size: String(size), distributorId: String(this.distributorId ?? this.auth.getUserId()) }
    }).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res) ? res : (res?.content ?? res?.data ?? res?.transactions ?? []);
        this.dealerLedgerTxnsData = list.map((t: any) => {
          const rawType: string = (t.type ?? '').toUpperCase();
          const isCredit = rawType === 'CREDIT';
          const isDebit = rawType === 'DEBIT';
          return {
            id: String(t.id ?? t.transactionId ?? ''),
            date: t.date ?? '',
            description: t.description ?? '',
            reference: t.reference ?? '',
            type: isCredit ? 'credit' : isDebit ? 'debit' : 'jv',
            debit: t.debit ?? (isDebit ? (t.amount ?? 0) : 0),
            credit: t.credit ?? (isCredit ? (t.amount ?? 0) : 0),
            balance: t.balance ?? t.runningBalance ?? 0,
            category: t.category ?? ''
          } as DealerLedgerTxn;
        });
        this.dealerLedgerTotalRecords = res?.totalElements ?? res?.total ?? res?.totalRecords ?? list.length;
        this.isLoadingLedger = false;
      },
      error: (err) => {
        console.error('Error loading dealer ledger:', err);
        const msg = err?.error?.message ?? err?.error?.error ?? `Ledger error (${err?.status})`;
        this.showToast(msg, 'danger');
        this.isLoadingLedger = false;
      }
    });
  }

  loadDealerLedgerSummary() {
    if (!this.selectedLedgerDealer) return;
    console.log('loadDealerLedgerSummary — dealerId:', this.selectedLedgerDealer.id, 'type:', typeof this.selectedLedgerDealer.id);
    this.http.get<any>(`${environment.dealerLedgerUrl}/summary/by-distributor`, {
      params: { dealerId: String(this.selectedLedgerDealer.id), distributorId: String(this.distributorId ?? this.auth.getUserId()) }
    }).subscribe({
      next: (res) => {
        this.dealerLedgerSummaryData = {
          totalDebits: res?.totalDebits ?? res?.totalDebit ?? 0,
          totalCredits: res?.totalCredits ?? res?.totalCredit ?? 0,
          netBalance: res?.netBalance ?? 0,
          closingBalance: res?.closingBalance ?? res?.balance ?? 0,
          transactionCount: res?.transactionCount ?? res?.count ?? 0
        };
      },
      error: (err) => {
        console.error('Error loading ledger summary:', err);
        const msg = err?.error?.message ?? err?.error?.error ?? `Summary error (${err?.status})`;
        this.showToast(msg, 'danger');
      }
    });
  }

  submitLedgerEntry() {
    if (!this.selectedLedgerDealer) return;
    const { description, type, amount, category, date } = this.ledgerEntryForm;
    if (!description.trim()) { this.showToast('Please enter description', 'danger'); return; }
    if (!amount || amount <= 0) { this.showToast('Please enter a valid amount', 'danger'); return; }
    this.isSubmittingLedgerEntry = true;
    const autoRef = `${type.charAt(0)}-${this.selectedLedgerDealer.id}-${Date.now()}`;
    const payload = {
      dealerId: this.selectedLedgerDealer.id,
      distributorId: this.distributorId ?? this.auth.getUserId(),
      date,
      description: description.trim(),
      reference: autoRef,
      type,
      amount,
      category
    };
    this.http.post<any>(`${environment.dealerLedgerUrl}`, payload).subscribe({
      next: () => {
        this.showToast('Ledger entry added', 'success');
        this.isSubmittingLedgerEntry = false;
        this.isLedgerEntryOpen = false;
        this.ledgerEntryForm = { description: '', type: 'CREDIT', amount: null, category: 'Payment', date: new Date().toISOString().split('T')[0] };
        this.loadDealerLedger();
        this.loadDealerLedgerSummary();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Failed to add entry. Please try again.';
        this.showToast(msg, 'danger');
        this.isSubmittingLedgerEntry = false;
        console.error('Error submitting ledger entry:', err);
      }
    });
  }

  get dealerLedgerTxns(): DealerLedgerTxn[] {
    let txns = [...this.dealerLedgerTxnsData];
    const q = this.dealerLedgerTxnSearch.toLowerCase();
    if (q) txns = txns.filter(t => t.description.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q));
    if (this.dealerLedgerStartDate) txns = txns.filter(t => t.date >= this.dealerLedgerStartDate);
    if (this.dealerLedgerEndDate) txns = txns.filter(t => t.date <= this.dealerLedgerEndDate);
    txns.sort((a, b) => {
      let va: any = a[this.dealerLedgerSortField], vb: any = b[this.dealerLedgerSortField];
      if (this.dealerLedgerSortField === 'date') { va = va ?? ''; vb = vb ?? ''; }
      return this.dealerLedgerSortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return txns;
  }

  get dealerLedgerPaginated(): DealerLedgerTxn[] {
    return this.dealerLedgerTxns; // server-side pagination; API returns current page only
  }

  get dealerLedgerTotalPages(): number {
    return Math.max(1, Math.ceil(this.dealerLedgerTotalRecords / this.dealerLedgerRowsPerPage));
  }

  get dealerLedgerSummary() {
    return this.dealerLedgerSummaryData;
  }

  sortDealerLedger(field: 'date' | 'debit' | 'credit' | 'balance') {
    if (this.dealerLedgerSortField === field) {
      this.dealerLedgerSortDir = this.dealerLedgerSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.dealerLedgerSortField = field;
      this.dealerLedgerSortDir = 'desc';
    }
    this.dealerLedgerCurrentPage = 1;
    this.loadDealerLedger();
  }

  changeDealerLedgerPage(delta: number) {
    const newPage = Math.max(1, Math.min(this.dealerLedgerTotalPages, this.dealerLedgerCurrentPage + delta));
    if (newPage !== this.dealerLedgerCurrentPage) {
      this.dealerLedgerCurrentPage = newPage;
      this.loadDealerLedger();
    }
  }

  formatLedgerCurrency(val: number): string {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatLedgerDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getLedgerTxnConfig(type: string): { label: string; icon: string; className: string } {
    switch (type) {
      case 'credit': return { label: 'Credit', icon: 'arrow-up-outline', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'debit':  return { label: 'Debit',  icon: 'arrow-down-outline', className: 'bg-red-50 text-red-700 border-red-200' };
      default:       return { label: 'JV',     icon: 'swap-vertical-outline', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
  }

  exportDealerLedger() {
    if (!this.selectedLedgerDealer) return;
    const txns = this.dealerLedgerTxns;
    const summary = this.dealerLedgerSummary;
    const headers = ['Date', 'Reference', 'Description', 'Type', 'Debit', 'Credit', 'Balance'];
    const rows = txns.map(t => [
      this.formatLedgerDate(t.date),
      t.reference,
      t.description,
      t.type.toUpperCase(),
      t.debit > 0 ? t.debit.toFixed(2) : '',
      t.credit > 0 ? t.credit.toFixed(2) : '',
      t.balance.toFixed(2)
    ]);
    const summaryRows = [
      [],
      ['', '', '', 'Total Debits', summary.totalDebits.toFixed(2), '', ''],
      ['', '', '', 'Total Credits', '', summary.totalCredits.toFixed(2), ''],
      ['', '', '', 'Net Balance', '', '', summary.netBalance.toFixed(2)],
      ['', '', '', 'Closing Balance', '', '', summary.closingBalance.toFixed(2)]
    ];
    const csvContent = [headers, ...rows, ...summaryRows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${this.selectedLedgerDealer.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
