import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, ElementRef, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { LedgerService, LedgerDto, ApiResponse } from '../../services/accountsLedger.service';
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
  receiptOutline
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
  apiAccounts: LedgerDto[] = [];
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
        name: 'Nectar private limited',
        address: '123, Business Park, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        phone: '+91 120 4567890',
        email: 'accounts@nectar.com',
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
        {
          id: '4',
          date: '2024-01-25',
          description: 'Sale - Electronics Package',
          reference: 'INV-1002',
          type: 'sale',
          debit: 0,
          credit: 15200.00,
          balance: 72850.00,
          category: 'Product Sales'
        },
        {
          id: '5',
          date: '2024-02-02',
          description: 'Purchase - Raw Materials',
          reference: 'PO-2001',
          type: 'purchase',
          debit: 22000.00,
          credit: 0,
          balance: 50850.00,
          category: 'Office Supplies'
        },
        {
          id: '6',
          date: '2024-02-10',
          description: 'Sale - Software License',
          reference: 'INV-1003',
          type: 'sale',
          debit: 0,
          credit: 35000.00,
          balance: 85850.00,
          category: 'Services'
        },
        {
          id: '7',
          date: '2024-02-18',
          description: 'Adjustment - Inventory Correction',
          reference: 'ADJ-001',
          type: 'adjustment',
          debit: 1200.00,
          credit: 0,
          balance: 84650.00,
          category: 'Adjustments'
        },
        {
          id: '8',
          date: '2024-02-25',
          description: 'Sale - Hardware Components',
          reference: 'INV-1004',
          type: 'sale',
          debit: 0,
          credit: 18500.00,
          balance: 103150.00,
          category: 'Product Sales'
        },
      ],
    },
    {
      id: '2',
      name: 'TechFlow Solutions',
      accountCode: 'ACC-002',
      fromParty: {
        id: 'p1',
        name: 'Nectar private limited',
        address: '123, Business Park, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        phone: '+91 120 4567890',
        email: 'accounts@nectar.com',
        gstin: '09AAACY1234F1Z5',
      },
      toParty: {
        id: 'p3',
        name: 'TechFlow Solutions Pvt. Ltd.',
        address: '789, Tech Hub, Electronic City',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560100',
        phone: '+91 80 12345678',
        email: 'finance@techflow.in',
        gstin: '29AABCT1234H1ZP',
      },
      openingBalance: 75000,
      transactions: [
        {
          id: '1',
          date: '2024-01-01',
          description: 'Opening Balance',
          reference: 'OB-2024-TF',
          type: 'opening',
          debit: 0,
          credit: 75000.00,
          balance: 75000.00,
          category: 'Opening'
        },
        {
          id: '2',
          date: '2024-01-15',
          description: 'Sale - Cloud Services Annual',
          reference: 'INV-2001',
          type: 'sale',
          debit: 0,
          credit: 120000.00,
          balance: 195000.00,
          category: 'Services'
        },
        {
          id: '3',
          date: '2024-01-28',
          description: 'Purchase - Server Equipment',
          reference: 'PO-3001',
          type: 'purchase',
          debit: 45000.00,
          credit: 0,
          balance: 150000.00,
          category: 'Office Supplies'
        },
        {
          id: '4',
          date: '2024-02-05',
          description: 'Sale - API Integration Package',
          reference: 'INV-2002',
          type: 'sale',
          debit: 0,
          credit: 28000.00,
          balance: 178000.00,
          category: 'Services'
        },
        {
          id: '5',
          date: '2024-02-12',
          description: 'Return - Faulty Hardware',
          reference: 'RET-002',
          type: 'return',
          debit: 5500.00,
          credit: 0,
          balance: 172500.00,
          category: 'Returns'
        },
        {
          id: '6',
          date: '2024-02-20',
          description: 'Sale - Support Contract Q1',
          reference: 'INV-2003',
          type: 'sale',
          debit: 0,
          credit: 45000.00,
          balance: 217500.00,
          category: 'Services'
        },
      ],
    },
    {
      id: '3',
      name: 'GlobalMart Retail',
      accountCode: 'ACC-003',
      fromParty: {
        id: 'p1',
        name: 'Nectar private limited',
        address: '123, Business Park, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        phone: '+91 120 4567890',
        email: 'accounts@yourcompany.com',
        gstin: '09AAACY1234F1Z5',
      },
      toParty: {
        id: 'p4',
        name: 'GlobalMart Retail India Ltd.',
        address: '321, Commerce Tower, Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400069',
        phone: '+91 22 87654321',
        email: 'accounts@globalmart.com',
        gstin: '27AABCG9876M1ZH',
      },
      openingBalance: 125000,
      transactions: [
        {
          id: '1',
          date: '2024-01-01',
          description: 'Opening Balance',
          reference: 'OB-2024-GM',
          type: 'opening',
          debit: 0,
          credit: 125000.00,
          balance: 125000.00,
          category: 'Opening'
        },
        {
          id: '2',
          date: '2024-01-10',
          description: 'Sale - Bulk Order Electronics',
          reference: 'INV-3001',
          type: 'sale',
          debit: 0,
          credit: 250000.00,
          balance: 375000.00,
          category: 'Product Sales'
        },
        {
          id: '3',
          date: '2024-01-20',
          description: 'Purchase - Display Units',
          reference: 'PO-4001',
          type: 'purchase',
          debit: 35000.00,
          credit: 0,
          balance: 340000.00,
          category: 'Office Supplies'
        },
        {
          id: '4',
          date: '2024-01-30',
          description: 'Return - Damaged Goods',
          reference: 'RET-003',
          type: 'return',
          debit: 12500.00,
          credit: 0,
          balance: 327500.00,
          category: 'Returns'
        },
        {
          id: '5',
          date: '2024-02-08',
          description: 'Sale - Fashion Accessories',
          reference: 'INV-3002',
          type: 'sale',
          debit: 0,
          credit: 85000.00,
          balance: 412500.00,
          category: 'Product Sales'
        },
        {
          id: '6',
          date: '2024-02-15',
          description: 'Sale - Home Appliances',
          reference: 'INV-3003',
          type: 'sale',
          debit: 0,
          credit: 175000.00,
          balance: 587500.00,
          category: 'Product Sales'
        },
        {
          id: '7',
          date: '2024-02-22',
          description: 'Adjustment - Price Correction',
          reference: 'ADJ-002',
          type: 'adjustment',
          debit: 0,
          credit: 5000.00,
          balance: 592500.00,
          category: 'Adjustments'
        },
      ],
    },
    {
      id: '4',
      name: 'BuildRight Construction',
      accountCode: 'ACC-004',
      fromParty: {
        id: 'p1',
        name: 'Nectar private limited',
        address: '123, Business Park, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        phone: '+91 120 4567890',
        email: 'accounts@yourcompany.com',
        gstin: '09AAACY1234F1Z5',
      },
      toParty: {
        id: 'p5',
        name: 'BuildRight Construction Co.',
        address: '555, Builder Complex, Whitefield',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
        phone: '+91 80 55667788',
        email: 'billing@buildright.in',
        gstin: '29AABCB5566K1ZQ',
      },
      openingBalance: 200000,
      transactions: [
        {
          id: '1',
          date: '2024-01-01',
          description: 'Opening Balance',
          reference: 'OB-2024-BR',
          type: 'opening',
          debit: 0,
          credit: 200000.00,
          balance: 200000.00,
          category: 'Opening'
        },
        {
          id: '2',
          date: '2024-01-12',
          description: 'Sale - Industrial Equipment',
          reference: 'INV-4001',
          type: 'sale',
          debit: 0,
          credit: 450000.00,
          balance: 650000.00,
          category: 'Product Sales'
        },
        {
          id: '3',
          date: '2024-01-22',
          description: 'Purchase - Safety Gear',
          reference: 'PO-5001',
          type: 'purchase',
          debit: 28000.00,
          credit: 0,
          balance: 622000.00,
          category: 'Office Supplies'
        },
        {
          id: '4',
          date: '2024-02-01',
          description: 'Sale - Construction Materials',
          reference: 'INV-4002',
          type: 'sale',
          debit: 0,
          credit: 320000.00,
          balance: 942000.00,
          category: 'Product Sales'
        },
        {
          id: '5',
          date: '2024-02-14',
          description: 'Return - Incorrect Specifications',
          reference: 'RET-004',
          type: 'return',
          debit: 45000.00,
          credit: 0,
          balance: 897000.00,
          category: 'Returns'
        },
      ],
    },
    {
      id: '5',
      name: 'MediCare Pharma',
      accountCode: 'ACC-005',
      fromParty: {
        id: 'p1',
        name: 'Nectar private limited',
        address: '123, Business Park, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        phone: '+91 120 4567890',
        email: 'accounts@yourcompany.com',
        gstin: '09AAACY1234F1Z5',
      },
      toParty: {
        id: 'p6',
        name: 'MediCare Pharmaceuticals Ltd.',
        address: '100, Pharma City, Jubilee Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500033',
        phone: '+91 40 99887766',
        email: 'finance@medicare.co.in',
        gstin: '36AABCM9988J1ZR',
      },
      openingBalance: 90000,
      transactions: [
        {
          id: '1',
          date: '2024-01-01',
          description: 'Opening Balance',
          reference: 'OB-2024-MC',
          type: 'opening',
          debit: 0,
          credit: 90000.00,
          balance: 90000.00,
          category: 'Opening'
        },
        {
          id: '2',
          date: '2024-01-08',
          description: 'Sale - Medical Supplies Q1',
          reference: 'INV-5001',
          type: 'sale',
          debit: 0,
          credit: 180000.00,
          balance: 270000.00,
          category: 'Product Sales'
        },
        {
          id: '3',
          date: '2024-01-18',
          description: 'Sale - Lab Equipment',
          reference: 'INV-5002',
          type: 'sale',
          debit: 0,
          credit: 95000.00,
          balance: 365000.00,
          category: 'Product Sales'
        },
        {
          id: '4',
          date: '2024-01-28',
          description: 'Purchase - Packaging Materials',
          reference: 'PO-6001',
          type: 'purchase',
          debit: 15000.00,
          credit: 0,
          balance: 350000.00,
          category: 'Office Supplies'
        },
        {
          id: '5',
          date: '2024-02-05',
          description: 'Return - Expired Stock',
          reference: 'RET-005',
          type: 'return',
          debit: 8500.00,
          credit: 0,
          balance: 341500.00,
          category: 'Returns'
        },
        {
          id: '6',
          date: '2024-02-12',
          description: 'Sale - Diagnostic Kits',
          reference: 'INV-5003',
          type: 'sale',
          debit: 0,
          credit: 125000.00,
          balance: 466500.00,
          category: 'Product Sales'
        },
        {
          id: '7',
          date: '2024-02-20',
          description: 'Adjustment - Stock Reconciliation',
          reference: 'ADJ-003',
          type: 'adjustment',
          debit: 3500.00,
          credit: 0,
          balance: 463000.00,
          category: 'Adjustments'
        },
        {
          id: '8',
          date: '2024-02-28',
          description: 'Sale - Surgical Instruments',
          reference: 'INV-5004',
          type: 'sale',
          debit: 0,
          credit: 210000.00,
          balance: 673000.00,
          category: 'Product Sales'
        },
      ],
    }
  ];

  constructor(
    private toastController: ToastController,
    private ledgerService: LedgerService,
    private elementRef: ElementRef
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
      'receipt-outline': receiptOutline
    });
  }

  ngOnInit() {
    // Fetch accounts from API on initialization
    this.loadAccountsFromApi();

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

  loadAccountsFromApi() {
    this.isLoadingAccounts = true;
    this.ledgerService.getAllLedgers().subscribe({
      next: (response: ApiResponse<LedgerDto[]>) => {
        if (response.success && response.data) {
          this.apiAccounts = response.data;
          console.log('Accounts loaded successfully:', this.apiAccounts);
          this.showToast(`${this.apiAccounts.length} accounts loaded successfully`, 'success');
        } else {
          this.showToast('Failed to load accounts: ' + response.message, 'warning');
        }
        this.isLoadingAccounts = false;
      },
      error: (error) => {
        console.error('Error loading accounts:', error);
        this.showToast('Error loading accounts from server', 'danger');
        this.isLoadingAccounts = false;
      }
    });
  }

  // Map API LedgerDto to UI LedgerAccount structure
  mapApiAccountsToLedgerAccounts(apiAccounts: LedgerDto[]): LedgerAccount[] {
    return apiAccounts.map(apiAccount => ({
      id: apiAccount.id.toString(),
      name: apiAccount.accountName,
      accountCode: apiAccount.accountNumber,
      fromParty: {
        id: 'company-' + apiAccount.companyId,
        name: 'Nectar private limited', // Hardcoded as per request
        address: 'Company Address',
        city: 'City',
        state: 'State',
        pincode: '000000',
        phone: '+91 000 0000000',
        email: 'company@example.com',
        gstin: 'GSTIN000000'
      },
      toParty: {
        id: 'distributor-' + apiAccount.distributorId,
        name: apiAccount.accountName, // Using account name as party name
        address: 'Distributor Address',
        city: 'City',
        state: 'State',
        pincode: '000000',
        phone: '+91 000 0000000',
        email: 'distributor@example.com',
        gstin: 'GSTIN000000'
      },
      openingBalance: apiAccount.currentBalance || 0,
      transactions: this.generateMockTransactions(apiAccount.currentBalance || 0, apiAccount.id)
    }));
  }

  // Generate mock transactions for demonstration
  generateMockTransactions(currentBalance: number, accountId: number): Transaction[] {
    const transactions: Transaction[] = [];
    const openingBalance = Math.max(currentBalance - 50000, 0);
    let runningBalance = openingBalance;

    // Opening balance transaction
    transactions.push({
      id: `${accountId}-0`,
      date: '2024-01-01',
      description: 'Opening Balance',
      reference: `OB-2024-${accountId}`,
      type: 'opening',
      debit: 0,
      credit: openingBalance,
      balance: runningBalance,
      category: 'Opening'
    });

    // Generate 5-8 random transactions
    const transactionCount = Math.floor(Math.random() * 4) + 5;
    const startDate = new Date('2024-01-01');
    const dayIncrement = Math.floor(365 / transactionCount);

    const transactionTypes: Transaction['type'][] = ['sale', 'purchase', 'return', 'adjustment'];
    const descriptions = {
      sale: ['Product Sales', 'Service Revenue', 'Bulk Order', 'Monthly Sales', 'Quarterly Revenue'],
      purchase: ['Inventory Purchase', 'Raw Materials', 'Office Supplies', 'Equipment Purchase', 'Stock Replenishment'],
      return: ['Product Return', 'Damaged Goods', 'Quality Issue', 'Wrong Item', 'Customer Return'],
      adjustment: ['Price Correction', 'Stock Reconciliation', 'Accounting Adjustment', 'Balance Correction', 'System Adjustment']
    };

    for (let i = 0; i < transactionCount; i++) {
      const transDate = new Date(startDate);
      transDate.setDate(startDate.getDate() + (i + 1) * dayIncrement + Math.floor(Math.random() * 5));

      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const isDebit = type === 'purchase' || type === 'return' || (type === 'adjustment' && Math.random() > 0.5);
      const amount = Math.floor(Math.random() * 30000) + 5000;

      const debit = isDebit ? amount : 0;
      const credit = !isDebit ? amount : 0;
      runningBalance = runningBalance - debit + credit;

      const descList = descriptions[type as keyof typeof descriptions];
      const description = descList[Math.floor(Math.random() * descList.length)];

      transactions.push({
        id: `${accountId}-${i + 1}`,
        date: transDate.toISOString().split('T')[0],
        description: description,
        reference: `${type.substring(0, 3).toUpperCase()}-${1000 + i}`,
        type: type,
        debit: debit,
        credit: credit,
        balance: runningBalance,
        category: type === 'sale' ? 'Product Sales' :
          type === 'purchase' ? 'Office Supplies' :
            type === 'return' ? 'Returns' : 'Adjustments'
      });
    }

    return transactions;
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
    // Use API accounts if available, otherwise fallback to mock ledgerAccounts
    const accountsToFilter = this.apiAccounts.length > 0
      ? this.mapApiAccountsToLedgerAccounts(this.apiAccounts)
      : this.ledgerAccounts;

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
    // Refresh accounts from API
    this.loadAccountsFromApi();
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
