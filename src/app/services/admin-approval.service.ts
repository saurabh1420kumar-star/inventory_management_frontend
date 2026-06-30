import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ── Inward (real API: /products/inward-approvals) ────────────────────
export interface InwardPayload {
  name?: string;
  materialCode?: string;
  vendorName?: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  price?: number;
  grossAmount?: number;
  invoiceNumber?: string;
  batchNumber?: string;
  [key: string]: unknown;
}

export interface InwardApproval {
  id: number;
  productCode?: string;
  productType?: string;
  requestedOn?: string;
  requestedBy?: string;
  requestPayload?: string;
  _payload?: InwardPayload;
  [key: string]: unknown;
}

// ── Distributor Invoice = order confirmations (real API) ─────────────
export interface OrderConfirmationItem {
  condition: string;
  dispatchedQuantity: number;
  itemId: number;
  itemName: string | null;
  itemRemarks: string;
  receivedQuantity: number;
}

export interface OrderConfirmation {
  id: number;
  adminComment: string | null;
  approvalStatus: string;
  confirmedAt: string;
  distributorId: number;
  feedback: string;
  gdnNumber: string;
  itemConfirmations: OrderConfirmationItem[];
  orderId: number;
  overallRating: number;
  remarks: string;
  status: string;
}

// ── Spare Part tab = scrap outward approvals (real API) ──────────────
export interface SparePartApproval {
  id: number;
  outwardTransactionId?: number;
  materialCode?: string;
  materialName?: string;
  quantity: number;
  quotedSellingPrice?: number;
  issuedTo?: string;
  approvalStatus?: string;
  requestedOn?: string;
  reviewedOn?: string;
  reviewedBy?: string;
  reviewComments?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApprovalService {
  constructor(private readonly http: HttpClient) {}

  private bearerHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  // ==================================================================
  // INWARD  (same endpoints used by Master Inventory → Inward Approvals)
  // ==================================================================

  // GET /products/inward-approvals/pending
  getInwardApprovals(): Observable<InwardApproval[]> {
    return this.http
      .get<unknown>(`${environment.apiUrl}/products/inward-approvals/pending`, { headers: this.bearerHeaders() })
      .pipe(
        map((res: any) => {
          const raw: any[] = Array.isArray(res) ? res : (res?.data ?? res?.content ?? []);
          return raw.map(a => {
            let payload: InwardPayload = {};
            try { payload = JSON.parse(a.requestPayload ?? '{}'); } catch { /* ignore malformed payload */ }
            return { ...a, _payload: payload } as InwardApproval;
          });
        })
      );
  }

  // POST /products/inward-approvals/{id}/process   body: { action, comments }
  processInward(id: number, action: 'APPROVE' | 'REJECT', comments: string, adminUsername: string): Observable<unknown> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Admin-Username': adminUsername,
    });
    return this.http.post<unknown>(
      `${environment.apiUrl}/products/inward-approvals/${id}/process`,
      { action, comments },
      { headers }
    );
  }

  // ==================================================================
  // DISTRIBUTOR INVOICE  (distributor order-confirmations)
  // ==================================================================

  // GET /distributors/order-confirmations/pending-approval
  getDistributorInvoiceApprovals(): Observable<OrderConfirmation[]> {
    return this.http
      .get<unknown>(`${environment.apiUrl}/distributors/order-confirmations/pending-approval`, { headers: this.bearerHeaders() })
      .pipe(map((res: any) => res?.data ?? (Array.isArray(res) ? res : [])));
  }

  // POST /distributors/order-confirmation/{confirmationId}/approve?action=&adminComment=
  // Single endpoint handles both APPROVE and REJECT via the `action` query param.
  processOrderConfirmation(id: number, action: 'APPROVE' | 'REJECT', adminComment: string): Observable<unknown> {
    let params = new HttpParams().set('action', action);
    if (adminComment) params = params.set('adminComment', adminComment);
    return this.http.post<unknown>(
      `${environment.apiUrl}/distributors/order-confirmation/${id}/approve`,
      null,
      { headers: this.bearerHeaders(), params }
    );
  }

  // ==================================================================
  // SPARE PART  (scrap outward approvals)
  // ==================================================================

  // GET /products/scrap-outward-approvals/pending
  getSparePartApprovals(): Observable<SparePartApproval[]> {
    return this.http
      .get<unknown>(`${environment.apiUrl}/products/scrap-outward-approvals/pending`, { headers: this.bearerHeaders() })
      .pipe(map((res: any) => (Array.isArray(res) ? res : (res?.data ?? res?.content ?? []))));
  }

  // POST /products/scrap-outward-approvals/{approvalId}/process   body: { action, comments }
  processSparePart(id: number, action: 'APPROVE' | 'REJECT', comments: string, adminUsername: string): Observable<unknown> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Admin-Username': adminUsername,
    });
    return this.http.post<unknown>(
      `${environment.apiUrl}/products/scrap-outward-approvals/${id}/process`,
      { action, comments },
      { headers }
    );
  }
}
