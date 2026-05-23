import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'https://api.imsnectarorigin.com/api/accounts/update-balance-with-salesperson';

  constructor(private http: HttpClient) {}

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
    const url = 'https://api.imsnectarorigin.com/api/accounts/ledger-updated-payments';
    const params = { salespersonId: salespersonId.toString() };
    return this.http.get<any>(url, { params });
  }

  getPendingPayments(salespersonId: number): Observable<any> {
    const pendingPaymentsUrl = 'https://api.imsnectarorigin.com/api/accounts/pending-payments';
    const params = {
      salespersonId: salespersonId.toString()
    };
    return this.http.get<any>(pendingPaymentsUrl, { params });
  }
}
