import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export interface Distributor {
  id: string;
  name: string;
  salesPersonName: string;
  salesPerMonth: number;
  salesPerQuarter: number;
  salesPerYear: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingOrderItem {
  id: number;
  itemId: number;
  itemName: string;
  itemSku: string;
  priceAtTime: number;
  quantity: number;
  totalPrice: number;
}

export interface PendingOrder {
  id: number;
  cartItems: PendingOrderItem[];
  createdAt: string;
  distributorId: number | null;
  distributorName: string | null;
  salespersonId: number | null;
  salespersonName: string | null;
  status: string;
  totalCartAmount: number;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private apiUrl = `${environment.apiUrl}/distributors`;
  private salesMappingUrl = `${environment.apiUrl}/sales-mapping`;
  private orderApiUrl = `${environment.apiUrl}/order`;
  private cartApiUrl = `${environment.apiUrl}/cart`;

  constructor(private http: HttpClient, private auth: Auth) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  getAllDistributors(): Observable<Distributor[]> {
    return this.http.get<Distributor[]>(this.apiUrl);
  }

  getDistributorById(id: string): Observable<Distributor> {
    return this.http.get<Distributor>(`${this.apiUrl}/${id}`);
  }

  createDistributor(distributor: any): Observable<Distributor> {
    return this.http.post<Distributor>(this.apiUrl, distributor);
  }

  updateDistributor(id: string, distributor: any): Observable<Distributor> {
    return this.http.put<Distributor>(`${this.apiUrl}/${id}`, distributor);
  }

  deleteDistributor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleDistributorStatus(id: string): Observable<Distributor> {
    return this.http.patch<Distributor>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  getSalesMapping(): Observable<any> {
    return this.http.get<any>(this.salesMappingUrl);
  }

  getPendingOrderApprovals(): Observable<PendingOrder[]> {
    return this.http.get<PendingOrder[]>(`${this.orderApiUrl}/pending-order-approvals`);
  }

  /**
   * Get all placed carts
   * GET /api/order/placed-carts
   */
  getActiveCarts(): Observable<PendingOrder[]> {
    return this.http.get<PendingOrder[]>(`${this.orderApiUrl}/placed-carts`, { headers: this.getAuthHeaders() });
  }

  /**
   * Get carts ready for PI approval
   * GET /api/order/approve-carts
   */
  getApproveCarts(): Observable<PendingOrder[]> {
    return this.http.get<PendingOrder[]>(`${this.orderApiUrl}/approve-carts`, { headers: this.getAuthHeaders() });
  }

  approveOrder(cartId: number): Observable<any> {
    return this.http.put<any>(`${this.orderApiUrl}/approve/${cartId}`, {}, { headers: this.getAuthHeaders() });
  }

  approvePayment(orderId: number, distributorId: number): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/accounts/approve-payment/${orderId}?distributorId=${distributorId}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  dismissOrder(cartId: number, reason?: string): Observable<any> {
    return this.http.delete<any>(`${this.cartApiUrl}/${cartId}/dismiss`, {
      headers: this.getAuthHeaders(),
      body: reason ? { reason } : undefined,
    });
  }
}
