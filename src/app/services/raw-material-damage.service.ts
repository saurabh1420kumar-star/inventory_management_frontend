import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type DamageReason = 'Expired' | 'Physical damage' | 'Quality issue' | 'Other';

// POST /products/raw-materials/{id}/damaged — request body
export interface RawMaterialDamagePayload {
  quantity: number;
  reason: string;
  notes?: string;
  damagedBy?: string;
}

// Response of POST (201) and each element of GET /products/raw-materials/{id}/damaged (newest first).
// Damage records are an audit trail — the backend exposes no update or delete.
export interface RawMaterialDamage {
  id: number;
  rawMaterialId: number;
  rawMaterialName: string;
  materialCode?: string;
  quantityDamaged: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  notes?: string | null;
  damagedBy?: string | null;
  damagedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class RawMaterialDamageService {
  private http = inject(HttpClient);
  private rawMaterialsUrl = `${environment.productsUrl}/raw-materials`;

  /** Write off damaged quantity for one raw material. */
  recordDamage(rawMaterialId: number, payload: RawMaterialDamagePayload): Observable<RawMaterialDamage> {
    return this.http.post<RawMaterialDamage>(`${this.rawMaterialsUrl}/${rawMaterialId}/damaged`, payload);
  }

  /** Damage log for one raw material, newest first. */
  getDamageHistory(rawMaterialId: number): Observable<RawMaterialDamage[]> {
    return this.http.get<unknown>(`${this.rawMaterialsUrl}/${rawMaterialId}/damaged`).pipe(
      map(res => {
        if (Array.isArray(res)) return res as RawMaterialDamage[];
        const wrapped = res as { content?: RawMaterialDamage[]; data?: RawMaterialDamage[] } | null;
        return wrapped?.content ?? wrapped?.data ?? [];
      })
    );
  }
}
