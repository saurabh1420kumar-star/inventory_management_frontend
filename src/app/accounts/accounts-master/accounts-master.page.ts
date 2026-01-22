import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
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
  funnelOutline
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
  type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'opening';
  debit: number;
  credit: number;
  balance: number;
  category: string;
  notes?: string;
}

interface LedgerAccount {
  id: string;
  name: string;
  accountCode: string;
  fromParty: Party;
  toParty: Party;
  openingBalance: number;
  transactions: Transaction[];
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
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
  ],
})
export class AccountsMasterPage implements OnInit {
  Math = Math; // Expose Math to template

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
  isTypeDropdownOpen: boolean = false;
  isDateDropdownOpen: boolean = false;

  // Modal states
  isFormModalOpen: boolean = false;
  isDetailsModalOpen: boolean = false;
  selectedTransaction: Transaction | null = null;

  // Form data for new transaction
  formData = {
    date: new Date().toISOString().split('T')[0],
    type: 'purchase' as Transaction['type'],
    description: '',
    reference: '',
    amount: '',
    category: '',
    notes: ''
  };

  categories = [
    'Product Sales', 'Services', 'Office Supplies', 'Returns', 'Adjustments', 'Opening', 'Other'
  ];

  // Mock Data - Updated to exactly match Image 1 & 2
  ledgerAccounts: LedgerAccount[] = [
    {
      id: '1',
      name: 'Acme Corporation',
      accountCode: 'ACC-001',
      fromParty: {
        id: 'p1',
        name: 'Your Company Pvt. Ltd.',
        address: '123, Business Park, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        phone: '+91 120 4567890',
        email: 'accounts@yourcompany.com',
        gstin: '09AAACY1234F1Z5',
      },
      toParty: {
        id: 'p2',
        name: 'Acme Corporation',
        address: '456, Industrial Area, Phase II',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122001',
        phone: '+91 124 9876543',
        email: 'billing@acme.com',
        gstin: '06AABCA5678K1Z3',
      },
      openingBalance: 50000,
      transactions: [
        {
          id: '1',
          date: '2024-01-01',
          description: 'Opening Balance',
          reference: 'OB-2024',
          type: 'opening',
          debit: 0,
          credit: 50000.00,
          balance: 50000.00,
          category: 'Opening'
        },
        {
          id: '2',
          date: '2024-01-08',
          description: 'Sale - Product Bundle A',
          reference: 'INV-1001',
          type: 'sale',
          debit: 0,
          credit: 8500.00,
          balance: 58500.00,
          category: 'Product Sales'
        },
        {
          id: '3',
          date: '2024-01-18',
          description: 'Return - Defective Items',
          reference: 'RET-001',
          type: 'return',
          debit: 850.00,
          credit: 0,
          balance: 57650.00,
          category: 'Returns'
        },
      ],
    }
  ];

  constructor(private toastController: ToastController) {
    // Add specific icons shown in the images
    addIcons({
      'book-outline': bookOutline,
      'settings-outline': settingsOutline,
      'refresh-outline': refreshOutline,
      'add-outline': addOutline,
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
      'swap-vertical-outline': scaleOutline, // Net Balance (using scale as swap isn't exact match but close)
      'analytics-outline': analyticsOutline, // Closing Balance waveform
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
      'copy-outline': copyOutline
    });
  }

  ngOnInit() {
    // Uncomment below to auto-select the account on load for development purposes
    // if (this.ledgerAccounts.length > 0) {
    //   this.handleSelectAccount(this.ledgerAccounts[0]);
    // }
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


  // --- UI Actions ---

  handleSelectAccount(account: LedgerAccount) {
    this.selectedAccount = account;
    this.isAccountSelectorOpen = false;
    // Reset filters on new account selection
    this.resetFilters();
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

  handleRefresh() {
    // Simulate refresh
    this.showToast('Data refreshed successfully', 'success');
  }

  handleExport() {
    this.showToast('Exporting data...', 'primary');
    // Actual export logic omitted for brevity
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

  // --- Transaction Addition Logic (Simplified) ---
  handleAddTransaction() {
    if (!this.selectedAccount) return;

    const { date, type, description, reference, amount, category, notes } = this.formData;

    if (!description || !reference || !amount || !category) {
      this.showToast('Please fill required fields', 'danger');
      return;
    }

    const parsedAmount = parseFloat(amount);
    const isDebit = ['purchase', 'adjustment', 'return'].includes(type);
    const debit = isDebit ? parsedAmount : 0;
    const credit = !isDebit ? parsedAmount : 0;

    // Calculate new balance based on the *absolute last* transaction in the unfiltered list
    const lastTransaction = this.transactions[this.transactions.length - 1];
    const previousBalance = lastTransaction ? lastTransaction.balance : this.selectedAccount.openingBalance;
    const newBalance = previousBalance - debit + credit;

    const newTransaction: Transaction = {
      id: 'TEMP_' + new Date().getTime(),
      date: date, // Already in YYYY-MM-DD format from input type="date"
      description,
      reference,
      type,
      debit,
      credit,
      balance: newBalance,
      category,
      notes: notes || undefined
    };

    // Add to the master list
    this.selectedAccount.transactions.push(newTransaction);

    this.showToast('Transaction added successfully', 'success');
    this.isFormModalOpen = false;
    this.resetForm();
    // Go to the last page to see the new transaction
    this.currentPage = this.totalPages;
  }


  // --- Utility Methods for Template ---

  formatCurrency(amount: number): string {
    // Matches the image format: $58,500.00
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
    const config = {
      purchase: { label: 'Purchase', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'cart-outline' },
      sale: { label: 'Sale', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'cash-outline' },
      return: { label: 'Return', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'return-up-back-outline' },
      adjustment: { label: 'Adjustment', className: 'bg-gray-50 text-gray-700 border-gray-300', icon: 'settings-sharp' },
      opening: { label: 'Opening', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'folder-open-outline' },
    };
    return config[type] || config['adjustment'];
  }

  generateReference() {
    const prefix = this.formData.type.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.formData.reference = `${prefix}-${randomNum}`;
  }

  resetForm() {
    this.formData = {
      date: new Date().toISOString().split('T')[0],
      type: 'purchase',
      description: '',
      reference: '',
      amount: '',
      category: '',
      notes: ''
    };
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
      cssClass: 'text-sm'
    });
    toast.present();
  }
}