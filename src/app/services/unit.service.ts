import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/* ============================================
   RAW MATERIAL INTERFACE
   ============================================ */
export interface RawMaterial {
  id: number;
  category: 'Raw Material';
  name: string;
  materialCode: string;
  unit: 'KG' | 'LITER' | 'PIECE' | 'METER';
  unitType?: string;
  productSize?: string;
  unitName?: string;
  unitCode?: string;
  description?: string;
  quantity: number;
  minimumThreshold: number;
  status?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  sku?: null;
  price?: null;
  unitStatus?: null;
  unitDescription?: null;
}

/* ============================================
   FINISHED PRODUCT INTERFACE
   ============================================ */
export interface FinishedProduct {
  id: number;
  category: 'Finished Product';
  name: string;
  sku: string;
  description?: string;
  price: number;
  quantity: number;
  minimumThreshold?: number;
  status?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  materialCode?: null;
  unit?: null;
  unitType?: null;
  productSize?: null;
  unitName?: null;
  unitCode?: null;
  unitDescription?: null;
}

/* ============================================
   UNION TYPES AND INTERFACES
   ============================================ */
export type Unit = RawMaterial | FinishedProduct;

export interface CreateRawMaterialRequest {
  category: 'Raw Material';
  unitName: string;
  unitCode: number;
  unitType: 'KG' | 'LITER' | 'PIECE' | 'METER';
  productSize: 'small' | 'medium' | 'large';
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CreateFinishedProductRequest {
  category: 'Finished Product';
  name: string;
  sku: string;
  price: number;
  quantity: number;
  description?: string;
  minimumThreshold?: number;
  active: boolean;
}

export type CreateUnitRequest = CreateRawMaterialRequest | CreateFinishedProductRequest;

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
   * Get all units (both raw materials and finished products)
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
   * Create a new unit (raw material or finished product)
   */
  createUnit(payload: CreateUnitRequest): Observable<ApiResponse<Unit>> {
    return this.http.post<ApiResponse<Unit>>(this.baseUrl, payload);
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

  /**
   * Check if unit is a raw material
   */
  isRawMaterial(unit: Unit): unit is RawMaterial {
    return unit.category === 'Raw Material';
  }

  /**
   * Check if unit is a finished product
   */
  isFinishedProduct(unit: Unit): unit is FinishedProduct {
    return unit.category === 'Finished Product';
  }
}
