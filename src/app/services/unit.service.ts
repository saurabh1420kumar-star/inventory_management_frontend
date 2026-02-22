import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Unit {
  id: number;
  name: string;
  code: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class UnitService {
  private readonly baseUrl = `${environment.apiUrl}/units`;

  constructor(private http: HttpClient) {}

  /**
   * Get all units
   */
  getAllUnits(): Observable<Unit[]> {
    return this.http.get<Unit[]>(this.baseUrl);
  }

  /**
   * Get unit by ID
   */
  getUnitById(id: number): Observable<Unit> {
    return this.http.get<Unit>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new unit
   */
  createUnit(payload: Partial<Unit>): Observable<Unit> {
    return this.http.post<Unit>(this.baseUrl, payload);
  }

  /**
   * Update existing unit
   */
  updateUnit(id: number, payload: Partial<Unit>): Observable<Unit> {
    return this.http.put<Unit>(`${this.baseUrl}/${id}`, payload);
  }

  /**
   * Delete unit by ID
   */
  deleteUnit(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Toggle unit status
   */
  toggleUnitStatus(id: number): Observable<Unit> {
    return this.http.patch<Unit>(`${this.baseUrl}/${id}/toggle-status`, {});
  }
}
