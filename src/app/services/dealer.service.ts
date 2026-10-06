// src/app/services/dealer.service.ts
// Wraps GET /api/dealers (environment.dealersUrl) — the global, unscoped dealer directory.
// Distinct from the distributor-scoped `GET /dealers/distributor/{id}` used elsewhere (e.g. distributor-dashboard).
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export interface DealerDto {
  id: number;
  fullName: string;
  phone: string;
  address: string;
  isActive: boolean;
  distributorId?: number;
  distributorName?: string;
}

@Injectable({ providedIn: 'root' })
export class DealerService {
  private baseUrl = environment.dealersUrl;

  constructor(private http: HttpClient, private auth: Auth) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ ...(token ? { Authorization: `Bearer ${token}` } : {}) });
  }

  // GET /api/dealers — every dealer across every distributor, not scoped to one.
  getAllDealers(): Observable<DealerDto[]> {
    return this.http.get<unknown>(this.baseUrl, { headers: this.getAuthHeaders() }).pipe(
      map((res) => {
        const list: any[] = Array.isArray(res) ? res : ((res as any)?.data ?? (res as any)?.dealers ?? []);
        return list.map((d: any) => ({
          id: d.id,
          fullName: d.fullName ?? d.full_name ?? d.name ?? '—',
          phone: d.phone ?? '',
          address: d.address ?? '',
          isActive: d.isActive ?? d.active ?? true,
          distributorId: d.distributorId ?? d.distributor?.id,
          distributorName: d.distributorName ?? d.distributor?.firmName ?? d.distributor?.name,
        }));
      }),
      catchError((err) => {
        console.error('Dealer API failed: GET /dealers', err);
        return of([] as DealerDto[]);
      })
    );
  }
}
