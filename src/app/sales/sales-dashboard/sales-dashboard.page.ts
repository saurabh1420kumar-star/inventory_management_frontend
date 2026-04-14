import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { SalesAnalyticsService, SalesAnalyticsData } from './sales-analytics.service';
import { PaymentService, PaymentRequest, PaymentResponse } from './payment.service';
import { DistributorService, Distributor } from './distributor.service';
import { Auth } from '../../services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HapticService } from '../../services/haptic.service';
import { addIcons } from 'ionicons';
import { menuOutline, analyticsOutline, cardOutline, trendingUpOutline, cartOutline, cashOutline, checkmarkCircleOutline, chevronDownOutline, walletOutline, searchOutline, addOutline, arrowForwardOutline, checkmarkDoneOutline, arrowUpOutline, arrowDownOutline, calendarOutline, documentTextOutline, cloudUploadOutline, imageOutline, closeOutline, chevronForwardOutline, receiptOutline, addCircleOutline, storefrontOutline, personAddOutline, pricetagOutline, bookOutline, chevronUpOutline } from 'ionicons/icons';

interface PaymentForm {
  balanceType: 'credit' | 'debit' | '';
  date: any;
  amount: number;
  reference: string;
  description: string;
  paymentMethod: string;
  utrNumber: string;
  bankName: string;
  chequeNumber: string;
  transactionNumber: string;
  notes: string;
  selectedDistributorId: number | null;
}

interface PaymentMethod {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    IonicModule,
    RouterModule
  ],
  templateUrl: './sales-dashboard.page.html',
  styleUrls: ['./sales-dashboard.page.scss']
})
export class SalesDashboardPage implements OnInit, OnDestroy {
  salesAnalytics: SalesAnalyticsData | null = null;
  selectedPeriod: 'today' | 'month' | 'year' = 'today';
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  selectedTab: 'dashboard' | 'operations' = 'dashboard';
  
  isPaymentModalOpen = false;
  isLoadingAnalytics = false;
  isSubmittingPayment = false;
  isLoadingDistributors = false;
  isLoadingPendingPayments = false;
  showMyPayments = false;
  receiptFileName = '';
  showAddDealerModal = false;
  isSubmittingDealer = false;
  dealerForm = { fullName: '', phone: '', address: '', selectedDistributorId: null as number | null };

  myDealers: any[] = [];
  isLoadingMyDealers = false;
  showMyDealersModal = false;

  distributors: Distributor[] = [];
  dealerFormDistributors: { distributorId: number; distributorName: string }[] = [];
  isLoadingDealerDistributors = false;
  pendingPayments: any[] = [];
  salespersonId: number = 1;
  
  paymentForm: PaymentForm = {
    balanceType: '',
    date: null,
    amount: 0,
    reference: '',
    description: '',
    paymentMethod: '',
    utrNumber: '',
    bankName: '',
    chequeNumber: '',
    transactionNumber: '',
    notes: '',
    selectedDistributorId: null
  };

  paymentMethods: PaymentMethod[] = [
    { label: 'Cash', value: 'cash', icon: 'wallet-outline' },
    { label: 'Check', value: 'cheque', icon: 'document-text-outline' },
    { label: 'Bank', value: 'bank', icon: 'card-outline' },
    { label: 'RTGS', value: 'rtgs', icon: 'send-outline' },
    { label: 'UPI', value: 'upi', icon: 'phone-portrait-outline' }
  ];

  private destroy$ = new Subject<void>();

  private haptic = inject(HapticService);

  constructor(
    private salesAnalyticsService: SalesAnalyticsService,
    private paymentService: PaymentService,
    private distributorService: DistributorService,
    private toastController: ToastController,
    private auth: Auth,
    private router: Router,
    private http: HttpClient
  ) {
    addIcons({ menuOutline, analyticsOutline, cardOutline, trendingUpOutline, cartOutline, cashOutline, checkmarkCircleOutline, chevronDownOutline, walletOutline, searchOutline, addOutline, arrowForwardOutline, checkmarkDoneOutline, arrowUpOutline, arrowDownOutline, calendarOutline, documentTextOutline, cloudUploadOutline, imageOutline, closeOutline, chevronForwardOutline, receiptOutline, addCircleOutline, storefrontOutline, personAddOutline, pricetagOutline, bookOutline, chevronUpOutline });
  }

  ngOnInit(): void {
    this.salespersonId = this.auth.getUserId() ?? 1;
    this.loadAnalytics();
    this.loadDistributors();
    this.loadPendingPayments();
    this.loadMyDealers();
  }

  loadMyDealers(): void {
    this.isLoadingMyDealers = true;
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    this.http.get<any>(
      `${environment.apiUrl}/dealers/by-salesperson/${this.salespersonId}`,
      { headers }
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.myDealers = Array.isArray(res) ? res : (res?.data ?? []);
        this.isLoadingMyDealers = false;
      },
      error: () => {
        this.isLoadingMyDealers = false;
      }
    });
  }

  openMyDealersModal(): void {
    this.haptic.medium();
    this.showMyDealersModal = true;
  }

  closeMyDealersModal(): void {
    this.haptic.light();
    this.showMyDealersModal = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPeriodChange(period: 'today' | 'month' | 'year'): void {
    this.haptic.selectionChanged();
    this.selectedPeriod = period;
    this.loadAnalytics();
  }

  onMonthYearChange(): void {
    if (this.selectedPeriod === 'month' || this.selectedPeriod === 'year') {
      this.loadAnalytics();
    }
  }

  loadAnalytics(): void {
    this.isLoadingAnalytics = true;
    
    this.salesAnalyticsService
      .getSalesAnalytics(this.selectedPeriod, this.salespersonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: SalesAnalyticsData) => {
          this.salesAnalytics = data;
          this.isLoadingAnalytics = false;
        },
        error: (error) => {
          console.error('Error loading analytics:', error);
          this.isLoadingAnalytics = false;
        }
      });
  }

  loadDistributors(): void {
    this.isLoadingDistributors = true;
    
    this.distributorService
      .getDistributorsBySalesperson(this.salespersonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.distributors = response.data || [];
          this.isLoadingDistributors = false;
        },
        error: (error) => {
          console.error('Error loading distributors:', error);
          this.isLoadingDistributors = false;
        }
      });
  }

  handlePullRefresh(event: any) {
    this.loadDistributors();
    setTimeout(() => event.target.complete(), 1500);
  }

  loadPendingPayments(): void {
    this.isLoadingPendingPayments = true;
    
    this.paymentService
      .getPendingPayments(this.salespersonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.pendingPayments = Array.isArray(response) ? response : response.data || [];
          this.isLoadingPendingPayments = false;
        },
        error: (error) => {
          console.error('Error loading pending payments:', error);
          this.isLoadingPendingPayments = false;
          this.pendingPayments = [];
        }
      });
  }

  openPaymentModal(): void {
    this.haptic.medium();
    this.isPaymentModalOpen = true;
  }

  openAddDealerModal(): void {
    this.haptic.medium();
    this.dealerForm = { fullName: '', phone: '', address: '', selectedDistributorId: null };
    this.showAddDealerModal = true;
    this.loadDealersBySalesperson();
  }

  loadDealersBySalesperson(): void {
    this.isLoadingDealerDistributors = true;
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    this.http.get<any>(
      `${environment.apiUrl}/dealers/salesperson/${this.salespersonId}`,
      { headers }
    ).subscribe({
      next: (res) => {
        const items: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        const seen = new Set<number>();
        this.dealerFormDistributors = items
          .filter((item: any) => item.id != null)
          .reduce((acc: { distributorId: number; distributorName: string }[], item: any) => {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              const name = item.firmName || `Distributor ${item.id}`;
              acc.push({ distributorId: item.id, distributorName: name });
            }
            return acc;
          }, []);
        this.isLoadingDealerDistributors = false;
      },
      error: () => {
        this.isLoadingDealerDistributors = false;
      }
    });
  }

  closeAddDealerModal(): void {
    this.haptic.light();
    this.showAddDealerModal = false;
  }

  submitDealer(): void {
    this.haptic.heavy();
    const { fullName, phone, address, selectedDistributorId } = this.dealerForm;
    if (!fullName.trim()) { this.showToast('Please enter dealer full name', 'warning'); return; }
    if (!phone.trim()) { this.showToast('Please enter phone number', 'warning'); return; }
    
    // Validate phone number: must be exactly 10 digits
    const phoneDigits = phone.trim().replace(/\D/g, '');
    if (phoneDigits.length !== 10) { 
      this.showToast('Phone must be a valid 10-digit Indian mobile number', 'warning'); 
      return; 
    }
    
    if (!address.trim()) { this.showToast('Please enter address', 'warning'); return; }
    if (!selectedDistributorId) { this.showToast('Please select a distributor', 'warning'); return; }
    
    this.isSubmittingDealer = true;
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    
    this.http.post<any>(
      `${environment.dealersUrl}`,
      { fullName: fullName.trim(), phone: phoneDigits, address: address.trim(), openingBalance: 0 },
      { 
        params: { distributorId: String(selectedDistributorId), salespersonId: String(this.salespersonId) },
        headers: headers
      }
    ).subscribe({
      next: () => {
        this.showToast('Dealer is created', 'success');
        this.isSubmittingDealer = false;
        this.closeAddDealerModal();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Failed to add dealer. Please try again.';
        this.showToast(msg, 'danger');
        this.isSubmittingDealer = false;
      }
    });
  }

  closePaymentModal(): void {
    this.haptic.light();
    this.isPaymentModalOpen = false;
    this.resetPaymentForm();
  }

  generatePaymentReference(): void {
    const balanceTypePrefix = this.paymentForm.balanceType === 'credit' ? 'CR' : 'DB';
    const timestamp = Date.now().toString().slice(-4);
    this.paymentForm.reference = `${balanceTypePrefix}-${timestamp}`;
  }

  onPaymentReceiptSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.receiptFileName = file.name;
    }
  }

  removePaymentReceipt(): void {
    this.receiptFileName = '';
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color,
      buttons: [{ icon: 'close', role: 'cancel' }]
    });
    await toast.present();
  }

  submitPayment(): void {
    this.haptic.heavy();
    if (!this.validatePaymentForm()) {
      this.showToast('Please fill all required fields', 'warning');
      return;
    }

    this.isSubmittingPayment = true;
    
    const paymentRequest: PaymentRequest = {
      distributorId: this.paymentForm.selectedDistributorId ? this.paymentForm.selectedDistributorId.toString() : '',
      amount: this.paymentForm.amount,
      method: this.paymentForm.paymentMethod || this.paymentForm.balanceType,
      reference: this.paymentForm.reference,
      balanceType: this.paymentForm.balanceType as 'credit' | 'debit',
      date: this.paymentForm.date ? new Date(this.paymentForm.date).toISOString() : '',
      description: this.paymentForm.description,
      paymentMethod: this.paymentForm.paymentMethod,
      utrNumber: this.paymentForm.utrNumber,
      bankName: this.paymentForm.bankName,
      chequeNumber: this.paymentForm.chequeNumber,
      transactionNumber: this.paymentForm.transactionNumber,
      notes: this.paymentForm.notes
    };

    this.paymentService
      .submitPayment(paymentRequest, this.salespersonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaymentResponse) => {
          this.isSubmittingPayment = false;
          // Check if payment was added successfully by looking for paymentId
          if (response.paymentId) {
            this.showToast(`${response.message} (ID: ${response.paymentId})`, 'success');
            this.closePaymentModal();
            this.loadAnalytics();
          } else {
            this.showToast(`Error: ${response.message}`, 'danger');
          }
        },
        error: (error) => {
          console.error('Error submitting payment:', error);
          this.isSubmittingPayment = false;
          this.showToast('Failed to submit payment. Please try again.', 'danger');
        }
      });
  }

  private validatePaymentForm(): boolean {
    const { balanceType, date, amount, reference, description, selectedDistributorId } = this.paymentForm;
    
    if (!selectedDistributorId || !balanceType || !date || amount <= 0 || !reference.trim() || !description.trim()) {
      return false;
    }

    // Conditional validation for payment methods
    if (this.paymentForm.paymentMethod === 'rtgs' || this.paymentForm.paymentMethod === 'neft') {
      return !!this.paymentForm.utrNumber.trim();
    }

    if (this.paymentForm.paymentMethod === 'cheque') {
      return !!this.paymentForm.bankName.trim() && !!this.paymentForm.chequeNumber.trim();
    }

    if (this.paymentForm.paymentMethod === 'imps' || this.paymentForm.paymentMethod === 'upi') {
      return !!this.paymentForm.transactionNumber.trim();
    }

    return true;
  }

  private resetPaymentForm(): void {
    this.paymentForm = {
      balanceType: '',
      date: null,
      amount: 0,
      reference: '',
      description: '',
      paymentMethod: '',
      utrNumber: '',
      bankName: '',
      chequeNumber: '',
      transactionNumber: '',
      notes: '',
      selectedDistributorId: null
    };
    this.receiptFileName = '';
  }

  getMonthOptions(): number[] {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }

  getYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }
}
