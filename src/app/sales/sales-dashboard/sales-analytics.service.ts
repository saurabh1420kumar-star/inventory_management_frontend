import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SalesAnalyticsData {
  salesCount: number;
  ordersCount: number;
  totalSalesAmount: number;
  period: 'today' | 'month' | 'year';
  month?: number;
  year?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SalesAnalyticsService {
  private apiUrl = `${environment.apiUrl}/sales/analytics`;
  private useMockData = true; // Set to false when API is ready

  constructor(private http: HttpClient) {}

  getSalesAnalytics(
    period: 'today' | 'month' | 'year',
    month?: number,
    year?: number
  ): Observable<SalesAnalyticsData> {
    
    // Return mock data for testing
    if (this.useMockData) {
      const mockData: SalesAnalyticsData = {
        salesCount: this.getMockSalesCount(period),
        ordersCount: this.getMockOrdersCount(period),
        totalSalesAmount: this.getMockSalesAmount(period),
        period,
        month,
        year
      };
      return of(mockData);
    }

    let params = new HttpParams().set('period', period);

    if (month !== undefined && month !== null) {
      params = params.set('month', month.toString());
    }

    if (year !== undefined && year !== null) {
      params = params.set('year', year.toString());
    }

    return this.http.get<SalesAnalyticsData>(this.apiUrl, { params });
  }

  // Mock data generators
  private getMockSalesCount(period: string): number {
    switch (period) {
      case 'today':
        return 12;
      case 'month':
        return 245;
      case 'year':
        return 2891;
      default:
        return 0;
    }
  }

  private getMockOrdersCount(period: string): number {
    switch (period) {
      case 'today':
        return 8;
      case 'month':
        return 156;
      case 'year':
        return 1834;
      default:
        return 0;
    }
  }

  private getMockSalesAmount(period: string): number {
    switch (period) {
      case 'today':
        return 45231;
      case 'month':
        return 856700;
      case 'year':
        return 9234500;
      default:
        return 0;
    }
  }
}

