import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export interface GDN {
  id: number;
  gdnNumber: string;
  orderId: number;
  transportName: string;
  totalPackages: number;
  totalWeight: number;
  deliveryMethod: string;
  dispatchFromAddress: string;
  shippingAddress: string;
  vehicleNo: string;
  driverName: string;
  driverMobile: string;
  gdnDate: string;
  pdfUrl: string | null;
  hasPdf: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GdnService {
  private apiUrl = `${environment.apiUrl}/dispatch/gdn`;

  constructor(private http: HttpClient, private auth: Auth) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Get all GDNs
   */
  getAllGdns(): Observable<GDN[]> {
    return this.http.get<GDN[]>(`${this.apiUrl}/all`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Download GDN PDF
   * @param id GDN ID or identifier
   */
  downloadGdnPdf(id: number | string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    });
  }

  /**
   * Get GDN details by ID
   * @param id GDN ID
   */
  getGdnDetails(id: number): Observable<GDN> {
    return this.http.get<GDN>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }
}
