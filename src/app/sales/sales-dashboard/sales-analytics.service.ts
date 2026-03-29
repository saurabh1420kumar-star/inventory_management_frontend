import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SalesAnalyticsData {
  period: string;
  totalAmount: number;
  totalOrders: number;
}

@Injectable({
  providedIn: 'root'
})
export class SalesAnalyticsService {
  private apiUrl = `${environment.apiUrl}/dashboard/orders`;

  constructor(private http: HttpClient) {}

  getSalesAnalytics(
    period: 'today' | 'month' | 'year',
    salespersonId: number
  ): Observable<SalesAnalyticsData> {
    const params = new HttpParams()
      .set('period', period)
      .set('salespersonId', salespersonId.toString());

    return this.http.get<SalesAnalyticsData>(this.apiUrl, { params });
  }
}

