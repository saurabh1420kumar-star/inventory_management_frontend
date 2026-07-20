import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentRequest {
  distributorId: string;
  amount: number;
  method: string;
  reference: string;
  balanceType?: 'credit' | 'debit';
  date?: string;
  description?: string;
  paymentMethod?: string;
  utrNumber?: string;
  bankName?: string;
  chequeNumber?: string;
  transactionNumber?: string;
  notes?: string;
}

export interface PaymentResponse {
  message: string;
  paymentId?: number;
  status?: string;
  success?: boolean;
  data?: any;
}

export interface PendingPayment {
  id: number;
  distributorId: number;
  distributorName: string;
  amount: number;
  createdAt: string;
  description: string;
  status: string;
  transactionType: string;
  salespersonId: number;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly apiUrl: string;
  private readonly ledgerPaymentsUrl: string;
  private readonly pendingPaymentsUrl: string;

  constructor(private readonly http: HttpClient) {
    this.apiUrl = `${environment.apiUrl}/accounts/update-balance-with-salesperson`;
    this.ledgerPaymentsUrl = `${environment.apiUrl}/accounts/ledger-updated-payments`;
    this.pendingPaymentsUrl = `${environment.apiUrl}/accounts/pending-payments`;
  }

  submitPayment(paymentData: PaymentRequest, salespersonId: number): Observable<PaymentResponse> {
    const distributorId = parseInt(paymentData.distributorId);
    const transactionType = paymentData.balanceType === 'credit' ? 'CREDIT' : 'DEBIT';
    const description = paymentData.description || 'Payment';

    const params: any = {
      distributorId: distributorId.toString(),
      salespersonId: salespersonId.toString(),
      amount: paymentData.amount.toString(),
      transactionType: transactionType,
      description: description
    };

    if (paymentData.date) {
      params['date'] = paymentData.date;
    }

    return this.http.post<PaymentResponse>(this.apiUrl, {}, { params });
  }

  getPaymentStatus(paymentId: string): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.apiUrl}/${paymentId}`);
  }

  getPaymentHistory(distributorId: string): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.apiUrl}/distributor/${distributorId}`);
  }

  getLedgerUpdatedPaymentsBySalesperson(salespersonId: number): Observable<any> {
    const params = { salespersonId: salespersonId.toString() };
    return this.http.get<any>(this.ledgerPaymentsUrl, { params });
  }

  getPendingPayments(salespersonId: number): Observable<any> {
    const params = {
      salespersonId: salespersonId.toString()
    };
    return this.http.get<any>(this.pendingPaymentsUrl, { params });
  }
}
