import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export interface InvoiceDto {
  id: number;
  invoiceNumber: string;
  orderId: number;
  amount: number;
  status: string;
  createdAt: string;
  pdfUrl: string | null;
  hasPdf: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = `${environment.apiUrl}/invoices`;

  constructor(private http: HttpClient, private auth: Auth) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Get invoice details by order ID
   * GET /api/invoices/order/{orderId}
   */
  getInvoiceByOrder(orderId: number): Observable<InvoiceDto> {
    return this.http.get<InvoiceDto>(`${this.apiUrl}/order/${orderId}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Download invoice PDF by order ID
   * GET /api/invoices/order/{orderId}/download
   */
  downloadInvoicePdf(orderId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/order/${orderId}/download`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    });
  }
}
