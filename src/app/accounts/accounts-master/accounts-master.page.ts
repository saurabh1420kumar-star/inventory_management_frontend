import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, ElementRef, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { LedgerService, LedgerDto, ApiResponse, Distributor } from '../../services/accountsLedger.service';
import { Auth } from '../../services/auth';
import { Toast as ToastService } from '../../services/toast';
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
  type:  'credit' | 'debit';
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
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage: number = 1;
  rowsPerPage: number = 10;
  rowsPerPageOptions = [5, 10, 25, 50];

  // UI State toggles
  isAccountSelectorOpen: boolean = false;
  accountSearchQuery: string = '';
  isTypeDropdownOpen: boolean = false;
  isDateDropdownOpen: boolean = false;

  // Modal states
  isFormModalOpen: boolean = false;
  isDetailsModalOpen: boolean = false;
  isConfirmDeleteOpen: boolean = false;
  selectedTransaction: Transaction | null = null;

  // Form data for new transaction (Update Balance)
  formData = {
    date: new Date().toISOString().split('T')[0],
    balanceType: 'credit' as 'credit' | 'debit',
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
    private elementRef: ElementRef,
    private toastSvc: ToastService,
    private auth: Auth
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
          console.log('Distributors loaded successfully:', this.distributors);
          this.showToast(`${this.distributors.length} distributors loaded successfully`, 'success');
        } else {
          this.showToast('Failed to load distributors: ' + response.message, 'warning');
        }
        this.isLoadingAccounts = false;
      },
      error: (error) => {
        console.error('Error loading distributors:', error);
        this.showToast('Error loading distributors from server', 'danger');
        this.isLoadingAccounts = false;
      }
    });
  }

  loadPaymentHistory(distributorId: number) {
    this.ledgerService.getPaymentHistory(distributorId).subscribe({
      next: (response: ApiResponse<any>) => {
        if (this.selectedAccount) {
          // API returns array directly or wrapped in data property
          const payments = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
          
          if (payments.length > 0) {
            this.selectedAccount.transactions = this.mapPaymentHistoryToTransactions(payments);
            console.log('Payment history loaded:', this.selectedAccount.transactions);
            this.showToast(`${payments.length} transactions loaded`, 'success');
          } else {
            console.log('No payment history found');
          }
        }
      },
      error: (error) => {
        console.error('Error loading payment history:', error);
        // Keep using existing transactions if API fails
      }
    });
  }

  mapPaymentHistoryToTransactions(payments: any[]): Transaction[] {
    let runningBalance = this.selectedAccount?.openingBalance || 0;
    
    return (payments || []).map((payment: any, index: number) => {
      // Extract date from createdAt timestamp (format: YYYY-MM-DD)
      const dateStr = payment.createdAt ? payment.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Determine debit/credit based on transactionType
      const isCredit = payment.transactionType?.toUpperCase() === 'CREDIT';
      const debit = isCredit ? 0 : (payment.amount || 0);
      const credit = isCredit ? (payment.amount || 0) : 0;
      
      // Update running balance
      runningBalance = runningBalance - debit + credit;
      
      return {
        id: String(payment.id || index),
        date: dateStr,
        description: payment.description || '',
        reference: `TXN-${payment.id || index}`,
        type: isCredit ? 'credit' : 'debit',
        debit: debit,
        credit: credit,
        balance: runningBalance,
        category: payment.transactionType || 'TRANSACTION',
        notes: payment.remarks || undefined,
        paymentMethod: undefined
      };
    });
  }

  // Map Distributor to UI LedgerAccount structure
  mapDistributorsToLedgerAccounts(distributors: Distributor[]): LedgerAccount[] {
    return distributors.map(distributor => ({
      id: distributor.id.toString(),
      name: distributor.name,
      accountCode: distributor.accountNumber,
      accountName: distributor.accountName,
      distributorId: distributor.id,
      salespersonId: undefined,
      fromParty: {
        id: 'company-nectar',
        name: 'Nectar private limited',
        address: 'Company Address',
        city: 'City',
        state: 'State',
        pincode: '000000',
        phone: '+91 000 0000000',
        email: 'company@example.com',
        gstin: 'GSTIN000000'
      },
      toParty: {
        id: 'distributor-' + distributor.id,
        name: distributor.name,
        address: distributor.address,
        city: 'City',
        state: 'State',
        pincode: '000000',
        phone: distributor.phoneNumber,
        email: distributor.email,
        gstin: distributor.gstNumber
      },
      openingBalance: 0,
      transactions: [] // Transactions will be loaded from API when account is selected
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
    // Closing balance is the balance of the last transaction in the filtered list
    const closingBalance = filtered.length > 0 ? filtered[filtered.length - 1].balance : openingBalance;

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
    // Use distributors
    const accountsToFilter = this.mapDistributorsToLedgerAccounts(this.distributors);

    if (!this.accountSearchQuery.trim()) {
      return accountsToFilter;
    }
    const query = this.accountSearchQuery.toLowerCase();
    return accountsToFilter.filter(account =>
      account.name.toLowerCase().includes(query) ||
      account.accountCode.toLowerCase().includes(query)
    );
  }


  // --- UI Actions ---

  handleSelectAccount(account: LedgerAccount) {
    this.selectedAccount = account;
    this.isAccountSelectorOpen = false;
    this.accountSearchQuery = ''; // Clear search
    // Reset filters on new account selection
    this.resetFilters();
    
    // Load payment history from API if distributor ID exists
    if (account.distributorId) {
      this.loadPaymentHistory(account.distributorId);
    }
    
    this.showToast(`Selected ${account.name}`);
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

      // Company Information Header
      const companyInfo = [
        `Account Ledger Export - ${this.selectedAccount.name}`,
        `Account Code: ${this.selectedAccount.accountCode}`,
        `Export Date: ${new Date().toLocaleString()}`,
        '',
        'FROM PARTY:',
        `Name: ${this.selectedAccount.fromParty.name}`,
        `Address: ${this.selectedAccount.fromParty.address}`,
        `City: ${this.selectedAccount.fromParty.city}, ${this.selectedAccount.fromParty.state} - ${this.selectedAccount.fromParty.pincode}`,
        `Phone: ${this.selectedAccount.fromParty.phone || 'N/A'}`,
        `Email: ${this.selectedAccount.fromParty.email || 'N/A'}`,
        `GSTIN: ${this.selectedAccount.fromParty.gstin || 'N/A'}`,
        '',
        'TO PARTY:',
        `Name: ${this.selectedAccount.toParty.name}`,
        `Address: ${this.selectedAccount.toParty.address}`,
        `City: ${this.selectedAccount.toParty.city}, ${this.selectedAccount.toParty.state} - ${this.selectedAccount.toParty.pincode}`,
        `Phone: ${this.selectedAccount.toParty.phone || 'N/A'}`,
        `Email: ${this.selectedAccount.toParty.email || 'N/A'}`,
        `GSTIN: ${this.selectedAccount.toParty.gstin || 'N/A'}`,
        '',
        `Opening Balance: ${this.formatCurrency(this.selectedAccount.openingBalance)}`,
        `Total Transactions: ${transactions.length}`,
        '',
        ''
      ];

      const headers = ['Date', 'Reference', 'Description', 'Type', 'Category', 'Debit', 'Credit', 'Balance', 'Notes'];

      const rows = transactions.map(t => [
        t.date,
        t.reference,
        t.description,
        t.type,
        t.category,
        t.debit.toString(),
        t.credit.toString(),
        t.balance.toString(),
        t.notes || ''
      ]);

      const csvContent = [
        ...companyInfo,
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${this.selectedAccount.name}_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showToast('Transactions exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      this.showToast('Failed to export transactions', 'danger');
    }
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
    const credit = !isDebit ? parsedAmount : 0;
    const transactionType = balanceType.toUpperCase(); // 'CREDIT' or 'DEBIT'

    // Call API to update balance
    this.ledgerService.updateBalance(
      this.selectedAccount.distributorId,
      parsedAmount,
      description,
      transactionType
    ).subscribe({
      next: (response: ApiResponse<any>) => {
        console.log('Update Balance Response:', response);
        
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
            type: balanceType,
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

          this.showToast(response?.message || 'Balance updated successfully', 'success');
          this.isFormModalOpen = false;
          this.resetForm();
          // Go to the last page to see the new transaction
          this.currentPage = this.totalPages;
        } else {
          this.showToast(response?.message || 'Failed to update balance', 'danger');
        }
      },
      error: (error: any) => {
        console.error('Error updating balance:', error);
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
        console.log('Approve PI Response:', response);
      },
      error: (error: any) => {
        console.error('Error approving PI:', error);
        this.showToast(error?.error?.message || 'Error approving PI', 'danger');
      }
    });
  }

  // Ready to Dispatch
  confirmReadyToDispatch() {
    this.isDispatchModalOpen = false;
    this.showToast('Order marked as Ready to Dispatch!', 'success');
    // TODO: API call to mark as ready to dispatch
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
      date: new Date().toISOString().split('T')[0],
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
}
