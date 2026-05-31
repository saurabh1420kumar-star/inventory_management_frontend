import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface TimePeriodMetrics {
  totalSales: number;
  transactionCount: number;
  averageOrderValue: number;
  salesByRegion?: { [key: string]: number };
  salesByCategory?: { [key: string]: number };
}

export interface UserStats {
  dealers: number;
  distributors: number;
  salespersons: number;
  totalUsers: number;
  users: number;
}

export interface MonthlySalesMonth {
  month: string;
  year: number;
  revenue: number;
  orderCount: number;
}

export interface MonthlySalesResponse {
  financialYear: string;
  months: MonthlySalesMonth[];
}

export interface DashboardAnalytics {
  monthToDate: TimePeriodMetrics;
  weekToDate: TimePeriodMetrics;
  yearToDate: TimePeriodMetrics;
  salesByCategory: { [key: string]: number };
  salesByRegion: { [key: string]: number };
  salesByMonth?: { [key: string]: number };
  ordersByMonth?: { [key: string]: number };
  totalAmount: number;
  totalOrders: number;
  userStats: UserStats;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private dashboardUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  /**
   * Get dashboard analytics data
   * Works for both web (distributor/salesperson) and mobile interfaces
   * API: GET https://api.imsnectarorigin.com/api/dashboard/analytics
   * 
   * Returns:
   * {
   *   monthToDate: { totalSales, transactionCount, averageOrderValue },
   *   weekToDate: { totalSales, transactionCount, averageOrderValue },
   *   yearToDate: { totalSales, transactionCount, averageOrderValue },
   *   salesByCategory: { category: amount },
   *   salesByRegion: { region: amount }
   * }
   */
  getAnalytics(): Observable<DashboardAnalytics> {
    return this.http.get<DashboardAnalytics>(
      `${this.dashboardUrl}/analytics`
    ).pipe(
      catchError(err => {
        console.error('Failed to fetch dashboard analytics:', err);
        return of({} as DashboardAnalytics);
      })
    );
  }

  getMonthlySales(): Observable<MonthlySalesResponse> {
    return this.http.get<MonthlySalesResponse>(
      `${this.dashboardUrl}/monthly-sales`
    ).pipe(
      catchError(err => {
        console.error('Failed to fetch monthly sales:', err);
        return of({ financialYear: '', months: [] });
      })
    );
  }

  /**
   * Get analytics for Distributor Dashboard
   */
  getDistributorAnalytics(distributorId: number): Observable<any> {
    return this.http.get<any>(
      `${this.dashboardUrl}/analytics?distributorId=${distributorId}`
    ).pipe(
      catchError(err => {
        console.error('Failed to fetch distributor analytics:', err);
        return of(null);
      })
    );
  }

  /**
   * Get analytics for Salesperson Dashboard
   */
  getSalespersonAnalytics(salespersonId: number): Observable<any> {
    return this.http.get<any>(
      `${this.dashboardUrl}/analytics?salespersonId=${salespersonId}`
    ).pipe(
      catchError(err => {
        console.error('Failed to fetch salesperson analytics:', err);
        return of(null);
      })
    );
  }
}
