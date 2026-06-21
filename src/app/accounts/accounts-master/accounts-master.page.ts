import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, ElementRef, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ToastController, NavController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { LedgerService, LedgerDto, ApiResponse, Distributor } from '../../services/accountsLedger.service';
import { ProformaInvoiceService, ProformaInvoice } from '../../services/proforma-invoice.service';
import { Auth } from '../../services/auth';
import { Toast as ToastService } from '../../services/toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateLedgerStatementPdf, LedgerStatementRow } from '../../shared/utils/voucher-pdf';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  settingsOutline,
  refreshOutline,
  addOutline,
  downloadOutline,
  searchOutline,
  filterOutline,
  closeOutline,
  calendarOutline,
  chevronDownOutline,
  chevronUpOutline,
  ellipsisVerticalOutline,
  trendingUpOutline,
  trendingDownOutline,
  scaleOutline,
  pulseOutline,
  cartOutline,
  cashOutline,
  returnUpBackOutline,
  settingsSharp,
  folderOpenOutline,
  locationOutline,
  callOutline,
  mailOutline,
  documentTextOutline,
  businessOutline,
  copyOutline,
  arrowDownOutline,
  arrowUpOutline,
  swapVerticalOutline,
  analyticsOutline,
  chevronBackOutline,
  chevronForwardOutline,
  funnelOutline,
  addCircleOutline,
  checkmarkCircle,
  arrowForwardOutline,
  arrowBackOutline,
  menuOutline,
  trashOutline,
  createOutline,
  warningOutline,
  receiptOutline,
  informationCircleOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  cloudUploadOutline,
  eyeOutline,
  imageOutline,
  cardOutline,
  walletOutline,
  phonePortraitOutline,
  sendOutline,
  rocketOutline
} from 'ionicons/icons';

// Interfaces needed for the view
interface Party {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD format
  description: string;
  reference: string;
  type:  'credit' | 'debit' | 'jv';
  debit: number;
  credit: number;
  balance: number;
  category: string;
  notes?: string;
  paymentMethod?: 'rtgs' | 'neft' | 'cheque' | 'imps' | 'upi';
  utrNumber?: string;
  bankName?: string;
  chequeNumber?: string;
  transactionNumber?: string;
  receiptUrl?: string;
}

interface LedgerAccount {
  id: string;
  name: string;
  accountCode: string;
  accountName?: string;
  fromParty: Party;
  toParty: Party;
  openingBalance: number;
  transactions: Transaction[];
  distributorId?: number;
  salespersonId?: number;
  distributorCreditLimit?: boolean;
  distributorCreditAmount?: number;
  distributorCreditBalance?: number;
  distributorBGNumber?: string;
  distributorBGExpiry?: string;
}

interface LedgerSummary {
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  transactionCount: number;
  openingBalance: number;
  closingBalance: number;
}

@Component({
  standalone: true,
  selector: 'app-accounts-master',
  templateUrl: './accounts-master.page.html',
  styleUrls: ['./accounts-master.page.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule,
  ],
})
export class AccountsMasterPage implements OnInit {
  Math = Math; // Expose Math to template

  // API Data properties
  distributors: Distributor[] = [];
  isLoadingAccounts: boolean = false;

  // State used in view
  selectedAccount: LedgerAccount | null = null; // Start null to match Image 0
  searchQuery: string = '';
  typeFilter: string = 'all';

  // Date filter state
  startDate: string = '';
  endDate: string = '';

  sortField: 'date' | 'description' | 'debit' | 'credit' | 'balance' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage: number = 1;
  rowsPerPage: number = 10;
  rowsPerPageOptions = [5, 10, 25, 50];

  // Proforma Invoices
  proformaInvoices: ProformaInvoice[] = [];
  paidInvoices: ProformaInvoice[] = [];
  pendingInvoices: ProformaInvoice[] = [];
  isLoadingInvoices = false;
  downloadingInvoiceId: number | null = null;
  showPaidInvoices = false;
  showPendingInvoices = false;

  // UI State toggles
  isAccountSelectorOpen: boolean = false;
  accountSearchQuery: string = '';
  isTypeDropdownOpen: boolean = false;
  isDateDropdownOpen: boolean = false;

  // Modal states
  isFormModalOpen: boolean = false;
  isDetailsModalOpen: boolean = false;
  isConfirmDeleteOpen: boolean = false;
  isJVModalOpen: boolean = false;
  isPendingPaymentsModalOpen: boolean = false;
  selectedTransaction: Transaction | null = null;
  
  // API-provided closing balance
  apiClosingBalance: number | null = null;

  // Pending payments
  pendingPayments: any[] = [];
  isLoadingPayments: boolean = false;

  // Form data for new transaction (Update Balance)
  formData = {
    date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    balanceType: 'credit' as 'credit' | 'debit' | 'jv',
    description: '',
    reference: '',
    amount: '',
    paymentMethod: '' as '' | 'rtgs' | 'neft' | 'cheque' | 'imps' | 'upi',
    utrNumber: '',
    bankName: '',
    chequeNumber: '',
    transactionNumber: '',
    notes: ''
  };

  // Form data for Journal Voucher
  jvFormData = {
    entries: [
      { accountNumber: '', accountName: '', description: '', debit: '', credit: '' }
    ],
    narration: ''
  };

  isSubmittingJV: boolean = false;

  // Journal Voucher List
  isJVListModalOpen: boolean = false;
  journalVouchers: any[] = [];
  isLoadingJVs: boolean = false;
  selectedJV: any = null;

  // Add Credit Modal state
  isAddCreditModalOpen: boolean = false;
  addCreditAmount: string = '';
  isSubmittingCredit: boolean = false;

  paymentMethods = [
    { value: 'rtgs', label: 'RTGS', icon: 'business-outline', color: 'blue' },
    { value: 'neft', label: 'NEFT', icon: 'swap-vertical-outline', color: 'violet' },
    { value: 'cheque', label: 'Cheque', icon: 'document-text-outline', color: 'amber' },
    { value: 'imps', label: 'IMPS', icon: 'phone-portrait-outline', color: 'emerald' },
    { value: 'upi', label: 'UPI', icon: 'wallet-outline', color: 'teal' },
  ];

  receiptFile: File | null = null;
  receiptFileName: string = '';
  isDispatchModalOpen: boolean = false;

  constructor(
    private toastController: ToastController,
    private ledgerService: LedgerService,
    private proformaInvoiceService: ProformaInvoiceService,
    private elementRef: ElementRef,
    private toastSvc: ToastService,
    private auth: Auth,
    private router: Router,
    private navCtrl: NavController
  ) {
    // Add specific icons shown in the images
    addIcons({
      'book-outline': bookOutline,
      'settings-outline': settingsOutline,
      'refresh-outline': refreshOutline,
      'add-outline': addOutline,
      'add-circle-outline': addCircleOutline,
      'download-outline': downloadOutline,
      'search-outline': searchOutline,
      'filter-outline': filterOutline,
      'funnel-outline': funnelOutline,
      'close-outline': closeOutline,
      'calendar-outline': calendarOutline,
      'chevron-down-outline': chevronDownOutline,
      'chevron-up-outline': chevronUpOutline,
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'ellipsis-vertical-outline': ellipsisVerticalOutline,
      // Summary card icons used in images
      'arrow-down-outline': arrowDownOutline, // Debits
      'arrow-up-outline': arrowUpOutline,     // Credits
      'arrow-forward-outline': arrowForwardOutline,
      'arrow-back-outline': arrowBackOutline,
      'swap-vertical-outline': swapVerticalOutline, // Net Balance
      'analytics-outline': analyticsOutline, // Closing Balance waveform
      'trending-up-outline': trendingUpOutline,
      'trending-down-outline': trendingDownOutline,
      // Transaction type icons
      'cart-outline': cartOutline,
      'cash-outline': cashOutline,
      'return-up-back-outline': returnUpBackOutline,
      'settings-sharp': settingsSharp,
      'folder-open-outline': folderOpenOutline,
      'location-outline': locationOutline,
      'call-outline': callOutline,
      'mail-outline': mailOutline,
      'document-text-outline': documentTextOutline,
      'business-outline': businessOutline,
      'copy-outline': copyOutline,
      'checkmark-circle': checkmarkCircle,
      'menu-outline': menuOutline,
      'trash-outline': trashOutline,
      'create-outline': createOutline,
      'warning-outline': warningOutline,
      'receipt-outline': receiptOutline,
      'information-circle-outline': informationCircleOutline,
      'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'eye-outline': eyeOutline,
      'image-outline': imageOutline,
      'card-outline': cardOutline,
      'wallet-outline': walletOutline,
      'phone-portrait-outline': phonePortraitOutline,
      'send-outline': sendOutline,
      'rocket-outline': rocketOutline
    });
  }

  ngOnInit() {
    // Fetch distributors from API on initialization
    this.loadDistributors();
    this.loadProformaInvoices();

    // Uncomment below to auto-select the account on load for development purposes
    // if (this.ledgerAccounts.length > 0) {
    //   this.handleSelectAccount(this.ledgerAccounts[0]);
    // }
  }

  /** Close all dropdowns when clicking outside */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Close account selector if it's open and click is outside
    if (this.isAccountSelectorOpen) {
      const selectorEl = this.elementRef.nativeElement.querySelector('.account-selector-wrap');
      if (selectorEl && !selectorEl.contains(target)) {
        this.isAccountSelectorOpen = false;
      }
    }
    // Close date dropdown if it's open and click is outside
    if (this.isDateDropdownOpen) {
      const dateEl = this.elementRef.nativeElement.querySelector('.date-filter-wrap');
      if (dateEl && !dateEl.contains(target)) {
        this.isDateDropdownOpen = false;
      }
    }
  }

  // --- API Methods ---

  loadDistributors() {
    this.isLoadingAccounts = true;
    this.ledgerService.getDistributors().subscribe({
      next: (response: ApiResponse<Distributor[]>) => {
        if (response.success && response.data) {
          this.distributors = response.data;
          this.showToast(`${this.distributors.length} distributors loaded successfully`, 'success');
        } else {
          this.showToast('Failed to load distributors: ' + response.message, 'warning');
        }
        this.isLoadingAccounts = false;
      },
      error: (error) => {
        this.showToast('Error loading distributors from server', 'danger');
        this.isLoadingAccounts = false;
      }
    });
  }

  loadPaymentHistory(distributorId: number) {
    this.ledgerService.getPaymentHistory(distributorId).subscribe({
      next: (response: ApiResponse<any>) => {
        if (this.selectedAccount) {
          const responseData = response?.data || {};
          // New response shape: { closingBalance, distributorId, paymentHistory[] }
          const payments = Array.isArray(responseData.paymentHistory)
            ? responseData.paymentHistory
            : (Array.isArray(responseData) ? responseData : []);

          // Store the API-provided closing balance
          this.apiClosingBalance = responseData.closingBalance != null
            ? Number(responseData.closingBalance)
            : null;

          if (payments.length > 0) {
            this.selectedAccount.transactions = this.mapPaymentHistoryToTransactions(payments);
            this.showToast(`${payments.length} transactions loaded`, 'success');
          }
        }
      },
      error: (error) => {
        // Keep using existing transactions if API fails
      }
    });
  }

  mapPaymentHistoryToTransactions(payments: any[]): Transaction[] {
    let runningBalance = this.selectedAccount?.openingBalance || 0;

    // Sort ascending by createdAt (oldest first) so running balance is computed correctly
    const sorted = [...(payments || [])].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });

    const transactions = sorted.map((payment: any, index: number) => {
      // Extract date from createdAt timestamp (format: YYYY-MM-DD)
      const dateStr = payment.createdAt ? payment.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Determine debit/credit based on transactionType
      const txType = (payment.transactionType || '').toUpperCase();
      const isCredit = txType === 'CREDIT' || txType === 'JV_CREDIT';
      const isDebit = txType === 'DEBIT' || txType === 'JV_DEBIT';
      const isJV = txType === 'JV';
      const amount = payment.amount || 0;
      const debit = isDebit ? amount : 0;
      const credit = (isCredit || isJV) ? amount : 0;

      // Update running balance
      runningBalance = runningBalance - debit + credit;

      return {
        id: String(payment.id || index),
        date: dateStr,
        description: payment.description || '',
        reference: `TXN-${payment.id || index}`,
        type: (isJV ? 'jv' : isCredit ? 'credit' : 'debit') as 'credit' | 'debit' | 'jv',
        debit: debit,
        credit: credit,
        balance: runningBalance,
        category: payment.transactionType || 'TRANSACTION',
        notes: payment.remarks || undefined,
        paymentMethod: undefined
      };
    });

    // Reverse so newest entry is first (descending order by date)
    return transactions.reverse();
  }

  // Map Distributor to UI LedgerAccount structure
  mapDistributorsToLedgerAccounts(distributors: Distributor[]): LedgerAccount[] {
    return distributors.map(distributor => ({
      id: distributor.id.toString(),
      name: (distributor.firmName || '') || distributor.name,
      accountCode: distributor.accountNumber,
      accountName: distributor.accountName,
      distributorId: distributor.id,
      salespersonId: undefined,
      fromParty: {
        id: 'nectar-origin',
        name: 'NECTAR ORIGIN PRIVATE LIMITED',
        address: 'Kahalzaon, Bhagalpur',
        city: 'Bhagalpur',
        state: 'Bihar',
        pincode: '813203',
        phone: '+91 9797979522',
        email: 'info@nectarorigin.com',
        gstin: 'U74999GR2016PTC032690'
      },
      toParty: {
        id: 'distributor-' + distributor.id,
        name: (distributor.firmName || '') || distributor.name,
        address: distributor.address,
        city: distributor.district || 'City',
        state: distributor.state || 'State',
        pincode: distributor.pinCode || '000000',
        phone: distributor.phoneNumber,
        email: distributor.email,
        gstin: distributor.gstNumber
      },
      openingBalance: 0,
      transactions: [], // Transactions will be loaded from API when account is selected
      distributorCreditLimit: (distributor.creditLimit ?? 0) > 0,
      distributorCreditAmount: distributor.creditLimit || 0,
      distributorCreditBalance: distributor.creditBalance || 0,
      distributorBGNumber: distributor.bankGuaranteeNumber || '',
      distributorBGExpiry: distributor.bgExpiryDate || ''
    }));
  }

  // --- Computed Properties ---

  get transactions(): Transaction[] {
    return this.selectedAccount?.transactions || [];
  }

  get filteredTransactions(): Transaction[] {
    if (!this.selectedAccount) return [];

    return this.transactions.filter(transaction => {
      // Text Search
      const searchStr = this.searchQuery.toLowerCase();
      const matchesSearch = !searchStr ||
        transaction.description.toLowerCase().includes(searchStr) ||
        transaction.reference.toLowerCase().includes(searchStr) ||
        transaction.category.toLowerCase().includes(searchStr);

      // Type Filter
      const matchesType = this.typeFilter === 'all' || transaction.type === this.typeFilter;

      // Date Range Filter
      let matchesDate = true;
      if (this.startDate || this.endDate) {
        const transDateStr = transaction.date; // assumed YYYY-MM-DD
        if (this.startDate && transDateStr < this.startDate) matchesDate = false;
        if (this.endDate && transDateStr > this.endDate) matchesDate = false;
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }

  get sortedTransactions(): Transaction[] {
    const sorted = [...this.filteredTransactions];
    sorted.sort((a, b) => {
      let compareValue = 0;
      switch (this.sortField) {
        case 'date':
          compareValue = a.date.localeCompare(b.date);
          break;
        case 'description':
          compareValue = a.description.localeCompare(b.description);
          break;
        case 'debit':
          compareValue = a.debit - b.debit;
          break;
        case 'credit':
          compareValue = a.credit - b.credit;
          break;
        case 'balance':
          compareValue = a.balance - b.balance;
          break;
      }
      return this.sortDirection === 'asc' ? compareValue : -compareValue;
    });
    return sorted;
  }

  get paginatedTransactions(): Transaction[] {
    const startIndex = (this.currentPage - 1) * this.rowsPerPage;
    const endIndex = startIndex + this.rowsPerPage;
    return this.sortedTransactions.slice(startIndex, endIndex);
  }

  get summary(): LedgerSummary {
    const filtered = this.filteredTransactions;
    const totalDebits = filtered.reduce((sum, t) => sum + t.debit, 0);
    const totalCredits = filtered.reduce((sum, t) => sum + t.credit, 0);
    const openingBalance = this.selectedAccount?.openingBalance || 0;
    // Use API-provided closing balance when available; fall back to computed value
    const closingBalance = this.apiClosingBalance != null
      ? this.apiClosingBalance
      : (filtered.length > 0 ? filtered[filtered.length - 1].balance : openingBalance);

    return {
      totalDebits,
      totalCredits,
      netBalance: totalCredits - totalDebits,
      transactionCount: filtered.length,
      openingBalance,
      closingBalance,
    };
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.searchQuery) count++;
    if (this.typeFilter !== 'all') count++;
    if (this.startDate || this.endDate) count++;
    return count;
  }

  get totalPages(): number {
    if (this.sortedTransactions.length === 0) return 1;
    return Math.ceil(this.sortedTransactions.length / this.rowsPerPage);
  }

  get dateRangeLabel(): string {
    if (this.startDate && this.endDate) {
      return `${this.formatDateShort(this.startDate)} - ${this.formatDateShort(this.endDate)}`;
    } else if (this.startDate) {
      return `From ${this.formatDateShort(this.startDate)}`;
    } else if (this.endDate) {
      return `To ${this.formatDateShort(this.endDate)}`;
    }
    return 'Date Range';
  }

  get filteredAccounts(): LedgerAccount[] {
    const accountsToFilter = this.mapDistributorsToLedgerAccounts(this.distributors);

    if (!this.accountSearchQuery.trim()) {
      return accountsToFilter;
    }
    const query = this.accountSearchQuery.toLowerCase();
    const matched = accountsToFilter.filter(account =>
      account.name.toLowerCase().includes(query) ||
      account.accountCode.toLowerCase().includes(query)
    );
    // Sort: starts-with match first, then contains
    matched.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
      return aStarts - bStarts;
    });
    return matched;
  }

  get creditUtilized(): number {
    return Math.max(0, this.apiClosingBalance ?? 0);
  }

  get creditAvailable(): number {
    const limit = this.selectedAccount?.distributorCreditAmount ?? 0;
    return Math.max(0, limit - this.creditUtilized);
  }

  get creditUsagePercent(): number {
    const limit = this.selectedAccount?.distributorCreditAmount ?? 0;
    if (limit <= 0) return 0;
    return Math.min(100, Math.round((this.creditUtilized / limit) * 100));
  }

  get newCreditLimit(): number {
    const current = this.selectedAccount?.distributorCreditAmount ?? 0;
    const add = parseFloat(this.addCreditAmount) || 0;
    return current + add;
  }


  // --- UI Actions ---

  handleSelectAccount(account: LedgerAccount) {
    this.selectedAccount = account;
    this.isAccountSelectorOpen = false;
    this.accountSearchQuery = ''; // Clear search
    // Reset filters and cached API values on new account selection
    this.resetFilters();
    this.apiClosingBalance = null;

    // Load payment history from API if distributor ID exists
    if (account.distributorId) {
      this.loadPaymentHistory(account.distributorId);
    }
  }

  handleSort(field: typeof this.sortField) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  handleViewDetails(transaction: Transaction) {
    this.selectedTransaction = transaction;
    this.isDetailsModalOpen = true;
  }

  handleDeleteTransaction() {
    this.isConfirmDeleteOpen = true;
  }

  confirmDeleteTransaction() {
    if (!this.selectedTransaction || !this.selectedAccount) {
      this.isConfirmDeleteOpen = false;
      return;
    }

    const idx = this.selectedAccount.transactions.findIndex(
      t => t.reference === this.selectedTransaction!.reference
    );

    if (idx > -1) {
      this.selectedAccount.transactions.splice(idx, 1);
      this.showToast('Transaction deleted successfully', 'success');
    }

    this.isConfirmDeleteOpen = false;
    this.isDetailsModalOpen = false;
    this.selectedTransaction = null;
  }

  cancelDelete() {
    this.isConfirmDeleteOpen = false;
  }

  handleRefresh() {
    // Refresh distributors from API
    this.loadDistributors();
  }

  handlePullRefresh(event: any) {
    this.handleRefresh();
    setTimeout(() => event.target.complete(), 1500);
  }

  handleExport() {
    if (!this.selectedAccount) {
      this.showToast('Please select an account first', 'warning');
      return;
    }

    try {
      const transactions = this.filteredTransactions;

      if (transactions.length === 0) {
        this.showToast('No transactions to export', 'warning');
        return;
      }

      // Import xlsx at runtime
      import('xlsx').then(XLSX => {
        const workbook = XLSX.utils.book_new();

        // Create company info section
        const companyData = [
          [`Account Ledger Export - ${this.selectedAccount!.name}`],
          [`Account Code: ${this.selectedAccount!.accountCode}`],
          [`Export Date: ${new Date().toLocaleString()}`],
          [],
          ['FROM PARTY:'],
          [`Name: ${this.selectedAccount!.fromParty.name}`],
          [`Address: ${this.selectedAccount!.fromParty.address}`],
          [`City: ${this.selectedAccount!.fromParty.city}, ${this.selectedAccount!.fromParty.state} - ${this.selectedAccount!.fromParty.pincode}`],
          [`Phone: ${this.selectedAccount!.fromParty.phone || 'N/A'}`],
          [`Email: ${this.selectedAccount!.fromParty.email || 'N/A'}`],
          [`GSTIN: ${this.selectedAccount!.fromParty.gstin || 'N/A'}`],
          [],
          ['TO PARTY:'],
          [`Name: ${this.selectedAccount!.toParty.name}`],
          [`Address: ${this.selectedAccount!.toParty.address}`],
          [`City: ${this.selectedAccount!.toParty.city}, ${this.selectedAccount!.toParty.state} - ${this.selectedAccount!.toParty.pincode}`],
          [`Phone: ${this.selectedAccount!.toParty.phone || 'N/A'}`],
          [`Email: ${this.selectedAccount!.toParty.email || 'N/A'}`],
          [`GSTIN: ${this.selectedAccount!.toParty.gstin || 'N/A'}`],
          [],
          [`Opening Balance: ${this.formatCurrency(this.selectedAccount!.openingBalance)}`],
          [`Total Transactions: ${transactions.length}`],
          []
        ];

        // Create header row
        const headers = ['Date', 'Reference', 'Description', 'Type', 'Category', 'Debit', 'Credit', 'Balance', 'Notes'];

        // Format transaction rows with DD/MM/YYYY date format
        const rows = transactions.map(t => [
          this.formatDateDDMMYYYY(t.date),
          t.reference,
          t.description,
          t.type,
          t.category,
          t.debit,
          t.credit,
          t.balance,
          t.notes || ''
        ]);

        // Combine company info + header + data
        const allData = [...companyData, headers, ...rows];

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(allData);

        // Set column widths
        worksheet['!cols'] = [
          { wch: 15 }, // Date
          { wch: 15 }, // Reference
          { wch: 25 }, // Description
          { wch: 12 }, // Type
          { wch: 15 }, // Category
          { wch: 15 }, // Debit
          { wch: 15 }, // Credit
          { wch: 15 }, // Balance
          { wch: 20 }  // Notes
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');

        // Generate filename
        const filename = `${this.selectedAccount!.name}_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Write file
        XLSX.writeFile(workbook, filename);

        this.showToast('Account ledger exported successfully as Excel', 'success');
      });
    } catch (error) {
      console.error('Export error:', error);
      this.showToast('Failed to export ledger', 'danger');
    }
  }

  handleExportPdf() {
    if (!this.selectedAccount) {
      this.showToast('Please select an account first', 'warning');
      return;
    }

    try {
      const transactions = this.filteredTransactions;

      if (transactions.length === 0) {
        this.showToast('No transactions to export', 'warning');
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = 297;
      const margin = 14;

      // Header section
      doc.setFillColor(26, 40, 99); // Navy
      doc.rect(margin, 10, pageW - 2 * margin, 25, 'F');

      // Company name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('ACCOUNT LEDGER STATEMENT', margin + 4, 22);

      // Account info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Account: ${this.selectedAccount.name}`, margin + 4, 30);
      doc.text(`Code: ${this.selectedAccount.accountCode}`, margin + 4, 35);

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin - 40, 22);
      if (this.startDate || this.endDate) {
        const dateLabel = `${this.startDate ? this.formatDateDDMMYYYY(this.startDate) : 'All'} to ${this.endDate ? this.formatDateDDMMYYYY(this.endDate) : 'All'}`;
        doc.text(`Period: ${dateLabel}`, pageW - margin - 40, 28);
      }

      let y = 38;

      // Party details - Two columns
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(26, 40, 99);

      // FROM PARTY
      doc.text('FROM PARTY', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      doc.text(`${this.selectedAccount.fromParty.name}`, margin, y);
      y += 4;
      doc.text(`${this.selectedAccount.fromParty.address}`, margin, y);
      y += 4;
      doc.text(`${this.selectedAccount.fromParty.city}, ${this.selectedAccount.fromParty.state} - ${this.selectedAccount.fromParty.pincode}`, margin, y);
      y += 4;
      doc.text(`Phone: ${this.selectedAccount.fromParty.phone || 'N/A'} | Email: ${this.selectedAccount.fromParty.email || 'N/A'}`, margin, y);
      y += 4;
      doc.text(`GSTIN: ${this.selectedAccount.fromParty.gstin || 'N/A'}`, margin, y);

      // TO PARTY
      const colX = pageW / 2 + 2;
      y = 38;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(26, 40, 99);
      doc.text('TO PARTY', colX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      doc.text(`${this.selectedAccount.toParty.name}`, colX, y);
      y += 4;
      doc.text(`${this.selectedAccount.toParty.address}`, colX, y);
      y += 4;
      doc.text(`${this.selectedAccount.toParty.city}, ${this.selectedAccount.toParty.state} - ${this.selectedAccount.toParty.pincode}`, colX, y);
      y += 4;
      doc.text(`Phone: ${this.selectedAccount.toParty.phone || 'N/A'} | Email: ${this.selectedAccount.toParty.email || 'N/A'}`, colX, y);
      y += 4;
      doc.text(`GSTIN: ${this.selectedAccount.toParty.gstin || 'N/A'}`, colX, y);

      y = 65;

      // Summary cards
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const summaryY = y;
      const summary = this.summary;

      // Cards styling
      doc.setFillColor(240, 244, 250);
      doc.rect(margin, summaryY, 40, 8, 'F');
      doc.setTextColor(26, 40, 99);
      doc.text('Opening Bal', margin + 1, summaryY + 5);
      doc.text(`₹ ${this.formatCurrency(summary.openingBalance)}`, margin + 1, summaryY + 7);

      doc.setFillColor(240, 244, 250);
      doc.rect(margin + 42, summaryY, 40, 8, 'F');
      doc.text('Total Debits', margin + 43, summaryY + 5);
      doc.text(`₹ ${this.formatCurrency(summary.totalDebits)}`, margin + 43, summaryY + 7);

      doc.setFillColor(240, 244, 250);
      doc.rect(margin + 84, summaryY, 40, 8, 'F');
      doc.text('Total Credits', margin + 85, summaryY + 5);
      doc.text(`₹ ${this.formatCurrency(summary.totalCredits)}`, margin + 85, summaryY + 7);

      doc.setFillColor(240, 244, 250);
      doc.rect(margin + 126, summaryY, 40, 8, 'F');
      doc.text('Closing Bal', margin + 127, summaryY + 5);
      doc.text(`₹ ${this.formatCurrency(summary.closingBalance)}`, margin + 127, summaryY + 7);

      doc.setFillColor(240, 244, 250);
      doc.rect(margin + 168, summaryY, 40, 8, 'F');
      doc.text('Net Balance', margin + 169, summaryY + 5);
      doc.text(`₹ ${this.formatCurrency(summary.netBalance)}`, margin + 169, summaryY + 7);

      y = 74;

      // Transaction table
      const tableData = transactions.map(t => [
        this.formatDateDDMMYYYY(t.date),
        t.reference,
        t.description.substring(0, 20),
        t.type.toUpperCase(),
        this.formatCurrency(t.debit),
        this.formatCurrency(t.credit),
        this.formatCurrency(t.balance),
        (t.notes || '').substring(0, 15)
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Reference', 'Description', 'Type', 'Debit', 'Credit', 'Balance', 'Notes']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [26, 40, 99],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center'
        },
        bodyStyles: {
          textColor: [50, 50, 50],
          fontSize: 7.5
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' }
        },
        margin: { left: margin, right: margin }
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      for (let i = 1; i <= pageCount; i++) {
        (doc as any).setPage(i);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'center' }
        );
      }

      // Generate PDF
      const filename = `${this.selectedAccount.name}_Ledger_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      this.showToast('Account ledger exported successfully as PDF', 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      this.showToast('Failed to export ledger as PDF', 'danger');
    }
  }

  // Format date as DD/MM/YYYY
  private formatDateDDMMYYYY(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  applyDateFilter() {
    this.isDateDropdownOpen = false;
    this.currentPage = 1; // Reset to page 1
  }

  clearDateFilter(e: Event) {
    e.stopPropagation();
    this.startDate = '';
    this.endDate = '';
    this.isDateDropdownOpen = false;
    this.currentPage = 1;
  }

  exportLedgerStatementPdf() {
    if (!this.selectedAccount) {
      this.showToast('Please select an account first', 'warning');
      return;
    }

    try {
      const transactions = this.filteredTransactions;

      if (transactions.length === 0) {
        this.showToast('No transactions to export', 'warning');
        return;
      }

      const rows: LedgerStatementRow[] = transactions.map(t => ({
        date: this.formatDateDDMMYYYY(t.date),
        reference: t.reference,
        description: t.description,
        type: t.type === 'debit' ? 'DEBIT' : 'CREDIT',
        debit: t.debit || 0,
        credit: t.credit || 0,
        balance: t.balance || 0,
      }));

      const doc = generateLedgerStatementPdf(
        this.selectedAccount.accountName,
        this.selectedAccount.toParty.name,
        `${this.selectedAccount.toParty.address}, ${this.selectedAccount.toParty.city}`,
        this.selectedAccount.toParty.phone || '',
        this.selectedAccount.toParty.email || '',
        rows,
        null, // logo URL can be added later
      );

      const filename = `${this.selectedAccount.name}_Ledger_Statement_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      this.showToast('Ledger statement exported successfully', 'success');
    } catch (error) {
      console.error('Ledger statement export error:', error);
      this.showToast('Failed to export ledger statement', 'danger');
    }
  }

  handleClearFilters() {
    this.resetFilters();
    this.showToast('All filters cleared');
  }

  resetFilters() {
    this.searchQuery = '';
    this.typeFilter = 'all';
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
  }

  changePage(delta: number) {
    const newPage = this.currentPage + delta;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  // --- Transaction Addition Logic (Update Balance) ---
  handleAddTransaction() {
    if (!this.selectedAccount || !this.selectedAccount.distributorId) return;

    const { date, balanceType, description, reference, amount, paymentMethod, utrNumber, bankName, chequeNumber, transactionNumber, notes } = this.formData;

    if (!description || !reference || !amount) {
      this.showToast('Please fill required fields', 'danger');
      return;
    }

    // Validate payment method specific fields (only if payment method is selected)
    if (paymentMethod) {
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
    }

    const parsedAmount = parseFloat(amount);
    const isDebit = balanceType === 'debit';
    const debit = isDebit ? parsedAmount : 0;
    const credit = (balanceType === 'credit' || balanceType === 'jv') ? parsedAmount : 0;
    const transactionType = balanceType === 'jv' ? 'JV' : balanceType.toUpperCase(); // 'CREDIT', 'DEBIT', or 'JV'

    // Call API to update balance
    this.ledgerService.updateBalance(
      this.selectedAccount.distributorId,
      parsedAmount,
      description,
      transactionType,
      date ? `${date}T00:00:00` : undefined
    ).subscribe({
      next: (response: ApiResponse<any>) => {
        
        // Success if response is received without error (HTTP 200)
        // Check success flag if it exists, otherwise treat as success
        const isSuccess = response.success !== false;
        
        if (isSuccess && this.selectedAccount) {
          // Calculate new balance based on the last transaction
          const lastTransaction = this.transactions[this.transactions.length - 1];
          const previousBalance = lastTransaction ? lastTransaction.balance : this.selectedAccount.openingBalance;
          const newBalance = previousBalance - debit + credit;

          const newTransaction: Transaction = {
            id: 'TEMP_' + new Date().getTime(),
            date: date,
            description,
            reference,
            type: balanceType as 'credit' | 'debit' | 'jv',
            debit,
            credit,
            balance: newBalance,
            category: paymentMethod ? paymentMethod.toUpperCase() : 'ADJUSTMENT',
            notes: notes || undefined,
            paymentMethod: paymentMethod as Transaction['paymentMethod'],
            utrNumber: utrNumber || undefined,
            bankName: bankName || undefined,
            chequeNumber: chequeNumber || undefined,
            transactionNumber: transactionNumber || undefined,
            receiptUrl: this.receiptFile ? URL.createObjectURL(this.receiptFile) : undefined
          };

          // Add to the master list
          this.selectedAccount.transactions.push(newTransaction);

          this.showToast('Payment is updated', 'success');
          this.isFormModalOpen = false;
          this.resetForm();
          // Go to the last page to see the new transaction
          this.currentPage = this.totalPages;
        } else {
          this.showToast(response?.message || 'Failed to update balance', 'danger');
        }
      },
      error: (error: any) => {
        this.showToast(error?.error?.message || error?.message || 'Error updating balance', 'danger');
      }
    });
  }

  // Receipt file handling
  onReceiptSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.receiptFile = input.files[0];
      this.receiptFileName = input.files[0].name;
    }
  }

  removeReceipt() {
    this.receiptFile = null;
    this.receiptFileName = '';
  }

  viewReceipt(transaction: Transaction) {
    if (transaction.receiptUrl) {
      window.open(transaction.receiptUrl, '_blank');
    }
  }

  // Approve PI
  handleApprovePI() {
    if (!this.selectedAccount || !this.selectedAccount.distributorId) {
      this.showToast('Please select an account first', 'warning');
      return;
    }

    const accountId = this.selectedAccount.id;
    const distributorId = this.selectedAccount.distributorId;
    // Use account's salespersonId, or fallback to logged-in user's ID
    const userId = localStorage.getItem('auth_user_id');
    const salespersonId = this.selectedAccount.salespersonId || (userId ? Number(userId) : null);

    if (!salespersonId) {
      this.showToast('User ID not found. Please login again.', 'warning');
      return;
    }

    this.ledgerService.approvePI(Number(accountId), distributorId, salespersonId).subscribe({
      next: (response: any) => {
        this.showToast('PI approved successfully', 'success');
      },
      error: (error: any) => {
        this.showToast(error?.error?.message || 'Error approving PI', 'danger');
      }
    });
  }

  // Ready to Dispatch
  confirmReadyToDispatch() {
    this.isDispatchModalOpen = false;
    this.showToast('Order marked as Ready to Dispatch!', 'success');
    // Wait for the modal dismiss animation to finish before navigating
    // to prevent Ionic page transition conflicts that cause the UI to get stuck
    setTimeout(() => {
      this.navCtrl.navigateForward('/dispatch');
    }, 350);
  }

  // Fetch Pending Payments
  fetchPendingPayments() {
    if (!this.selectedAccount || !this.selectedAccount.distributorId) {
      this.showToast('Please select an account first', 'warning');
      return;
    }

    this.isLoadingPayments = true;
    console.log('💳 Fetching pending payments for distributorId:', this.selectedAccount.distributorId);
    
    this.ledgerService.getPendingPayments(this.selectedAccount.distributorId).subscribe({
      next: (response: any) => {
        console.log('✅ Pending payments fetched:', response);
        this.pendingPayments = response;
        this.isPendingPaymentsModalOpen = true;
        this.isLoadingPayments = false;
      },
      error: (error: any) => {
        console.error('❌ Error fetching pending payments:', error);
        this.showToast('Error fetching pending payments', 'danger');
        this.isLoadingPayments = false;
      }
    });
  }

  // Approve Single Payment
  approveSinglePayment(payment: any) {
    const userId = localStorage.getItem('auth_user_id');
    if (!userId) {
      this.showToast('User ID not found. Please login again.', 'warning');
      return;
    }

    console.log('💰 Approving payment:', payment, 'by user:', userId);
    
    this.ledgerService.approvePayment(payment.id, Number(userId)).subscribe({
      next: (response: any) => {
        console.log('✅ Payment approved:', response);
        this.showToast(response?.message || 'Payment approved successfully', 'success');
        // Remove approved payment from list
        this.pendingPayments = this.pendingPayments.filter(p => p.id !== payment.id);
      },
      error: (error: any) => {
        console.error('❌ Error approving payment:', error);
        this.showToast(error?.error?.message || error?.message || 'Error approving payment', 'danger');
      }
    });
  }

  // Approve All Payments
  approveAllPayments() {
    if (this.pendingPayments.length === 0) {
      this.showToast('No payments to approve', 'warning');
      return;
    }

    const userId = localStorage.getItem('auth_user_id');
    if (!userId) {
      this.showToast('User ID not found. Please login again.', 'warning');
      return;
    }

    console.log('💰 Approving all payments by user:', userId);
    let approvedCount = 0;
    const totalPayments = this.pendingPayments.length;

    this.pendingPayments.forEach(payment => {
      this.ledgerService.approvePayment(payment.id, Number(userId)).subscribe({
        next: () => {
          approvedCount++;
          if (approvedCount === totalPayments) {
            this.showToast(`All ${totalPayments} payments approved successfully`, 'success');
            this.pendingPayments = [];
            this.isPendingPaymentsModalOpen = false;
          }
        },
        error: () => {
          this.showToast('Error approving some payments', 'danger');
        }
      });
    });
  }

  // Download Proforma Invoice
  downloadProformaInvoice() {
    this.showToast('Downloading Proforma Invoice...', 'success');
    // TODO: API call to download PI
  }


  // --- Utility Methods for Template ---

  formatCurrency(amount: number): string {
    // Matches the image format: ₹58,500.00
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  // For table display (e.g., "Jan 1, 2024")
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Format amount for proforma invoices
  formatAmount(amount: number): string {
    return this.formatCurrency(amount);
  }

  // For filter labels (e.g., "Jan 1")
  formatDateShort(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Get styling and labels for transaction type badges
  getTransactionTypeConfig(type: Transaction['type']) {
    const config: Record<string, { label: string; className: string; icon: string }> = {
      purchase: { label: 'Purchase', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'cart-outline' },
      sale: { label: 'Sale', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'cash-outline' },
      return: { label: 'Return', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'return-up-back-outline' },
      adjustment: { label: 'Adjustment', className: 'bg-gray-50 text-gray-700 border-gray-300', icon: 'settings-sharp' },
      opening: { label: 'Opening', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'folder-open-outline' },
      credit: { label: 'Credit', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'arrow-up-outline' },
      debit: { label: 'Debit', className: 'bg-red-50 text-red-700 border-red-200', icon: 'arrow-down-outline' },
    };
    return config[type] || config['adjustment'];
  }

  generateReference() {
    const prefix = this.formData.balanceType === 'credit' ? 'CR' : 'DR';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.formData.reference = `${prefix}-${randomNum}`;
  }

  resetForm() {
    this.formData = {
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      balanceType: 'credit',
      description: '',
      reference: '',
      amount: '',
      paymentMethod: '',
      utrNumber: '',
      bankName: '',
      chequeNumber: '',
      transactionNumber: '',
      notes: ''
    };
    this.receiptFile = null;
    this.receiptFileName = '';
  }

  async showToast(message: string, color: string = 'success') {
    const validColors: ('success' | 'danger' | 'warning')[] = ['success', 'danger', 'warning'];
    const mapped = validColors.includes(color as any)
      ? (color as 'success' | 'danger' | 'warning')
      : 'success';
    await this.toastSvc.present(message, mapped);
  }

  // ── Proforma Invoices ─────────────────────────────
  loadProformaInvoices() {
    this.isLoadingInvoices = true;

    this.proformaInvoiceService.getAllInvoices().subscribe({
      next: (data) => {
        this.proformaInvoices = data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        // Separate paid and pending invoices
        this.paidInvoices = this.proformaInvoices.filter(inv => inv.paymentStatus === 'PAID').slice(0, 6);
        this.pendingInvoices = this.proformaInvoices.filter(inv => inv.paymentStatus === 'PENDING').slice(0, 6);
        this.isLoadingInvoices = false;
      },
      error: (error) => {
        this.isLoadingInvoices = false;
      }
    });
  }

  downloadInvoicePdf(invoice: ProformaInvoice) {
    if (invoice.paymentStatus !== 'PAID') {
      return;
    }

    this.downloadingInvoiceId = invoice.id;

    this.proformaInvoiceService.downloadInvoicePdf(invoice.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invoice.piNumber}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.downloadingInvoiceId = null;
      },
      error: (error) => {
        this.downloadingInvoiceId = null;
      }
    });
  }

  // ── Journal Voucher Methods ──────────────────────
  openJVModal() {
    console.log('🟦 openJVModal() - Opening JV Modal');
    this.isJVModalOpen = true;
    this.resetJVForm();
    // Prefill first entry with selected distributor's account details
    if (this.selectedAccount) {
      this.jvFormData.entries[0].accountNumber = this.selectedAccount.accountCode || '';
      this.jvFormData.entries[0].accountName = this.selectedAccount.accountName || this.selectedAccount.name || '';
    }
  }

  // ── Add Credit Methods ──────────────────────
  openAddCreditModal() {
    if (!this.selectedAccount) {
      this.showToast('Please select an account first', 'warning');
      return;
    }
    this.addCreditAmount = '';
    this.isAddCreditModalOpen = true;
  }

  submitAddCredit() {
    if (!this.selectedAccount || !this.selectedAccount.distributorId) return;

    const amount = parseFloat(this.addCreditAmount);
    if (!amount || amount <= 0) {
      this.showToast('Please enter a valid credit amount', 'danger');
      return;
    }

    this.isSubmittingCredit = true;
    this.ledgerService.addCredit(this.selectedAccount.distributorId, amount).subscribe({
      next: (response: any) => {
        if (response?.status !== 'error') {
          if (this.selectedAccount) {
            const newLimit = (this.selectedAccount.distributorCreditAmount ?? 0) + amount;
            this.selectedAccount.distributorCreditAmount = newLimit;
            // Sync the distributor list entry too
            const dist = this.distributors.find(d => d.id === this.selectedAccount!.distributorId);
            if (dist) dist.creditLimit = newLimit;
          }
          this.showToast(response?.message || `Credit of ₹${amount.toLocaleString('en-IN')} added successfully`, 'success');
          this.isAddCreditModalOpen = false;
          this.addCreditAmount = '';
        } else {
          this.showToast(response?.message || 'Failed to add credit', 'danger');
        }
        this.isSubmittingCredit = false;
      },
      error: (error: any) => {
        this.showToast(error?.error?.message || 'Error adding credit', 'danger');
        this.isSubmittingCredit = false;
      }
    });
  }

  closeJVModal() {
    console.log('🔴 closeJVModal() - Closing JV Modal');
    this.isJVModalOpen = false;
    this.resetJVForm();
  }

  resetJVForm() {
    this.jvFormData = {
      entries: [
        { accountNumber: '', accountName: '', description: '', debit: '', credit: '' }
      ],
      narration: ''
    };
    this.isSubmittingJV = false;
  }

  addJVEntry() {
    this.jvFormData.entries.push({
      accountNumber: '',
      accountName: '',
      description: '',
      debit: '',
      credit: ''
    });
  }

  removeJVEntry(index: number) {
    if (this.jvFormData.entries.length > 1) {
      this.jvFormData.entries.splice(index, 1);
    } else {
      this.showToast('At least one entry is required', 'warning');
    }
  }

  submitJVForm() {
    console.log('🔵 submitJVForm() called');
    console.log('📋 JV Form Data:', this.jvFormData);
    
    // Validation
    if (!this.jvFormData.narration.trim()) {
      this.showToast('Narration is required', 'warning');
      return;
    }

    if (this.jvFormData.entries.length === 0) {
      this.showToast('At least one entry is required', 'warning');
      return;
    }

    // Validate all entries
    for (let i = 0; i < this.jvFormData.entries.length; i++) {
      const entry = this.jvFormData.entries[i];
      console.log(`\ud83d\udd0d Validating Entry ${i + 1}:`, entry);
      
      if (!entry.accountNumber.trim()) {
        console.warn(`\u274c Entry ${i + 1}: Missing Account Number`);
        this.showToast(`Entry ${i + 1}: Account Number is required`, 'warning');
        return;
      }
      if (!entry.accountName.trim()) {
        console.warn(`\u274c Entry ${i + 1}: Missing Account Name`);
        this.showToast(`Entry ${i + 1}: Account Name is required`, 'warning');
        return;
      }
      
      // Parse values properly
      const debitValue = entry.debit ? parseFloat(entry.debit.toString()) : 0;
      const creditValue = entry.credit ? parseFloat(entry.credit.toString()) : 0;
      
      // Check that at least one side has a value
      if (debitValue === 0 && creditValue === 0) {
        this.showToast(`Entry ${i + 1}: Either Debit or Credit is required`, 'warning');
        return;
      }
      
      // Check that both sides don't have values
      if (debitValue > 0 && creditValue > 0) {
        this.showToast(`Entry ${i + 1}: Cannot have both Debit and Credit`, 'warning');
        return;
      }
    }

    console.log('✅ All validations passed!');
    // Prepare payload
    const payload = {
      entries: this.jvFormData.entries.map(entry => {
        const debitVal = entry.debit ? parseFloat(entry.debit.toString()) : 0;
        const creditVal = entry.credit ? parseFloat(entry.credit.toString()) : 0;
        const transactionType = debitVal > 0 ? 'DEBIT' : 'CREDIT';
        return {
          accountNumber: entry.accountNumber,
          accountName: entry.accountName,
          description: entry.description,
          debit: debitVal,
          credit: creditVal,
          transactionType
        };
      }),
      narration: this.jvFormData.narration
    };

    console.log('🔵 Creating Journal Voucher with payload:', payload);
    this.isSubmittingJV = true;

    // Validate distributor ID
    if (!this.selectedAccount || !this.selectedAccount.distributorId) {
      this.showToast('Distributor ID is required', 'warning');
      this.isSubmittingJV = false;
      return;
    }

    const distributorId = this.selectedAccount.distributorId;
    // Call service to create JV
    this.ledgerService.createJournalVoucher(payload, distributorId).subscribe({
      next: (response) => {
        console.log('✅ Create JV Success Response:', response);
        console.log('Response Message:', response.message);
        this.showToast(response?.message || 'Journal Voucher created successfully', 'success');
        this.isJVModalOpen = false;
        this.resetJVForm();
        this.isSubmittingJV = false;
        // Reload payment history for the same distributor
        this.loadPaymentHistory(distributorId!);
      },
      error: (error) => {
        console.error('❌ Create JV Error:', error);
        console.error('Error Status:', error?.status);
        console.error('Error Message:', error?.message);
        console.error('Error Body:', error?.error);
        const errorMsg = error?.error?.message || error?.message || error?.error?.msg || 'Failed to create Journal Voucher';
        this.showToast(errorMsg, 'danger');
        this.isSubmittingJV = false;
      },
      complete: () => {
        console.log('✔️ API Request Completed');
      }
    });
  }

  // ── View Journal Vouchers Methods ──────────────────────
  openJVListModal() {
    console.log('🟦 openJVListModal() - Opening JV List Modal');
    if (!this.selectedAccount || !this.selectedAccount.distributorId) {
      this.showToast('Please select an account first', 'warning');
      return;
    }
    this.isJVListModalOpen = true;
    this.fetchJournalVouchers();
  }

  closeJVListModal() {
    console.log('🔴 closeJVListModal() - Closing JV List Modal');
    this.isJVListModalOpen = false;
    this.selectedJV = null;
  }

  fetchJournalVouchers() {
    if (!this.selectedAccount || !this.selectedAccount.distributorId) return;

    console.log('💳 Fetching journal vouchers for distributorId:', this.selectedAccount.distributorId);
    this.isLoadingJVs = true;

    this.ledgerService.getJournalVouchersByDistributor(this.selectedAccount.distributorId).subscribe({
      next: (response: any) => {
        console.log('✅ Journal Vouchers Fetched:', response);
        this.journalVouchers = Array.isArray(response) ? response : response?.data || [];
        this.isLoadingJVs = false;
      },
      error: (error) => {
        console.error('❌ Error Fetching JVs:', error);
        this.showToast('Failed to fetch journal vouchers', 'danger');
        this.isLoadingJVs = false;
      }
    });
  }

  viewJVDetails(jv: any) {
    console.log('👁️ Viewing JV Details:', jv);
    this.selectedJV = jv;
  }
}
