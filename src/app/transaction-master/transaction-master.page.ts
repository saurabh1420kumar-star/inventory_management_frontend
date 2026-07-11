import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  layersOutline, addCircleOutline, saveOutline, printOutline,
  closeOutline, checkmarkCircleOutline, alertCircleOutline,
  receiptOutline, refreshOutline, searchOutline, documentTextOutline,
  walletOutline, cashOutline, phonePortraitOutline,
  trendingUpOutline, trendingDownOutline, businessOutline, constructOutline,
  personOutline, callOutline,
} from 'ionicons/icons';

import { TransactionService, TransactionLedger, TransactionVoucher, TransactionFund } from '../services/transaction.service';
import { HapticService } from '../services/haptic.service';
import { KeyboardService } from '../services/keyboard.service';
import { amountToWords } from '../shared/utils/amount-to-words';
import { generateVoucherPdf as buildOfficialVoucherPdf, generateFundVoucherPdf as buildFundVoucherPdf, generateLedgerStatementPdf, LedgerStatementRow } from '../shared/utils/voucher-pdf';
import jsPDF from 'jspdf';
import { AclDirective } from '../acl/acl.directive';

type TabType = 'create-ledger' | 'voucher-entry' | 'add-fund';
type LedgerType = 'EXPENSE' | 'INCOME' | '';
type PaymentMode = 'CASH' | 'UPI' | '';
type FundLocation = 'OFFICE' | 'FACTORY' | '';
type UnderGroup = 'DIRECT_EXPENSE' | 'INDIRECT_EXPENSE' | 'DIRECT_INCOME' | 'INDIRECT_INCOME' | '';

const UNDER_GROUP_LABELS: Record<string, string> = {
  DIRECT_EXPENSE: 'Direct Expense',
  INDIRECT_EXPENSE: 'Indirect Expense',
  DIRECT_INCOME: 'Direct Income',
  INDIRECT_INCOME: 'Indirect Income',
};

@Component({
  selector: 'app-transaction-master',
  templateUrl: './transaction-master.page.html',
  styleUrls: ['./transaction-master.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, AclDirective],
})
export class TransactionMasterPage implements OnInit {

  /** Feature key used for CRUD button gating on this page. */
  readonly FEATURE = 'TRANSACTION_MASTER';
  Math = Math;

  // ── Tabs ──────────────────────────────────────────────────────────
  activeTab: TabType = 'create-ledger';

  // ── Create Ledger form ────────────────────────────────────────────
  ledgerName = '';
  ledgerType: LedgerType = '';
  underGroup: UnderGroup = '';
  isSubmittingLedger = false;
  allLedgers: TransactionLedger[] = [];
  ledgers: TransactionLedger[] = [];
  isLoadingLedgers = false;
  ledgerCurrentPage = 1;
  ledgersPerPage = 20;

  // ── Voucher Entry form ────────────────────────────────────────────
  nextVoucherNo = 'VCH-001';
  voucherDate = '';
  voucherType: 'INCOME' | 'EXPENSE' | '' = '';
  voucherUnderGroup: UnderGroup = '';
  selectedLedgerId: number | null = null;
  filteredLedgers: TransactionLedger[] = [];
  partyName = '';
  mobileNo = '';
  invoiceRef = '';
  paymentMode: PaymentMode = '';
  voucherTransactionId = '';
  amount: number | null = null;
  lessAdjustment: number | null = null;
  amountInWords = '';
  narration = '';
  isSubmittingVoucher = false;
  lastSavedVoucher: TransactionVoucher | null = null;

  // ── Add Fund form ─────────────────────────────────────────────────
  fundDate = '';
  fundAmount: number | null = null;
  fundAmountInWords = '';
  fundPaymentMode: PaymentMode = '';
  fundTransactionId = '';
  fundLocation: FundLocation = '';
  fundNarration = '';
  isSubmittingFund = false;
  allFunds: TransactionFund[] = [];
  funds: TransactionFund[] = [];
  isLoadingFunds = false;
  fundCurrentPage = 1;
  fundsPerPage = 20;

  // ── Print Preview modal ───────────────────────────────────────────
  showPrintModal = false;
  printTargetVoucher: TransactionVoucher | null = null;

  // ── Reprint modal ─────────────────────────────────────────────────
  showReprintModal = false;
  reprintVoucherNo = '';
  reprintVoucher: TransactionVoucher | null = null;
  isSearchingReprint = false;
  reprintNotFound = false;

  // ── Feedback modal ────────────────────────────────────────────────
  showFeedbackModal = false;
  feedbackMessage = '';
  feedbackIsSuccess = true;

  // ── Ledger Statement modal ────────────────────────────────────────
  showLedgerStatementModal = false;
  selectedLedgerForStatement: TransactionLedger | null = null;
  ledgerStatementRows: LedgerStatementRow[] = [];
  isGeneratingStatement = false;

  // ── Company logo (preloaded as data URL for PDF embedding) ─────────
  logoDataUrl: string | null = null;

  constructor(private transactionSvc: TransactionService, private haptic: HapticService, private keyboard: KeyboardService) {
    addIcons({
      layersOutline, addCircleOutline, saveOutline, printOutline,
      closeOutline, checkmarkCircleOutline, alertCircleOutline,
      receiptOutline, refreshOutline, searchOutline, documentTextOutline,
      walletOutline, cashOutline, phonePortraitOutline,
      trendingUpOutline, trendingDownOutline, businessOutline, constructOutline,
      personOutline, callOutline,
    });
  }

  ngOnInit() {
    this.voucherDate = new Date().toISOString().split('T')[0];
    this.fundDate = this.voucherDate;
    this.loadLedgers();
    this.fetchNextVoucherNo();
    this.preloadLogo();
  }

  // Preload the company logo as a base64 data URL so PDF generation stays
  // synchronous. Fails silently — the voucher still prints without the logo.
  private preloadLogo() {
    fetch('assets/images/nectar.jpeg')
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .then(dataUrl => { this.logoDataUrl = dataUrl; })
      .catch(() => { this.logoDataUrl = null; });
  }

  // ── Tab switching ─────────────────────────────────────────────────
  switchTab(tab: TabType) {
    this.haptic.selectionChanged();
    this.activeTab = tab;
    if (tab === 'create-ledger') {
      this.resetLedgerForm();
    }
    if (tab === 'add-fund') {
      this.loadFunds();
    }
  }

  // ── Ledger helpers ────────────────────────────────────────────────
  get underGroupOptions(): { value: UnderGroup; label: string }[] {
    if (this.ledgerType === 'EXPENSE') {
      return [
        { value: 'DIRECT_EXPENSE', label: 'Direct Expense' },
        { value: 'INDIRECT_EXPENSE', label: 'Indirect Expense' },
      ];
    }
    if (this.ledgerType === 'INCOME') {
      return [
        { value: 'DIRECT_INCOME', label: 'Direct Income' },
        { value: 'INDIRECT_INCOME', label: 'Indirect Income' },
      ];
    }
    return [];
  }

  onLedgerTypeChange() {
    this.underGroup = '';
  }

  get voucherUnderGroupOptions(): { value: UnderGroup; label: string }[] {
    if (this.voucherType === 'EXPENSE') {
      return [
        { value: 'DIRECT_EXPENSE', label: 'Direct Expense' },
        { value: 'INDIRECT_EXPENSE', label: 'Indirect Expense' },
      ];
    }
    if (this.voucherType === 'INCOME') {
      return [
        { value: 'DIRECT_INCOME', label: 'Direct Income' },
        { value: 'INDIRECT_INCOME', label: 'Indirect Income' },
      ];
    }
    return [];
  }

  loadLedgers() {
    this.isLoadingLedgers = true;
    this.transactionSvc.getAllLedgers().subscribe({
      next: (data) => {
        this.allLedgers = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.ledgerCurrentPage = 1;
        this.updateLedgerPagination();
        this.isLoadingLedgers = false;
      },
      error: () => { this.isLoadingLedgers = false; },
    });
  }

  saveLedger() {
    if (!this.ledgerName.trim() || !this.ledgerType || !this.underGroup) {
      this.showFeedback('Please fill all ledger fields.', false);
      return;
    }
    this.haptic.heavy();
    this.isSubmittingLedger = true;
    this.transactionSvc.createLedger({
      ledgerName: this.ledgerName.trim(),
      ledgerType: this.ledgerType as 'EXPENSE' | 'INCOME',
      underGroup: this.underGroup as TransactionLedger['underGroup'],
    }).subscribe({
      next: () => {
        this.isSubmittingLedger = false;
        this.showFeedback(`Ledger "${this.ledgerName}" created successfully.`, true);
        this.resetLedgerForm();
        this.loadLedgers();
      },
      error: (err) => {
        this.isSubmittingLedger = false;
        const errorMsg = err?.error?.error || err?.error?.message || 'Failed to create ledger. Please try again.';
        this.showFeedback(errorMsg, false);
      },
    });
  }

  resetLedgerForm() {
    this.ledgerName = '';
    this.ledgerType = '';
    this.underGroup = '';
  }

  labelForUnderGroup(g: string) {
    return UNDER_GROUP_LABELS[g] ?? g;
  }

  // ── Voucher helpers ───────────────────────────────────────────────
  fetchNextVoucherNo() {
    this.transactionSvc.getAllVouchers().subscribe({
      next: (vouchers) => {
        const next = vouchers.length + 1;
        this.nextVoucherNo = `VCH-${String(next).padStart(3, '0')}`;
      },
    });
  }

  onVoucherTypeChange() {
    this.voucherUnderGroup = '';
    this.selectedLedgerId = null;
    this.filteredLedgers = [];
  }

  onVoucherUnderGroupChange() {
    this.selectedLedgerId = null;
    if (this.voucherType && this.voucherUnderGroup) {
      this.transactionSvc.getAllLedgers().subscribe({
        next: (data) => {
          this.filteredLedgers = data.filter(
            l => l.ledgerType === this.voucherType && l.underGroup === this.voucherUnderGroup
          );
        },
      });
    } else {
      this.filteredLedgers = [];
    }
  }

  onVoucherPaymentModeChange() {
    if (this.paymentMode !== 'UPI') {
      this.voucherTransactionId = '';
    }
  }

  // Net = Gross amount − Less Adjustment
  get netAmount(): number {
    return Math.max((this.amount || 0) - (this.lessAdjustment || 0), 0);
  }

  onAmountChange() {
    this.amountInWords = this.netAmount > 0 ? amountToWords(this.netAmount) : '';
  }

  onLessAdjustmentChange() {
    this.onAmountChange();
  }

  saveAndApproveVoucher() {
    if (!this.voucherType || !this.voucherUnderGroup || !this.selectedLedgerId || !this.paymentMode || !this.amount || !this.narration.trim()) {
      this.showFeedback('Please fill all voucher fields before saving.', false);
      return;
    }
    if (this.paymentMode === 'UPI' && !this.voucherTransactionId.trim()) {
      this.showFeedback('Please enter the UPI transaction ID.', false);
      return;
    }
    const ledger = this.filteredLedgers.find(l => l.id === Number(this.selectedLedgerId));
    if (!ledger) return;

    this.haptic.heavy();
    this.isSubmittingVoucher = true;
    this.transactionSvc.createVoucher({
      date: this.voucherDate,
      voucherType: this.voucherType as 'INCOME' | 'EXPENSE',
      ledgerId: ledger.id,
      ledgerName: ledger.ledgerName,
      partyName: this.partyName.trim(),
      mobileNo: this.mobileNo.trim(),
      invoiceRef: this.invoiceRef.trim(),
      paymentMode: this.paymentMode as 'CASH' | 'UPI',
      transactionId: this.paymentMode === 'UPI' ? this.voucherTransactionId.trim() : '',
      amount: this.amount,
      lessAdjustment: this.lessAdjustment || 0,
      narration: this.narration.trim(),
    }).subscribe({
      next: (saved) => {
        this.isSubmittingVoucher = false;
        this.lastSavedVoucher = saved;
        this.keyboard.dismiss();
        this.fetchNextVoucherNo();
        this.openPrintModal(saved);
        this.resetVoucherForm();
      },
      error: (err) => {
        this.isSubmittingVoucher = false;
        const errorMsg = err?.error?.error || err?.error?.message || 'Failed to save voucher. Please try again.';
        this.showFeedback(errorMsg, false);
      },
    });
  }

  resetVoucherForm() {
    this.voucherDate = new Date().toISOString().split('T')[0];
    this.voucherType = '';
    this.voucherUnderGroup = '';
    this.selectedLedgerId = null;
    this.filteredLedgers = [];
    this.partyName = '';
    this.mobileNo = '';
    this.invoiceRef = '';
    this.paymentMode = '';
    this.voucherTransactionId = '';
    this.amount = null;
    this.lessAdjustment = null;
    this.amountInWords = '';
    this.narration = '';
  }

  // ── Add Fund helpers ──────────────────────────────────────────────
  loadFunds() {
    this.isLoadingFunds = true;
    this.transactionSvc.getAllFunds().subscribe({
      next: (data) => {
        this.allFunds = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.fundCurrentPage = 1;
        this.updateFundPagination();
        this.isLoadingFunds = false;
      },
      error: () => { this.isLoadingFunds = false; },
    });
  }

  // Pagination helpers
  updateLedgerPagination() {
    const start = (this.ledgerCurrentPage - 1) * this.ledgersPerPage;
    const end = start + this.ledgersPerPage;
    this.ledgers = this.allLedgers.slice(start, end);
  }

  updateFundPagination() {
    const start = (this.fundCurrentPage - 1) * this.fundsPerPage;
    const end = start + this.fundsPerPage;
    this.funds = this.allFunds.slice(start, end);
  }

  nextLedgerPage() {
    const maxPages = Math.ceil(this.allLedgers.length / this.ledgersPerPage);
    if (this.ledgerCurrentPage < maxPages) {
      this.ledgerCurrentPage++;
      this.updateLedgerPagination();
    }
  }

  prevLedgerPage() {
    if (this.ledgerCurrentPage > 1) {
      this.ledgerCurrentPage--;
      this.updateLedgerPagination();
    }
  }

  nextFundPage() {
    const maxPages = Math.ceil(this.allFunds.length / this.fundsPerPage);
    if (this.fundCurrentPage < maxPages) {
      this.fundCurrentPage++;
      this.updateFundPagination();
    }
  }

  prevFundPage() {
    if (this.fundCurrentPage > 1) {
      this.fundCurrentPage--;
      this.updateFundPagination();
    }
  }

  get ledgerTotalPages(): number {
    return Math.ceil(this.allLedgers.length / this.ledgersPerPage);
  }

  get fundTotalPages(): number {
    return Math.ceil(this.allFunds.length / this.fundsPerPage);
  }

  onFundAmountChange() {
    this.fundAmountInWords = this.fundAmount !== null && this.fundAmount > 0
      ? amountToWords(this.fundAmount)
      : '';
  }

  onFundPaymentModeChange() {
    // Transaction ID only applies to UPI — clear it when switching to Cash.
    if (this.fundPaymentMode !== 'UPI') {
      this.fundTransactionId = '';
    }
  }

  saveFund() {
    if (!this.fundAmount || this.fundAmount <= 0 || !this.fundPaymentMode || !this.fundLocation) {
      this.showFeedback('Please fill amount, payment mode and location.', false);
      return;
    }
    if (this.fundPaymentMode === 'UPI' && !this.fundTransactionId.trim()) {
      this.showFeedback('Please enter the UPI transaction ID.', false);
      return;
    }

    this.haptic.heavy();
    this.isSubmittingFund = true;
    this.transactionSvc.addFund({
      date: this.fundDate,
      amount: this.fundAmount,
      paymentMode: this.fundPaymentMode as 'CASH' | 'UPI',
      transactionId: this.fundPaymentMode === 'UPI' ? this.fundTransactionId.trim() : '',
      location: this.fundLocation as 'OFFICE' | 'FACTORY',
      narration: this.fundNarration.trim(),
    }).subscribe({
      next: (saved) => {
        this.isSubmittingFund = false;
        this.showFeedback(`Fund ${saved.fundNo} of Rs. ${saved.amount.toLocaleString('en-IN')} added successfully.`, true);
        this.resetFundForm();
        this.loadFunds();
      },
      error: (err) => {
        this.isSubmittingFund = false;
        const errorMsg = err?.error?.error || err?.error?.message || 'Failed to add fund. Please try again.';
        this.showFeedback(errorMsg, false);
      },
    });
  }

  resetFundForm() {
    this.fundDate = new Date().toISOString().split('T')[0];
    this.fundAmount = null;
    this.fundAmountInWords = '';
    this.fundPaymentMode = '';
    this.fundTransactionId = '';
    this.fundLocation = '';
    this.fundNarration = '';
  }

  labelForLocation(loc: string): string {
    return loc === 'OFFICE' ? 'Office' : loc === 'FACTORY' ? 'Factory' : loc;
  }

  // ── Print modal ───────────────────────────────────────────────────
  openPrintModal(voucher: TransactionVoucher) {
    this.printTargetVoucher = voucher;
    this.showPrintModal = true;
  }

  openPrintLastVoucher() {
    if (!this.lastSavedVoucher) {
      this.showFeedback('No voucher has been saved in this session yet.', false);
      return;
    }
    this.openPrintModal(this.lastSavedVoucher);
  }

  printVoucherPdf() {
    if (!this.printTargetVoucher) return;
    const doc = this.generateVoucherPdf(this.printTargetVoucher);
    window.open(String(doc.output('bloburi')), '_blank');
  }

  // ── Reprint modal ─────────────────────────────────────────────────
  openReprintModal() {
    this.reprintVoucherNo = '';
    this.reprintVoucher = null;
    this.reprintNotFound = false;
    this.showReprintModal = true;
  }

  searchReprintVoucher() {
    if (!this.reprintVoucherNo.trim()) return;
    this.isSearchingReprint = true;
    this.reprintNotFound = false;
    this.transactionSvc.getVoucherByNo(this.reprintVoucherNo.trim().toUpperCase()).subscribe({
      next: (v) => {
        this.isSearchingReprint = false;
        this.reprintVoucher = v;
        this.reprintNotFound = v === null;
      },
      error: () => { this.isSearchingReprint = false; this.reprintNotFound = true; },
    });
  }

  reprintSelectedVoucher() {
    if (!this.reprintVoucher) return;
    const doc = this.generateVoucherPdf(this.reprintVoucher);
    window.open(String(doc.output('bloburi')), '_blank');
  }

  // ── PDF generation ────────────────────────────────────────────────
  // Builds the official Nectar Origin Payment / Receipt voucher form.
  generateVoucherPdf(voucher: TransactionVoucher): jsPDF {
    return buildOfficialVoucherPdf(voucher, this.logoDataUrl);
  }

  // Print a Fund as the official Fund Transfer Voucher.
  printFund(fund: TransactionFund) {
    const doc = buildFundVoucherPdf(fund, this.logoDataUrl);
    window.open(String(doc.output('bloburi')), '_blank');
  }

  // ── Feedback helper ───────────────────────────────────────────────
  showFeedback(message: string, success: boolean) {
    // Single feedback funnel for ledger/voucher/fund results — drive the matching haptic here.
    if (success) {
      this.haptic.success();
      // Inline forms stay on-page; dismiss the keyboard so it doesn't cover the result.
      this.keyboard.dismiss();
    } else {
      this.haptic.error();
    }
    this.feedbackMessage = message;
    this.feedbackIsSuccess = success;
    this.showFeedbackModal = true;
  }

  getAmountWords(n: number): string {
    return amountToWords(n);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  // ── Ledger Statement ──────────────────────────────────────────────
  openLedgerStatement(ledger: TransactionLedger) {
    this.selectedLedgerForStatement = ledger;
    this.isGeneratingStatement = true;
    this.transactionSvc.getAllVouchers().subscribe({
      next: (vouchers) => {
        const ledgerVouchers = vouchers.filter(v => v.ledgerId === ledger.id);
        const rows: LedgerStatementRow[] = [];
        let balance = 0;

        ledgerVouchers.forEach(v => {
          const isDebit = v.voucherType === 'EXPENSE' ? true : false;
          const amount = v.amount - (v.lessAdjustment || 0);

          if (isDebit) balance += amount;
          else balance -= amount;

          rows.push({
            date: this.formatDate(v.date),
            reference: v.voucherNo,
            description: v.narration || v.ledgerName,
            type: isDebit ? 'DEBIT' : 'CREDIT',
            debit: isDebit ? amount : 0,
            credit: !isDebit ? amount : 0,
            balance: Math.abs(balance),
          });
        });

        this.ledgerStatementRows = rows;
        this.showLedgerStatementModal = true;
        this.isGeneratingStatement = false;
      },
      error: () => {
        this.isGeneratingStatement = false;
        this.showFeedback('Failed to load ledger details.', false);
      },
    });
  }

  generateLedgerStatementPdfReport() {
    if (!this.selectedLedgerForStatement) return;
    const ledger = this.selectedLedgerForStatement;
    const doc = generateLedgerStatementPdf(
      ledger.ledgerName,
      'Party Name',
      'Party Address',
      '+91-9999999999',
      'party@email.com',
      this.ledgerStatementRows,
      this.logoDataUrl,
      'City',
      'State',
      'Pin Code',
    );
    window.open(String(doc.output('bloburi')), '_blank');
  }

  exportLedgerStatementCsv() {
    if (!this.selectedLedgerForStatement) return;
    const ledger = this.selectedLedgerForStatement;

    const totalDebits = this.ledgerStatementRows.reduce((sum, r) => sum + r.debit, 0);
    const totalCredits = this.ledgerStatementRows.reduce((sum, r) => sum + r.credit, 0);
    const openingBal = this.ledgerStatementRows.length > 0
      ? this.ledgerStatementRows[0].balance - (this.ledgerStatementRows[0].debit - this.ledgerStatementRows[0].credit)
      : 0;
    const closingBal = this.ledgerStatementRows.length > 0
      ? this.ledgerStatementRows[this.ledgerStatementRows.length - 1].balance
      : 0;

    const csvLines: string[] = [];
    csvLines.push('ACCOUNT LEDGER STATEMENT');
    csvLines.push(`Ledger: ${ledger.ledgerName}`);
    csvLines.push(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
    csvLines.push('');
    csvLines.push('FROM PARTY,NECTAR ORIGIN PRIVATE LIMITED');
    csvLines.push('TO PARTY,' + ledger.ledgerName);
    csvLines.push('');
    csvLines.push('SUMMARY');
    csvLines.push(`Opening Balance,${openingBal}`);
    csvLines.push(`Total Debits,${totalDebits}`);
    csvLines.push(`Total Credits,${totalCredits}`);
    csvLines.push(`Closing Balance,${closingBal}`);
    csvLines.push('');
    csvLines.push('TRANSACTIONS');
    csvLines.push('Date,Reference,Description,Type,Debit,Credit,Balance');

    this.ledgerStatementRows.forEach(row => {
      csvLines.push(
        [
          row.date,
          row.reference,
          `"${row.description}"`,
          row.type,
          row.debit > 0 ? row.debit : '',
          row.credit > 0 ? row.credit : '',
          row.balance,
        ].join(','),
      );
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ledger.ledgerName}-statement.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
