import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root',
})
export class AccountsService {
  private readonly apiUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient, private auth: Auth) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  /**
   * GET /api/accounts/pending-pi-payments
   * Returns all pending PI payment requests.
   */
  getPendingPiPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pending-pi-payments`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * GET /api/accounts/all-pending-payments
   * Returns all pending payment cards for the Payment Request page.
   */
  getAllPendingPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all-pending-payments`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * POST /api/accounts/approve-payment/{paymentId}?distributorId={distributorId}
   */
  approvePayment(paymentId: number, distributorId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/approve-payment/${paymentId}?distributorId=${distributorId}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * POST /api/accounts/payment-rejection/{paymentId}?rejectedBy={userId}
   * Body: { reason: string }
   */
  rejectPayment(paymentId: number, rejectedBy: number, reason: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/payment-rejection/${paymentId}?rejectedBy=${rejectedBy}`,
      { reason },
      { headers: this.getAuthHeaders() }
    );
  }
}
