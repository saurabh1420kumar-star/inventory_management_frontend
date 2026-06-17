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
import { amountToWords } from '../shared/utils/amount-to-words';
import { generateVoucherPdf as buildOfficialVoucherPdf, generateFundVoucherPdf as buildFundVoucherPdf } from '../shared/utils/voucher-pdf';
import jsPDF from 'jspdf';

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
  imports: [CommonModule, FormsModule, IonicModule],
})
export class TransactionMasterPage implements OnInit {

  // ── Tabs ──────────────────────────────────────────────────────────
  activeTab: TabType = 'create-ledger';

  // ── Create Ledger form ────────────────────────────────────────────
  ledgerName = '';
  ledgerType: LedgerType = '';
  underGroup: UnderGroup = '';
  isSubmittingLedger = false;
  ledgers: TransactionLedger[] = [];
  isLoadingLedgers = false;

  // ── Voucher Entry form ────────────────────────────────────────────
  nextVoucherNo = 'VCH-001';
  voucherDate = '';
  voucherType: 'INCOME' | 'EXPENSE' | '' = '';
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
  funds: TransactionFund[] = [];
  isLoadingFunds = false;

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

  // ── Company logo (preloaded as data URL for PDF embedding) ─────────
  logoDataUrl: string | null = null;

  constructor(private transactionSvc: TransactionService) {
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

  loadLedgers() {
    this.isLoadingLedgers = true;
    this.transactionSvc.getAllLedgers().subscribe({
      next: (data) => { this.ledgers = data; this.isLoadingLedgers = false; },
      error: () => { this.isLoadingLedgers = false; },
    });
  }

  saveLedger() {
    if (!this.ledgerName.trim() || !this.ledgerType || !this.underGroup) {
      this.showFeedback('Please fill all ledger fields.', false);
      return;
    }
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
      error: () => {
        this.isSubmittingLedger = false;
        this.showFeedback('Failed to create ledger. Please try again.', false);
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
    this.selectedLedgerId = null;
    if (this.voucherType) {
      this.transactionSvc.getLedgersByType(this.voucherType as 'EXPENSE' | 'INCOME').subscribe({
        next: (data) => { this.filteredLedgers = data; },
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
    if (!this.voucherType || !this.selectedLedgerId || !this.paymentMode || !this.amount || !this.narration.trim()) {
      this.showFeedback('Please fill all voucher fields before saving.', false);
      return;
    }
    if (this.paymentMode === 'UPI' && !this.voucherTransactionId.trim()) {
      this.showFeedback('Please enter the UPI transaction ID.', false);
      return;
    }
    const ledger = this.filteredLedgers.find(l => l.id === Number(this.selectedLedgerId));
    if (!ledger) return;

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
        this.fetchNextVoucherNo();
        this.openPrintModal(saved);
        this.resetVoucherForm();
      },
      error: () => {
        this.isSubmittingVoucher = false;
        this.showFeedback('Failed to save voucher. Please try again.', false);
      },
    });
  }

  resetVoucherForm() {
    this.voucherDate = new Date().toISOString().split('T')[0];
    this.voucherType = '';
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
      next: (data) => { this.funds = data; this.isLoadingFunds = false; },
      error: () => { this.isLoadingFunds = false; },
    });
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
      error: () => {
        this.isSubmittingFund = false;
        this.showFeedback('Failed to add fund. Please try again.', false);
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
}
