import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface TransactionLedger {
  id: number;
  ledgerName: string;
  ledgerType: 'EXPENSE' | 'INCOME';
  underGroup: 'DIRECT_EXPENSE' | 'INDIRECT_EXPENSE' | 'DIRECT_INCOME' | 'INDIRECT_INCOME';
  createdAt: string;
}

export interface TransactionVoucher {
  id: number;
  voucherNo: string;
  date: string;
  voucherType: 'INCOME' | 'EXPENSE';
  ledgerId: number;
  ledgerName: string;
  partyName?: string;             // "Paid To" (EXPENSE) / "Received From" (INCOME)
  mobileNo?: string;
  invoiceRef?: string;            // Invoice / Bill reference no.
  paymentMode: 'CASH' | 'UPI';
  transactionId?: string;         // only populated when paymentMode === 'UPI'
  amount: number;                 // Gross amount
  lessAdjustment?: number;        // optional deduction; Net = amount - lessAdjustment
  narration: string;
  status: 'APPROVED' | 'PENDING';
  createdAt: string;
}

export interface TransactionFund {
  id: number;
  fundNo: string;
  date: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI';
  transactionId: string;          // only populated when paymentMode === 'UPI'
  location: 'OFFICE' | 'FACTORY';
  narration: string;
  createdAt: string;
}

export interface CashbookEntry {
  ledgerName: string;
  ledgerType: 'EXPENSE' | 'INCOME';
  underGroup: string;
  amount: number;
}

export interface CashbookSummary {
  openingBalance: number;
  closingBalance: number;
  entries: CashbookEntry[];
  fromDate: string;
  toDate: string;
}

// ---------------------------------------------------------------------------
// Mock seed data — replace each method body with real HTTP calls once the
// backend endpoints are ready. The method signatures and return types are the
// intended API contract.
// ---------------------------------------------------------------------------

let mockLedgers: TransactionLedger[] = [
  { id: 1, ledgerName: 'Wages',         ledgerType: 'EXPENSE', underGroup: 'DIRECT_EXPENSE',   createdAt: '2026-06-01' },
  { id: 2, ledgerName: 'Spare Parts',   ledgerType: 'EXPENSE', underGroup: 'DIRECT_EXPENSE',   createdAt: '2026-06-01' },
  { id: 3, ledgerName: 'Tea',           ledgerType: 'EXPENSE', underGroup: 'DIRECT_EXPENSE',   createdAt: '2026-06-01' },
  { id: 4, ledgerName: 'Fooding Exp',   ledgerType: 'EXPENSE', underGroup: 'INDIRECT_EXPENSE', createdAt: '2026-06-01' },
  { id: 5, ledgerName: 'Sale From Scrap', ledgerType: 'INCOME', underGroup: 'DIRECT_INCOME',   createdAt: '2026-06-01' },
  { id: 6, ledgerName: 'Other Receive', ledgerType: 'INCOME', underGroup: 'DIRECT_INCOME',     createdAt: '2026-06-01' },
];

let mockVouchers: TransactionVoucher[] = [
  { id: 1, voucherNo: 'VCH-001', date: '2026-06-01', voucherType: 'EXPENSE', ledgerId: 1, ledgerName: 'Wages',         paymentMode: 'CASH', amount: 400,   narration: 'Being Amount Paid to Suresh Against Wages',  status: 'APPROVED', createdAt: '2026-06-01' },
  { id: 2, voucherNo: 'VCH-002', date: '2026-06-02', voucherType: 'EXPENSE', ledgerId: 3, ledgerName: 'Tea',           paymentMode: 'CASH', amount: 100,   narration: 'Being Amount Paid for Tea',                  status: 'APPROVED', createdAt: '2026-06-02' },
  { id: 3, voucherNo: 'VCH-003', date: '2026-06-03', voucherType: 'INCOME',  ledgerId: 5, ledgerName: 'Sale From Scrap', paymentMode: 'UPI', amount: 15000, narration: 'Received against scrap sale',               status: 'APPROVED', createdAt: '2026-06-03' },
];

const mockCashbookSummary: CashbookSummary = {
  openingBalance: 100,
  closingBalance: 20103,
  fromDate: '',
  toDate: '',
  entries: [
    { ledgerName: 'Wages',                  ledgerType: 'EXPENSE', underGroup: 'DIRECT_EXPENSE',   amount: 400 },
    { ledgerName: 'Spare Parts',            ledgerType: 'EXPENSE', underGroup: 'DIRECT_EXPENSE',   amount: 2000 },
    { ledgerName: 'Unloading Charge',       ledgerType: 'EXPENSE', underGroup: 'DIRECT_EXPENSE',   amount: 1500 },
    { ledgerName: 'Loading Charge',         ledgerType: 'EXPENSE', underGroup: 'DIRECT_EXPENSE',   amount: 1000 },
    { ledgerName: 'Freight Outward',        ledgerType: 'EXPENSE', underGroup: 'DIRECT_EXPENSE',   amount: 245 },
    { ledgerName: 'Tea',                    ledgerType: 'EXPENSE', underGroup: 'DIRECT_EXPENSE',   amount: 100 },
    { ledgerName: 'Stationery',             ledgerType: 'EXPENSE', underGroup: 'DIRECT_EXPENSE',   amount: 25 },
    { ledgerName: 'Fooding Exp',            ledgerType: 'EXPENSE', underGroup: 'INDIRECT_EXPENSE', amount: 340 },
    { ledgerName: 'Maintenance Machinery',  ledgerType: 'EXPENSE', underGroup: 'INDIRECT_EXPENSE', amount: 20 },
    { ledgerName: 'Maintenance Electricity',ledgerType: 'EXPENSE', underGroup: 'INDIRECT_EXPENSE', amount: 245 },
    { ledgerName: 'Freight Inward',         ledgerType: 'EXPENSE', underGroup: 'INDIRECT_EXPENSE', amount: 165 },
    { ledgerName: 'Courier Exp',            ledgerType: 'EXPENSE', underGroup: 'INDIRECT_EXPENSE', amount: 135 },
    { ledgerName: 'Office Maintenance',     ledgerType: 'EXPENSE', underGroup: 'INDIRECT_EXPENSE', amount: 865 },
    { ledgerName: 'MIS Expense',            ledgerType: 'EXPENSE', underGroup: 'INDIRECT_EXPENSE', amount: 457 },
    { ledgerName: 'Sale From Scrap',        ledgerType: 'INCOME',  underGroup: 'DIRECT_INCOME',    amount: 15000 },
    { ledgerName: 'Received From HO',       ledgerType: 'INCOME',  underGroup: 'DIRECT_INCOME',    amount: 10000 },
    { ledgerName: 'Other Receive',          ledgerType: 'INCOME',  underGroup: 'DIRECT_INCOME',    amount: 2500 },
  ],
};

let mockFunds: TransactionFund[] = [
  { id: 1, fundNo: 'FND-001', date: '2026-06-01', amount: 10000, paymentMode: 'UPI',  transactionId: 'UPI24061500123', location: 'OFFICE',  narration: 'Fund received from HO',         createdAt: '2026-06-01' },
  { id: 2, fundNo: 'FND-002', date: '2026-06-02', amount: 5000,  paymentMode: 'CASH', transactionId: '',               location: 'FACTORY', narration: 'Cash fund for factory petty exp', createdAt: '2026-06-02' },
];

@Injectable({ providedIn: 'root' })
export class TransactionService {

  // ------------------------------------------------------------------
  // Ledger CRUD
  // Real: POST /api/transaction/ledger
  // ------------------------------------------------------------------
  createLedger(payload: Omit<TransactionLedger, 'id' | 'createdAt'>): Observable<TransactionLedger> {
    const newLedger: TransactionLedger = {
      ...payload,
      id: mockLedgers.length + 1,
      createdAt: new Date().toISOString().split('T')[0],
    };
    mockLedgers = [...mockLedgers, newLedger];
    return of(newLedger).pipe(delay(400));
  }

  // Real: GET /api/transaction/ledgers
  getAllLedgers(): Observable<TransactionLedger[]> {
    return of([...mockLedgers]).pipe(delay(400));
  }

  // Real: GET /api/transaction/ledgers?type=EXPENSE|INCOME
  getLedgersByType(type: 'EXPENSE' | 'INCOME'): Observable<TransactionLedger[]> {
    return of(mockLedgers.filter(l => l.ledgerType === type)).pipe(delay(200));
  }

  // ------------------------------------------------------------------
  // Voucher CRUD
  // Real: POST /api/transaction/voucher
  // ------------------------------------------------------------------
  createVoucher(payload: Omit<TransactionVoucher, 'id' | 'voucherNo' | 'createdAt' | 'status'>): Observable<TransactionVoucher> {
    const next = mockVouchers.length + 1;
    const newVoucher: TransactionVoucher = {
      ...payload,
      id: next,
      voucherNo: `VCH-${String(next).padStart(3, '0')}`,
      status: 'APPROVED',
      createdAt: new Date().toISOString().split('T')[0],
    };
    mockVouchers = [...mockVouchers, newVoucher];
    return of(newVoucher).pipe(delay(500));
  }

  // Real: GET /api/transaction/vouchers
  getAllVouchers(): Observable<TransactionVoucher[]> {
    return of([...mockVouchers]).pipe(delay(300));
  }

  // Real: GET /api/transaction/voucher/{voucherNo}
  getVoucherByNo(voucherNo: string): Observable<TransactionVoucher | null> {
    const found = mockVouchers.find(v => v.voucherNo === voucherNo) ?? null;
    return of(found).pipe(delay(300));
  }

  // Real: GET /api/transaction/vouchers?ledgerName=Wages
  getVouchersByLedger(ledgerName: string): Observable<TransactionVoucher[]> {
    return of(mockVouchers.filter(v => v.ledgerName === ledgerName)).pipe(delay(300));
  }

  // ------------------------------------------------------------------
  // Fund (Add Fund)
  // Real: POST /api/transaction/fund
  // ------------------------------------------------------------------
  addFund(payload: Omit<TransactionFund, 'id' | 'fundNo' | 'createdAt'>): Observable<TransactionFund> {
    const next = mockFunds.length + 1;
    const newFund: TransactionFund = {
      ...payload,
      id: next,
      fundNo: `FND-${String(next).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    mockFunds = [...mockFunds, newFund];
    return of(newFund).pipe(delay(500));
  }

  // Real: GET /api/transaction/funds
  getAllFunds(): Observable<TransactionFund[]> {
    return of([...mockFunds]).pipe(delay(300));
  }

  // ------------------------------------------------------------------
  // Cashbook
  // Real: GET /api/transaction/cashbook?from=&to=
  // ------------------------------------------------------------------
  getCashbookSummary(from: string, to: string): Observable<CashbookSummary> {
    return of({ ...mockCashbookSummary, fromDate: from, toDate: to }).pipe(delay(500));
  }
}
