import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { SalesAnalyticsService, SalesAnalyticsData } from './sales-analytics.service';
import { PaymentService, PaymentRequest, PaymentResponse } from './payment.service';
import { DistributorService, Distributor } from './distributor.service';
import { Auth } from '../../services/auth';
import { LegalDocsModalComponent } from '../../components/legal-docs-modal/legal-docs-modal.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HapticService } from '../../services/haptic.service';
import { findLocationByPincode } from '../../services/india-location.data';
import { addIcons } from 'ionicons';
import { menuOutline, analyticsOutline, cardOutline, trendingUpOutline, cartOutline, cashOutline, checkmarkCircleOutline, chevronDownOutline, walletOutline, searchOutline, addOutline, arrowForwardOutline, arrowBackOutline, checkmarkDoneOutline, arrowUpOutline, arrowDownOutline, calendarOutline, documentTextOutline, cloudUploadOutline, imageOutline, closeOutline, chevronForwardOutline, receiptOutline, addCircleOutline, storefrontOutline, personAddOutline, pricetagOutline, bookOutline, chevronUpOutline, briefcaseOutline, peopleOutline, locationOutline, gitBranchOutline, homeOutline, gridOutline, settingsOutline, personOutline } from 'ionicons/icons';

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

interface KpiResultApiItem {
  kpiName: string;
  achievedValue: number;
  targetValue: number;
  grade: string;
  gradeMeaning?: string;
  weightage?: number;
  weightedScore?: number;
  scorePercentage?: number;
}

interface KpiTableRow {
  kpiName: string;
  achievedValue: number;
  targetValue: number;
  grade: string;
  gradeMeaning: string;
  weightage: number;
  weightedScore: number;
  scorePercentage: number;
}

interface PerformanceSummary {
  month?: number;
  year?: number;
  totalScore: number;
  totalWeightedScore: number;
  overallGrade: string;
  overallGradeMeaning: string;
  finalGrade: string;
  finalGradeMeaning: string;
}

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    IonicModule,
    RouterModule,
    LegalDocsModalComponent
  ],
  templateUrl: './sales-dashboard.page.html',
  styleUrls: ['./sales-dashboard.page.scss']
})
export class SalesDashboardPage implements OnInit, OnDestroy {
  salesAnalytics: SalesAnalyticsData | null = null;
  selectedPeriod: 'today' | 'month' | 'year' = 'today';
  isLoadingVolumeAnalytics = false;
  isLoadingKpiResults = false;
  volumeAnalytics: any = null;
  kpiRows: KpiTableRow[] = [];
  performanceSummary: PerformanceSummary | null = null;
  activePerformancePeriod: 'MTD' | 'YTD' | null = null;

  get showKpiTargetTable(): boolean {
    return this.activePerformancePeriod !== null;
  }
  periodData = {
    volMTD: '0 Units',
    volYTD: '0 Units',
    callMTD: '0',
    callYTD: '0'
  };

  get salesPendingOrdersCount(): number {
    const apiValue = this.volumeAnalytics?.salesPendingOrders;
    if (typeof apiValue === 'number') return apiValue;
    return this.pendingPayments.length;
  }

  get salesOrdersCount(): number {
    const apiValue = this.volumeAnalytics?.salesOrders;
    if (typeof apiValue === 'number') return apiValue;
    return this.salesAnalytics?.totalOrders ?? 0;
  }

  get activeDistributorsCount(): number {
    const apiValue = this.volumeAnalytics?.activeDistributors;
    if (typeof apiValue === 'number') return apiValue;
    return this.distributors.length;
  }

  get inactiveDistributorsCount(): number {
    const apiValue = this.volumeAnalytics?.inactiveDistributors;
    if (typeof apiValue === 'number') return apiValue;
    return 0;
  }
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  selectedTab: 'dashboard' | 'operations' = 'dashboard';
  
  get currentFYLabel(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month >= 4) {
      return `${year}-${(year + 1).toString().slice(2)}`;
    }
    return `${year - 1}-${year.toString().slice(2)}`;
  }
  
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

  showAddDistributorModal = false;
  isSubmittingDistributor = false;
  distributorCreateForm!: FormGroup;
  private fb = inject(FormBuilder);

  myDealers: any[] = [];
  isLoadingMyDealers = false;
  showMyDealersModal = false;

  selectedDistributorForBalance: number | null = null;
  distributorBalance: number | null = null;
  isLoadingBalance = false;
  showBalanceModal = false;
  showPdfModal = false;
  pdfModalTitle = '';
  legalDocType: 'terms' | 'privacy' = 'terms';

  distributors: Distributor[] = [];
  dealerFormDistributors: { distributorId: number; distributorName: string }[] = [];
  isLoadingDealerDistributors = false;
  pendingPayments: any[] = [];
  salespersonId: number = 0;
  
  paymentForm: PaymentForm = {
    balanceType: '',
    date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
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
    protected auth: Auth,
    private router: Router,
    private http: HttpClient
  ) {
    addIcons({ menuOutline, analyticsOutline, cardOutline, trendingUpOutline, cartOutline, cashOutline, checkmarkCircleOutline, chevronDownOutline, walletOutline, searchOutline, addOutline, arrowForwardOutline, arrowBackOutline, checkmarkDoneOutline, arrowUpOutline, arrowDownOutline, calendarOutline, documentTextOutline, cloudUploadOutline, imageOutline, closeOutline, chevronForwardOutline, receiptOutline, addCircleOutline, storefrontOutline, personAddOutline, pricetagOutline, bookOutline, chevronUpOutline, briefcaseOutline, peopleOutline, locationOutline, gitBranchOutline, homeOutline, gridOutline, settingsOutline, personOutline });
  }

  ngOnInit(): void {
    const role = this.auth.getRoleType()?.toUpperCase() || '';
    if (role === 'DISTRIBUTOR' || role === 'DEALER') {
      this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      return;
    }
    const id = this.auth.getSalespersonId();
    if (!id) {
      this.showToast('Session expired. Please log in again.', 'danger');
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }
    this.salespersonId = id;
    this.initDistributorForm();
    this.loadAnalytics();
    this.loadDistributors();
    this.loadPendingPayments();
    this.loadMyDealers();
    this.loadDealersBySalesperson();
    this.loadVolumeAnalytics();
    this.loadKpiResults();
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

  initDistributorForm(): void {
    this.distributorCreateForm = this.fb.group({
      companyName:      ['', [Validators.required]],
      keyPersonName:    ['', [Validators.required]],
      distributorType:  ['', [Validators.required]],
      companyType:      ['', [Validators.required]],
      email:            ['', [Validators.required, Validators.email]],
      contact:          ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      alternateContact: [''],
      address:          ['', [Validators.required]],
      state:            [''],
      district:         [''],
      pincode:          [''],
      aadhaarNumber:    ['', [Validators.required, Validators.minLength(12), Validators.maxLength(12)]],
      panNumber:        ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      gstNumber:        ['', [Validators.minLength(15), Validators.maxLength(15)]],
      username:         ['', [Validators.required]],
      password:         ['', [Validators.required]],
      accountNumber:    [''],
      accountName:      [''],
      ifsc:             [''],
      creditLimit:      [false],
      creditAmount:     [''],
    });
  }

  openAddDistributorModal(): void {
    this.haptic.medium();
    this.distributorCreateForm.reset({ creditLimit: false });
    this.showAddDistributorModal = true;
  }

  closeAddDistributorModal(): void {
    this.haptic.light();
    this.showAddDistributorModal = false;
  }

  onPincodeInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    if (value.length !== 6) {
      if (value.length === 0) {
        this.distributorCreateForm.patchValue({ state: '', district: '' }, { emitEvent: false });
      }
      return;
    }
    const result = findLocationByPincode(value);
    if (result) {
      this.distributorCreateForm.patchValue({ state: result.state, district: result.district }, { emitEvent: false });
    } else {
      this.showToast('Pincode not found. Please enter state/district manually.', 'warning');
    }
  }

  submitDistributor(): void {
    this.haptic.heavy();
    if (this.distributorCreateForm.invalid) {
      Object.keys(this.distributorCreateForm.controls).forEach(key => {
        this.distributorCreateForm.get(key)?.markAsTouched();
      });
      this.showToast('Please fill all required fields correctly', 'warning');
      return;
    }

    const f = this.distributorCreateForm.value;
    const payload = {
      companyName:       f.companyName,
      firmName:          f.companyName,
      name:              f.companyName,
      keyPersonName:     f.keyPersonName,
      keyperson:         f.keyPersonName,
      distributorType:   f.distributorType,
      companyType:       f.companyType,
      contactEmail:      f.email,
      phoneNumber:       f.contact,
      alternateContact:  f.alternateContact || '',
      address:           f.address,
      state:             f.state || '',
      district:          f.district || '',
      pinCode:           f.pincode || '',
      aadhaarNumber:     f.aadhaarNumber,
      panNumber:         f.panNumber,
      gstNumber:         f.gstNumber || '',
      username:          f.username,
      password:          f.password,
      accountNumber:     f.accountNumber || '',
      accountName:       f.accountName || '',
      ifsc:              (f.ifsc || '').toUpperCase(),
      creditLimit:       f.creditLimit || false,
      creditAmount:      f.creditAmount || 0,
      bankGuaranteeNumber: '',
      bgExpiryDate:      '',
      status:            'INACTIVE',
      salesPersonRoleType: this.auth.getRoleType() ?? '',
      salespersonId:     this.salespersonId,
      assignedPerson:    this.auth.getUsername() ?? '',
    };

    this.isSubmittingDistributor = true;
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });

    this.http.post<any>(
      `${environment.apiUrl}/distributors/create-distributor`,
      payload,
      { headers }
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.isSubmittingDistributor = false;
        this.showToast('Distributor created and pending admin approval', 'success');
        this.closeAddDistributorModal();
        this.loadDistributors();
      },
      error: (err) => {
        const msg = err?.error?.error ?? err?.error?.message ?? 'Failed to create distributor. Please try again.';
        this.showToast(msg, 'danger');
        this.isSubmittingDistributor = false;
      }
    });
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
    this.loadKpiResults();
    this.loadVolumeAnalytics();
    setTimeout(() => event.target.complete(), 1500);
  }

  loadKpiResults(): void {
    if (!this.salespersonId) return;
    this.isLoadingKpiResults = true;
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      'accept': '*/*',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    const url = `${environment.apiUrl}/employee/kra-kpi/results-with-grades/${this.salespersonId}`;

    this.http.get<any>(url, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const data = response?.data ?? response;
          const items: KpiResultApiItem[] = Array.isArray(data) ? data : (data?.kpis ?? []);
          this.performanceSummary = Array.isArray(data)
            ? null
            : {
                month: data?.month,
                year: data?.year,
                totalScore: Number(data?.totalScore ?? 0),
                totalWeightedScore: Number(data?.totalWeightedScore ?? data?.totalScore ?? 0),
                overallGrade: (data?.overallGrade ?? '-').toString().trim() || '-',
                overallGradeMeaning: (data?.overallGradeMeaning ?? 'N/A').toString().trim() || 'N/A',
                finalGrade: (data?.finalGrade ?? '-').toString().trim() || '-',
                finalGradeMeaning: (data?.finalGradeMeaning ?? 'N/A').toString().trim() || 'N/A',
              };
          this.kpiRows = items.map((item) => ({
            kpiName: item.kpiName ?? '-',
            achievedValue: Number(item.achievedValue ?? 0),
            targetValue: Number(item.targetValue ?? 0),
            grade: (item.grade ?? '-').toString().trim() || '-',
            gradeMeaning: (item.gradeMeaning ?? '-').toString().trim() || '-',
            weightage: Number(item.weightage ?? 0),
            weightedScore: Number(item.weightedScore ?? 0),
            scorePercentage: Number(item.scorePercentage ?? 0)
          }));
          this.isLoadingKpiResults = false;
        },
        error: () => {
          this.kpiRows = [];
          this.performanceSummary = null;
          this.isLoadingKpiResults = false;
        }
      });
  }

  togglePerformancePeriod(period: 'MTD' | 'YTD'): void {
    this.haptic.medium();
    this.activePerformancePeriod = this.activePerformancePeriod === period ? null : period;
  }

  getPerformanceGrade(period: 'MTD' | 'YTD'): string {
    if (!this.performanceSummary) return '-';
    return period === 'MTD' ? this.performanceSummary.overallGrade : this.performanceSummary.finalGrade;
  }

  getPerformanceMeaning(period: 'MTD' | 'YTD'): string {
    if (!this.performanceSummary) return 'N/A';
    return period === 'MTD' ? this.performanceSummary.overallGradeMeaning : this.performanceSummary.finalGradeMeaning;
  }

  getPerformanceScore(period: 'MTD' | 'YTD'): number {
    if (!this.performanceSummary) return 0;
    return period === 'MTD' ? this.performanceSummary.totalWeightedScore : this.performanceSummary.totalScore;
  }

  getGradeClass(grade: string): string {
    const normalized = (grade || '').toUpperCase().trim();
    if (normalized === 'A+') return 'sd-grade-chip--a-plus';
    if (normalized === 'A' || normalized === 'A-') return 'sd-grade-chip--a';
    if (normalized === 'B' || normalized === 'B+' || normalized === 'B-') return 'sd-grade-chip--b';
    if (normalized === 'C' || normalized === 'C+' || normalized === 'C-') return 'sd-grade-chip--c';
    if (normalized === 'D' || normalized === 'D+' || normalized === 'D-') return 'sd-grade-chip--d';
    return 'sd-grade-chip--f';
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
    this.loadDealersBySalesperson();
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

  openBalanceModal(): void {
    this.haptic.medium();
    this.selectedDistributorForBalance = null;
    this.distributorBalance = null;
    this.showBalanceModal = true;
    this.loadBalanceDistributors();
  }

  loadBalanceDistributors(): void {
    if (!this.salespersonId) return;
    this.isLoadingDealerDistributors = true;
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ ...(token ? { 'Authorization': `Bearer ${token}` } : {}) });
    this.http.get<any>(
      `${environment.apiUrl}/sales-mapping/salesperson/${this.salespersonId}`,
      { headers }
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        const items: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        const seen = new Set<number>();
        this.dealerFormDistributors = items
          .filter((item: any) => item.distributorId != null)
          .reduce((acc: { distributorId: number; distributorName: string }[], item: any) => {
            if (!seen.has(item.distributorId)) {
              seen.add(item.distributorId);
              acc.push({ distributorId: item.distributorId, distributorName: item.distributorName });
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

  closeBalanceModal(): void {
    this.haptic.light();
    this.showBalanceModal = false;
  }

  openLegalDoc(type: 'terms' | 'privacy', title: string): void {
    this.haptic.light();
    this.legalDocType = type;
    this.pdfModalTitle = title;
    this.showPdfModal = true;
  }

  closePdfModal(): void {
    this.showPdfModal = false;
  }

  closeAddDealerModal(): void {
    this.haptic.light();
    this.showAddDealerModal = false;
  }

  onDistributorBalanceChange(): void {
    this.distributorBalance = null;
    if (!this.selectedDistributorForBalance) return;
    this.isLoadingBalance = true;
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    this.http.get<any>(
      `${environment.apiUrl}/distributors/${this.selectedDistributorForBalance}/balance`,
      { headers }
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.distributorBalance = res?.data ?? res?.balance ?? null;
        this.isLoadingBalance = false;
      },
      error: () => {
        this.distributorBalance = null;
        this.isLoadingBalance = false;
        this.showToast('Failed to fetch distributor balance', 'danger');
      }
    });
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
        const msg = err?.error?.message ?? err?.error?.error ?? 'Failed to add dealer. Please try again.';
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
      date: this.paymentForm.date ? `${this.paymentForm.date}T00:00:00` : '',
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
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
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

  loadVolumeAnalytics(): void {
    if (!this.salespersonId) return;
    this.isLoadingVolumeAnalytics = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
    const url = `${environment.apiUrl}/dashboard/volume-analytics?salesPersonId=${this.salespersonId}`;
    this.http.get<any>(url, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const data = res?.data ?? res;
          this.volumeAnalytics = data;
          this.periodData.volMTD = `${data.monthToDate?.totalVolumeTons ?? 0} Tons`;
          this.periodData.volYTD = `${data.yearToDate?.totalVolumeTons ?? 0} Tons`;
          this.periodData.callMTD = `${data.monthToDate?.totalTransactions ?? 0}`;
          this.periodData.callYTD = `${data.yearToDate?.totalTransactions ?? 0}`;
          this.isLoadingVolumeAnalytics = false;
        },
        error: () => { this.isLoadingVolumeAnalytics = false; }
      });
  }
}
