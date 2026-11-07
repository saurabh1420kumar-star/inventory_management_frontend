// src/app/services/dealer.service.ts
// Wraps GET /api/dealers (environment.dealersUrl) — the global, unscoped dealer directory.
// Distinct from the distributor-scoped `GET /dealers/distributor/{id}` used elsewhere (e.g. distributor-dashboard).
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export type DealerStatus = 'ACTIVE' | 'SUSPENDED';

// Backend may send `status` ("ACTIVE" | "SUSPENDED") or only the legacy `isActive` flag — accept either.
function resolveDealerStatus(d: any): DealerStatus {
  const raw = typeof d?.status === 'string' ? d.status.trim().toUpperCase() : '';
  if (raw === 'SUSPENDED') return 'SUSPENDED';
  if (raw === 'ACTIVE') return 'ACTIVE';
  return (d?.isActive ?? d?.active ?? true) === false ? 'SUSPENDED' : 'ACTIVE';
}

export interface DealerDto {
  id: number;
  fullName: string;
  phone: string;
  address: string;
  status?: DealerStatus;
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
          status: resolveDealerStatus(d),
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

  // Same GET /api/dealers, but a failure reaches the caller instead of becoming an empty list,
  // so the Dealers page can show a retry state rather than passing a failed load off as "no dealers".
  getDealerDirectory(): Observable<DealerDto[]> {
    return this.http.get<unknown>(this.baseUrl, { headers: this.getAuthHeaders() }).pipe(
      map((res) => {
        const list: any[] = Array.isArray(res) ? res : ((res as any)?.data ?? (res as any)?.dealers ?? []);
        return list.map((d: any) => ({
          id: d.id,
          fullName: d.fullName ?? d.full_name ?? d.name ?? '',
          phone: d.phone ?? '',
          address: d.address ?? '',
          status: resolveDealerStatus(d),
          isActive: d.isActive ?? d.active ?? true,
          distributorId: d.distributorId ?? d.distributor?.id,
          distributorName: d.distributorName ?? d.distributor?.firmName ?? d.distributor?.name,
        }));
      })
    );
  }

  // PATCH /api/dealers/{id}/status — body { status: "ACTIVE" | "SUSPENDED" }.
  updateDealerStatus(id: number, status: DealerStatus): Observable<unknown> {
    return this.http.patch<unknown>(`${this.baseUrl}/${id}/status`, { status }, { headers: this.getAuthHeaders() });
  }
}
