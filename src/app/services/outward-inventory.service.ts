import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OutwardRecord {
  id: number;
  itemType: 'spare_parts' | 'promotional_items' | 'scrap_material';
  section: 'outward_giving' | 'returned_part' | 'selling_scrap';
  matCode: string;
  matName: string;
  unit: 'KG' | 'DOZEN' | 'PIECE' | 'LITER';
  quantity: number;
  desiredQuotedPrice?: number;
  comments?: string;
  createdAt: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OutwardInventoryService {

  private readonly baseUrl = `${environment.productsUrl}/outward-inventory`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<OutwardRecord[]> {
    return this.http.get<OutwardRecord[]>(this.baseUrl);
  }

  getById(id: number): Observable<OutwardRecord> {
    return this.http.get<OutwardRecord>(`${this.baseUrl}/${id}`);
  }

  create(payload: Partial<OutwardRecord>): Observable<OutwardRecord> {
    return this.http.post<OutwardRecord>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<OutwardRecord>): Observable<OutwardRecord> {
    return this.http.put<OutwardRecord>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
