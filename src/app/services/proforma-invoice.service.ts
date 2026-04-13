import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export interface ProformaInvoice {
  id: number;
  piNumber: string;
  cartId: number;
  distributorId: number;
  amount: number;
  paymentStatus: 'PENDING' | 'PAID';
  createdAt: string;
  pdfUrl: string | null;
  hasPdf: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProformaInvoiceService {
  private apiUrl = `${environment.apiUrl}/order/proforma-invoice`;

  constructor(private http: HttpClient, private auth: Auth) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Get all proforma invoices
   */
  getAllInvoices(): Observable<ProformaInvoice[]> {
    return this.http.get<ProformaInvoice[]>(`${this.apiUrl}/all`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Download proforma invoice PDF
   * @param id Invoice ID or identifier
   */
  downloadInvoicePdf(id: number | string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    });
  }

  /**
   * Get paid invoices only
   */
  getPaidInvoices(): Observable<ProformaInvoice[]> {
    return this.http.get<ProformaInvoice[]>(`${this.apiUrl}/all`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get invoice details by ID
   * @param id Invoice ID
   */
  getInvoiceDetails(id: number): Observable<ProformaInvoice> {
    return this.http.get<ProformaInvoice>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Approve a proforma invoice for dispatch
   * @param piId The PI numeric ID
   * @param distributorId The distributor ID
   */
  approveProformaInvoice(piId: number, distributorId: number): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/accounts/approve-PI/${piId}?distributorId=${distributorId}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }
}
