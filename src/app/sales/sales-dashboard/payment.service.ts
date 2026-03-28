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

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = 'https://api.imsnectarorigin.com/api/accounts/update-balance';

  constructor(private http: HttpClient) {}

  submitPayment(paymentData: PaymentRequest): Observable<PaymentResponse> {
    const distributorId = parseInt(paymentData.distributorId);
    const transactionType = paymentData.balanceType === 'credit' ? 'CREDIT' : 'DEBIT';
    const description = paymentData.description || 'Payment';

    const params = {
      distributorId: distributorId.toString(),
      amount: paymentData.amount.toString(),
      transactionType: transactionType,
      description: description
    };

    return this.http.post<PaymentResponse>(this.apiUrl, {}, { params });
  }

  getPaymentStatus(paymentId: string): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.apiUrl}/${paymentId}`);
  }

  getPaymentHistory(distributorId: string): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.apiUrl}/distributor/${distributorId}`);
  }
}
