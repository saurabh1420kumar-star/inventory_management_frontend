import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { SalesAnalyticsService, SalesAnalyticsData } from './sales-analytics.service';
import { PaymentService, PaymentRequest, PaymentResponse } from './payment.service';
import { DistributorService, Distributor } from './distributor.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { menuOutline, analyticsOutline, cardOutline, trendingUpOutline, cartOutline, cashOutline, checkmarkCircleOutline, chevronDownOutline, walletOutline, searchOutline, addOutline, arrowForwardOutline, checkmarkDoneOutline, arrowUpOutline, arrowDownOutline, calendarOutline, documentTextOutline, cloudUploadOutline, imageOutline, closeOutline } from 'ionicons/icons';

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
    IonicModule
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
  receiptFileName = '';
  
  distributors: Distributor[] = [];
  salespersonId = 1; // Get this from auth/session
  
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

  constructor(
    private salesAnalyticsService: SalesAnalyticsService,
    private paymentService: PaymentService,
    private distributorService: DistributorService
  ) {
    addIcons({ menuOutline, analyticsOutline, cardOutline, trendingUpOutline, cartOutline, cashOutline, checkmarkCircleOutline, chevronDownOutline, walletOutline, searchOutline, addOutline, arrowForwardOutline, checkmarkDoneOutline, arrowUpOutline, arrowDownOutline, calendarOutline, documentTextOutline, cloudUploadOutline, imageOutline, closeOutline });
  }

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadDistributors();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPeriodChange(period: 'today' | 'month' | 'year'): void {
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
      .getSalesAnalytics(
        this.selectedPeriod,
        this.selectedPeriod === 'month' ? this.selectedMonth : undefined,
        this.selectedPeriod === 'year' ? this.selectedYear : undefined
      )
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

  openPaymentModal(): void {
    this.isPaymentModalOpen = true;
  }

  closePaymentModal(): void {
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

  submitPayment(): void {
    if (!this.validatePaymentForm()) {
      alert('Please fill all required fields');
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
      .submitPayment(paymentRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaymentResponse) => {
          this.isSubmittingPayment = false;
          // Check if payment was added successfully by looking for paymentId
          if (response.paymentId) {
            const successMessage = `${response.message}\n\nPayment ID: ${response.paymentId}\nStatus: ${response.status || 'PAYMENT_ADDED'}`;
            alert(successMessage);
            this.closePaymentModal();
            this.loadAnalytics();
          } else {
            alert(`Error: ${response.message}`);
          }
        },
        error: (error) => {
          console.error('Error submitting payment:', error);
          this.isSubmittingPayment = false;
          alert('Failed to submit payment. Please try again.');
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
