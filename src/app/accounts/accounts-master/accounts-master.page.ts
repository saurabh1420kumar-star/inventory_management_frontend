import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { IonHeader, IonToolbar, IonButtons, IonContent } from "@ionic/angular/standalone";

// Types
interface Transaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'opening';
  debit: number;
  credit: number;
  balance: number;
  category: string;
  notes?: string;
}

interface LedgerSummary {
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  transactionCount: number;
  openingBalance: number;
  closingBalance: number;
}

interface DateRange {
  from?: Date;
  to?: Date;
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
  // Data
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  
  // Summary
  summary: LedgerSummary = {
    totalDebits: 0,
    totalCredits: 0,
    netBalance: 0,
    transactionCount: 0,
    openingBalance: 0,
    closingBalance: 0
  };

  // Filters
  searchQuery = '';
  typeFilter = 'all';
  dateRange?: DateRange;
  activeFiltersCount = 0;

  // Modals
  isFormModalOpen = false;
  isDetailsModalOpen = false;
  selectedTransaction?: Transaction;

  // Form
  transactionForm!: FormGroup;
  isSubmitting = false;

  // Categories
  categories = [
    'Product Sales', 'Services', 'Office Supplies', 'Raw Materials',
    'Maintenance', 'Marketing', 'IT Infrastructure', 'Software Licenses',
    'Training', 'HR & Training', 'Returns', 'Adjustments', 'Opening', 'Other'
  ];

  // Sort
  sortField: 'date' | 'description' | 'debit' | 'credit' | 'balance' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadMockData();
    this.applyFilters();
  }

  // Initialize Form
  initForm() {
    this.transactionForm = this.fb.group({
      date: [new Date().toISOString(), Validators.required],
      type: ['purchase', Validators.required],
      description: ['', Validators.required],
      reference: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      category: ['', Validators.required],
      notes: ['']
    });
  }

  // Load Mock Data
  loadMockData() {
    this.transactions = [
      {
        id: '1', date: '2024-01-01', description: 'Opening Balance',
        reference: 'OB-2024', type: 'opening', debit: 0, credit: 50000,
        balance: 50000, category: 'Opening', notes: 'Starting balance for fiscal year 2024'
      },
      {
        id: '2', date: '2024-01-05', description: 'Purchase - Office Supplies from Staples Inc.',
        reference: 'PO-001', type: 'purchase', debit: 1250, credit: 0,
        balance: 48750, category: 'Office Supplies'
      },
      {
        id: '3', date: '2024-01-08', description: 'Sale - Product Bundle A to Acme Corp',
        reference: 'INV-1001', type: 'sale', debit: 0, credit: 8500,
        balance: 57250, category: 'Product Sales'
      },
      {
        id: '4', date: '2024-01-12', description: 'Purchase - Raw Materials from Global Suppliers',
        reference: 'PO-002', type: 'purchase', debit: 15750, credit: 0,
        balance: 41500, category: 'Raw Materials'
      },
      {
        id: '5', date: '2024-01-15', description: 'Sale - Consulting Services to Tech Solutions Ltd',
        reference: 'INV-1002', type: 'sale', debit: 0, credit: 12000,
        balance: 53500, category: 'Services'
      },
      {
        id: '6', date: '2024-01-18', description: 'Return - Defective Items from Acme Corp',
        reference: 'RET-001', type: 'return', debit: 850, credit: 0,
        balance: 52650, category: 'Returns'
      },
      {
        id: '7', date: '2024-01-22', description: 'Purchase - Equipment Maintenance Parts',
        reference: 'PO-003', type: 'purchase', debit: 3200, credit: 0,
        balance: 49450, category: 'Maintenance'
      },
      {
        id: '8', date: '2024-01-25', description: 'Sale - Product Line B to Mega Retail',
        reference: 'INV-1003', type: 'sale', debit: 0, credit: 25000,
        balance: 74450, category: 'Product Sales'
      }
    ];
  }

  // Filters
  applyFilters() {
    this.filteredTransactions = this.transactions.filter(transaction => {
      const matchesSearch = this.searchQuery === '' ||
        transaction.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        transaction.reference.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesType = this.typeFilter === 'all' || transaction.type === this.typeFilter;

      let matchesDate = true;
      if (this.dateRange?.from) {
        const transactionDate = new Date(transaction.date);
        const endDate = this.dateRange.to || this.dateRange.from;
        matchesDate = transactionDate >= this.dateRange.from && transactionDate <= endDate;
      }

      return matchesSearch && matchesType && matchesDate;
    });

    this.calculateSummary();
    this.calculateActiveFilters();
    this.sortTransactions();
  }

  calculateSummary() {
    this.summary = {
      totalDebits: this.filteredTransactions.reduce((sum, t) => sum + t.debit, 0),
      totalCredits: this.filteredTransactions.reduce((sum, t) => sum + t.credit, 0),
      netBalance: this.filteredTransactions.reduce((sum, t) => sum + t.credit - t.debit, 0),
      transactionCount: this.filteredTransactions.length,
      openingBalance: this.transactions[0]?.credit || 0,
      closingBalance: this.filteredTransactions[this.filteredTransactions.length - 1]?.balance || 0
    };
  }

  calculateActiveFilters() {
    let count = 0;
    if (this.searchQuery) count++;
    if (this.typeFilter !== 'all') count++;
    if (this.dateRange) count++;
    this.activeFiltersCount = count;
  }

  handleClearFilters() {
    this.searchQuery = '';
    this.typeFilter = 'all';
    this.dateRange = undefined;
    this.applyFilters();
    this.showToast('Filters cleared');
  }

  // Transaction Form
  generateReference() {
    const type = this.transactionForm.get('type')?.value;
    const prefix: { [key: string]: string } = {
      purchase: 'PO', sale: 'INV', return: 'RET',
      adjustment: 'ADJ', opening: 'OB'
    };
    const number = Math.floor(Math.random() * 9000) + 1000;
    this.transactionForm.patchValue({ reference: `${prefix[type]}-${number}` });
  }

  onSubmitTransaction() {
    if (this.transactionForm.valid) {
      this.isSubmitting = true;
      const formValue = this.transactionForm.value;
      const amount = parseFloat(formValue.amount);
      const isDebit = ['purchase', 'adjustment', 'return'].includes(formValue.type);

      const lastBalance = this.transactions[this.transactions.length - 1]?.balance || 0;
      const newBalance = lastBalance - (isDebit ? amount : 0) + (!isDebit ? amount : 0);

      const newTransaction: Transaction = {
        id: String(this.transactions.length + 1),
        date: new Date(formValue.date).toISOString().split('T')[0],
        description: formValue.description.trim(),
        reference: formValue.reference.trim(),
        type: formValue.type,
        debit: isDebit ? amount : 0,
        credit: !isDebit ? amount : 0,
        balance: newBalance,
        category: formValue.category,
        notes: formValue.notes?.trim() || undefined
      };

      setTimeout(() => {
        this.transactions.push(newTransaction);
        this.applyFilters();
        this.transactionForm.reset();
        this.initForm();
        this.isFormModalOpen = false;
        this.isSubmitting = false;
        this.showToast('Transaction added successfully');
      }, 300);
    }
  }

  closeFormModal() {
    this.transactionForm.reset();
    this.initForm();
    this.isFormModalOpen = false;
  }

  // Details Modal
  openDetailsModal(transaction: Transaction) {
    this.selectedTransaction = transaction;
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedTransaction = undefined;
  }

  // Sorting
  sortTransactions() {
    this.filteredTransactions.sort((a, b) => {
      let aVal: any = a[this.sortField];
      let bVal: any = b[this.sortField];

      if (this.sortField === 'date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (this.sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  toggleSort(field: 'date' | 'description' | 'debit' | 'credit' | 'balance') {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.sortTransactions();
  }

  // Export
  handleExport() {
    const headers = ['Date', 'Reference', 'Description', 'Type', 'Category', 'Debit', 'Credit', 'Balance'];
    const csvData = this.filteredTransactions.map(t => [
      t.date, t.reference, t.description, t.type, t.category,
      t.debit.toString(), t.credit.toString(), t.balance.toString()
    ]);

    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger_export_${new Date().toISOString()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.showToast(`Exported ${this.filteredTransactions.length} transactions`);
  }

  handleRefresh() {
    this.loadMockData();
    this.applyFilters();
    this.showToast('Data refreshed');
  }

  // Utilities
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(amount);
  }

  getBadgeColor(type: string): string {
    const colorMap: { [key: string]: string } = {
      purchase: 'danger', sale: 'success', return: 'warning',
      adjustment: 'tertiary', opening: 'primary'
    };
    return colorMap[type] || 'medium';
  }

  // Helper to capitalize first letter (replacement for titlecase pipe)
  capitalize(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  get currentDateTime(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message, duration: 2000, color: 'success', position: 'top'
    });
    toast.present();
  }
}
