// src/app/services/reports.service.ts
// Wraps the backend `/api/reports/**` endpoints (see REPORTS_README.md).
// Only endpoints marked "Ready" or backend-fix-blocked-but-callable in that doc are exposed here;
// reports with no backend endpoint yet stay on client-side mock data in their page components.
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

type QueryValue = string | number | undefined | null;

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private reportsUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient, private auth: Auth) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  // Drops undefined/null/'all' filter values so they aren't sent as literal query strings.
  private buildParams(raw: Record<string, QueryValue>): Record<string, string> {
    const params: Record<string, string> = {};
    Object.entries(raw).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'all') return;
      params[key] = String(value);
    });
    return params;
  }

  // Backend list endpoints sometimes return a bare array and sometimes a Spring Page wrapper
  // ({ content: [...] }) or { data: [...] } — same defensive unwrap used in InventoryService / AdminApprovalService.
  private unwrapList<T>(res: unknown): T[] {
    if (Array.isArray(res)) return res as T[];
    const wrapped = res as { content?: T[]; data?: T[] } | null | undefined;
    return wrapped?.content ?? wrapped?.data ?? [];
  }

  private getList<T>(path: string, params: Record<string, QueryValue> = {}): Observable<T[]> {
    return this.http
      .get<unknown>(`${this.reportsUrl}${path}`, {
        headers: this.getAuthHeaders(),
        params: this.buildParams(params),
      })
      .pipe(
        map((res) => this.unwrapList<T>(res)),
        catchError((err) => {
          console.error(`Reports API failed: ${path}`, err);
          return of([] as T[]);
        })
      );
  }

  private getObject<T>(path: string, params: Record<string, QueryValue> = {}, fallback: T): Observable<T> {
    return this.http
      .get<T>(`${this.reportsUrl}${path}`, {
        headers: this.getAuthHeaders(),
        params: this.buildParams(params),
      })
      .pipe(catchError((err) => {
        console.error(`Reports API failed: ${path}`, err);
        return of(fallback);
      }));
  }

  // ── Inventory (Excel #3, #7) ──────────────────────────────────────────
  getInventorySnapshot(params: { category?: string; warehouse?: string; asOfDate?: string } = {}): Observable<any[]> {
    return this.getList('/inventory/snapshot', params);
  }

  getLowStock(params: { category?: string; warehouse?: string } = {}): Observable<any[]> {
    return this.getList('/inventory/low-stock', params);
  }

  // ── Production (Excel #13, #15, #17) ──────────────────────────────────
  getProductionLog(params: { plant?: string; product?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/production/log', params);
  }

  getBomConsumption(params: { plant?: string; product?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/production/bom-consumption', params);
  }

  // Per-product lifetime totals (qty / run count / cost) — no tab consumed this before.
  getProductionSummary(params: { plant?: string; product?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/production/summary', params);
  }

  // Per-date totals (qty / cost / run count).
  getProductionDailySummary(params: { plant?: string; product?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/production/daily-summary', params);
  }

  // Per-run cost breakdown (raw material cost + additional/manufacturing cost) — backs Production Cost Report tab.
  getProductionCost(params: { plant?: string; product?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/production/cost', params);
  }

  // One entry per finished product's active BOM, each carrying a nested `components[]` array — backs BOM Report tab.
  getBomReport(params: { plant?: string; product?: string } = {}): Observable<any[]> {
    return this.getList('/production/bom-report', params);
  }

  // ── Sales (Excel #19, #20, #21, #22, #27) ───────────────────────────────
  getInvoiceGrid(params: { dateFrom?: string; dateTo?: string; dealer?: string; distributor?: string; salesman?: string } = {}): Observable<any[]> {
    return this.getList('/sales/invoice-grid', params);
  }

  getMonthlyTrend(params: { dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/sales/monthly-trend', params);
  }

  getSalesByProduct(params: { dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/sales/by-product', params);
  }

  getSalesByDistributor(params: { dateFrom?: string; dateTo?: string; distributorId?: string } = {}): Observable<any[]> {
    return this.getList('/sales/by-distributor', params);
  }

  getTopProducts(params: { dateFrom?: string; dateTo?: string; limit?: number } = {}): Observable<any[]> {
    return this.getList('/sales/top-products', params);
  }

  // ── Sales Orders (Excel #26, #28) ───────────────────────────────────────
  getSalesOrdersGrid(params: { status?: string; distributorId?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/sales-orders/grid', params);
  }

  getSalesmanPerformance(params: { dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/sales-orders/salesman-performance', params);
  }

  // ── Dispatch (Register / Pending Dispatch / Delivery Confirmation tabs) ─
  getDispatchRegister(params: { dateFrom?: string; dateTo?: string; page?: number; size?: number } = {}): Observable<any[]> {
    return this.getList('/dispatch/register', { page: 0, size: 200, ...params });
  }

  getDispatchPending(params: { dateFrom?: string; dateTo?: string; page?: number; size?: number } = {}): Observable<any[]> {
    return this.getList('/dispatch/pending', { page: 0, size: 200, ...params });
  }

  getDeliveryConfirmation(params: { dateFrom?: string; dateTo?: string; page?: number; size?: number } = {}): Observable<any[]> {
    return this.getList('/dispatch/delivery-confirmation', { page: 0, size: 200, ...params });
  }

  // ── MIS Dashboard ────────────────────────────────────────────────────────
  getMisDashboard(params: { dateFrom?: string; dateTo?: string } = {}): Observable<any> {
    return this.getObject('/mis/dashboard', params, {});
  }

  // ── Receivables & Collections (Excel #25) ────────────────────────────────
  getCollectionHistory(params: { dateFrom?: string; dateTo?: string; distributorId?: string } = {}): Observable<any[]> {
    return this.getList('/receivables/collection-history', params);
  }

  // ── Inventory Issues (Excel #34, #35) ───────────────────────────────────
  getInventoryIssuesByType(itemType: 'PROMOTIONAL_ITEMS' | 'SPARE_PARTS', params: { dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/inventory-issues/by-type', { ...params, itemType });
  }

  // ── Stock Movement (Excel #1, #2, #4) ───────────────────────────────────
  // Filter param names (item/warehouse/dateFrom/dateTo) are unconfirmed against the backend —
  // sent defensively the same way other report filters are; harmless if the backend ignores them.
  getStockLedger(params: { item?: string; warehouse?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/stock-movement/ledger', params);
  }

  getSupplierWiseInward(params: { item?: string; warehouse?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/stock-movement/supplier-wise', params);
  }

  getMaterialInward(params: { item?: string; warehouse?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/stock-movement/material-inward', params);
  }

  // ── Scrap (Excel #36, #37, #38) ─────────────────────────────────────────
  getScrapLifecycle(params: { scrapType?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/scrap/lifecycle', params);
  }

  getScrapDisposalStatus(params: { scrapType?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/scrap/disposal-status', params);
  }

  getScrapRevenue(params: { scrapType?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any[]> {
    return this.getList('/scrap/revenue', params);
  }
}
