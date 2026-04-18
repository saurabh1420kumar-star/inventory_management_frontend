import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

// ── Interfaces ──────────────────────────────────────

export interface DispatchOrderItem {
  id: number;
  itemId: number;
  itemName: string;
  itemSku: string;
  price: number;        // field name from /dispatch/carts/payment-approved
  priceAtTime: number;  // field name from /order/placed-carts (may be absent)
  quantity: number;
  totalPrice: number;
}

export interface DispatchOrder {
  id: number;
  cartItems: DispatchOrderItem[];
  createdAt: string;
  distributorId: number | null;
  distributorName: string | null;
  salespersonId: number | null;
  salespersonName: string | null;
  status: string; // ACTIVE, APPROVED, DISMISSED
  totalCartAmount: number;
  updatedAt: string;
  address?: string;           // distributor's registered address from /carts/payment-approved
  distributorAddress?: string; // alternate field name for distributor address
  deliveryAddress?: string;    // alternate field name for delivery address
  registeredAddress?: string;  // alternate field name for registered address
  // GDN related fields (may come from API or be added locally)
  gdnNumber?: string;
  gdnDate?: string;
  dispatchDate?: string;
  vehicleNumber?: string;
  transporterName?: string;
  shippingAddress?: string;
}

// ── Interfaces for GET /api/accounts/payment-approved-orders ──

export interface PaymentApprovedItemDetail {
  id: number;
  name: string;
  description?: string;
  sku: string;
  unit?: string;
  weight?: number;
  unitType?: string;
  productSize?: string;
  unitName?: string;
  unitCode?: string;
  price: number;
  quantity?: number;
  imageUrl?: string | null;
}

export interface PaymentApprovedCartItem {
  id: number;
  item: PaymentApprovedItemDetail;
  quantity: number;
  priceAtTime: number;
  unitType?: string;
}

export interface PaymentApprovedOrder {
  id: number;
  status: string;
  distributorId: number;
  distributorName: string | null;
  salespersonId: number | null;
  salespersonName: string | null;
  totalCartAmount: number;
  createdAt: string;
  updatedAt: string;
  address?: string;
  cartItems: PaymentApprovedCartItem[];
}

export interface GdnGenerateRequest {
  dispatchFromAddress: string;
  shippingAddress: string;
  vehicleNo: string;
  transportName: string;
  driverName: string;
  driverMobile: string;
}

export interface GdnResponse {
  success: boolean;
  message: string;
  gdnNumber?: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DispatchService {
  private readonly orderApiUrl = `${environment.apiUrl}/order`;
  private readonly cartApiUrl = `${environment.apiUrl}/cart`;
  private readonly dispatchApiUrl = `${environment.apiUrl}/dispatch`;

  constructor(
    private http: HttpClient,
    private auth: Auth
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Get all pending order approvals
   * Same endpoint as sales page uses
   */
  getPendingOrderApprovals(): Observable<DispatchOrder[]> {
    return this.http.get<DispatchOrder[]>(`${this.orderApiUrl}/pending-order-approvals`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get all placed carts
   * GET /api/order/placed-carts
   */
  getActiveCarts(): Observable<DispatchOrder[]> {
    return this.http.get<DispatchOrder[]>(`${this.orderApiUrl}/placed-carts`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Approve an order
   * PUT /api/order/approve/{orderId}
   */
  approveOrder(orderId: number): Observable<any> {
    return this.http.put<any>(`${this.orderApiUrl}/approve/${orderId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Dismiss/Reject an order
   * DELETE /api/cart/{cartId}/dismiss
   */
  dismissOrder(cartId: number): Observable<any> {
    return this.http.delete<any>(`${this.cartApiUrl}/${cartId}/dismiss`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Reject GDN (payment-approved cart)
   * POST /api/dispatch/carts/{cartId}/reject-gdn
   */
  rejectGdn(cartId: number, reason: string): Observable<any> {
    return this.http.post<any>(
      `${this.dispatchApiUrl}/carts/${cartId}/reject-gdn`,
      { reason },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Approve PI Dispatch
   * POST /api/accounts/approve-PI/{orderId}?distributorId={distributorId}
   */
  approvePayment(orderId: number, distributorId: number): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/accounts/approve-PI/${orderId}?distributorId=${distributorId}`,
      {},
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Generate GDN (Goods Dispatch Note)
   * POST /api/dispatch/gdn/generate/{orderId}
   */
  generateGdn(orderId: number, payload: GdnGenerateRequest): Observable<GdnResponse> {
    return this.http.post<GdnResponse>(
      `${this.dispatchApiUrl}/gdn/generate/${orderId}`,
      payload,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Mark order as dispatched
   * PUT /api/dispatch/{orderId}/dispatch
   */
  markDispatchedOrder(orderId: number): Observable<any> {
    return this.http.put<any>(`${this.dispatchApiUrl}/${orderId}/dispatch`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get payment-approved orders from accounts service
   * GET /api/accounts/payment-approved-orders
   */
  getPaymentApprovedOrders(): Observable<PaymentApprovedOrder[]> {
    return this.http.get<PaymentApprovedOrder[]>(`${environment.apiUrl}/accounts/payment-approved-orders`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get all carts with PAYMENT_APPROVED status (ready for GDN generation)
   * GET /api/dispatch/carts/payment-approved
   */
  getPaymentApprovedCarts(): Observable<DispatchOrder[]> {
    return this.http.get<DispatchOrder[]>(`${this.dispatchApiUrl}/carts/payment-approved`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Verify inventory for an order before GDN generation
   * GET /api/dispatch/inventory/verify/{orderId}
   */
  verifyInventory(orderId: number): Observable<any> {
    const url = `${this.dispatchApiUrl}/inventory/verify/${orderId}`;
    console.log('Verify Inventory URL:', url);
    return this.http.get<any>(url, {
      headers: this.getAuthHeaders()
    });
  }
}
