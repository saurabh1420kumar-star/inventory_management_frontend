import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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


@Injectable({ providedIn: 'root' })
export class TransactionService {
  constructor(private http: HttpClient) {}

  // ------------------------------------------------------------------
  // Ledger CRUD
  // Real: POST /api/transaction/ledger
  // ------------------------------------------------------------------
  createLedger(payload: Omit<TransactionLedger, 'id' | 'createdAt'>): Observable<TransactionLedger> {
    return this.http.post<TransactionLedger>(
      `${environment.apiUrl}/transaction/ledger`,
      payload
    );
  }

  // Real: GET /api/transaction/ledgers
  getAllLedgers(): Observable<TransactionLedger[]> {
    return this.http.get<TransactionLedger[]>(`${environment.apiUrl}/transaction/ledgers`);
  }

  // Real: GET /api/transaction/ledgers?type=EXPENSE|INCOME
  getLedgersByType(type: 'EXPENSE' | 'INCOME'): Observable<TransactionLedger[]> {
    return this.http.get<TransactionLedger[]>(`${environment.apiUrl}/transaction/ledgers`, {
      params: { type }
    });
  }

  // ------------------------------------------------------------------
  // Voucher CRUD
  // Real: POST /api/transaction/voucher
  // ------------------------------------------------------------------
  createVoucher(payload: Omit<TransactionVoucher, 'id' | 'voucherNo' | 'createdAt' | 'status'>): Observable<TransactionVoucher> {
    return this.http.post<TransactionVoucher>(
      `${environment.apiUrl}/transaction/voucher`,
      payload
    );
  }

  // Real: GET /api/transaction/vouchers
  getAllVouchers(): Observable<TransactionVoucher[]> {
    return this.http.get<TransactionVoucher[]>(`${environment.apiUrl}/transaction/vouchers`);
  }

  // Real: GET /api/transaction/voucher/{voucherNo}
  getVoucherByNo(voucherNo: string): Observable<TransactionVoucher | null> {
    return this.http.get<TransactionVoucher | null>(
      `${environment.apiUrl}/transaction/voucher/${voucherNo}`
    );
  }

  // Real: GET /api/transaction/vouchers?ledgerName=Wages
  getVouchersByLedger(ledgerName: string): Observable<TransactionVoucher[]> {
    return this.http.get<TransactionVoucher[]>(`${environment.apiUrl}/transaction/vouchers`, {
      params: { ledgerName }
    });
  }

  // ------------------------------------------------------------------
  // Fund (Add Fund)
  // Real: POST /api/transaction/fund
  // ------------------------------------------------------------------
  addFund(payload: Omit<TransactionFund, 'id' | 'fundNo' | 'createdAt'>): Observable<TransactionFund> {
    return this.http.post<TransactionFund>(
      `${environment.apiUrl}/transaction/fund`,
      payload
    );
  }

  // Real: GET /api/transaction/funds
  getAllFunds(): Observable<TransactionFund[]> {
    return this.http.get<TransactionFund[]>(`${environment.apiUrl}/transaction/funds`);
  }

  // ------------------------------------------------------------------
  // Cashbook
  // Real: GET /api/transaction/cashbook?from=&to=
  // ------------------------------------------------------------------
  getCashbookSummary(from: string, to: string): Observable<CashbookSummary> {
    return this.http.get<CashbookSummary>(`${environment.apiUrl}/transaction/cashbook`, {
      params: { from, to }
    });
  }
}
