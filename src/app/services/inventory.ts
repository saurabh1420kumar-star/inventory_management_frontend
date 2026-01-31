import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface InventoryItem {
  id: number;
  name: string;

  /** Raw material only */
  materialCode?: string;
  unit?: 'KG' | 'LITER' | 'PIECE' | 'METER';

  /** Machine parts only */
  partCode?: string;
  partNumber?: string;
  vendor?: string;
  condition?: string;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  active?: boolean;

  /** Common */
  quantity: number;
  minimumThreshold?: number;
  lowStock?: boolean;

  /**
   * Allowed categories coming from backend
   */
  category?: 'raw_material'
    | 'finished_product'
    | 'TOOL'
    | 'SPARE_PART'
    | 'MACHINE';

  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  private rawMaterialsUrl = `${environment.productsUrl}/raw-materials`;
  private finishedProductsUrl = `${environment.productsUrl}/finished-products`;
  private machinePartsUrl = `${environment.productsUrl}/machine-parts`;

  constructor(private http: HttpClient) {}

  // =======================================
  // 🔹 MASTER INVENTORY (RAW + FINISHED ONLY)
  // =======================================
  getAllItems(): Observable<InventoryItem[]> {
    const raw$ = this.http.get<InventoryItem[]>(
      `${this.rawMaterialsUrl}`
    ).pipe(map(items =>
      items.map(i => ({
        ...i,
        category: 'raw_material' as const
      }))
    ));

    const finished$ = this.http.get<InventoryItem[]>(
      `${this.finishedProductsUrl}`
    ).pipe(map(items =>
      items.map(i => ({
        ...i,
        category: 'finished_product' as const
      }))
    ));

    return forkJoin([raw$, finished$]).pipe(
      map(([raw, finished]) => [...raw, ...finished])
    );
  }

  // =======================================
  // 🔹 MACHINE PART INVENTORY (TOOLS + SPARE_PART + MACHINE)
  // =======================================
  getMachineParts(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(
      `${this.machinePartsUrl}`
    ).pipe(
      map(items =>
        items.map(item => ({
          ...item,
          category: ['TOOL', 'SPARE_PART', 'MACHINE'].includes(
            item.category?.toUpperCase() || ''
          )
            ? item.category as InventoryItem['category']
            : 'SPARE_PART'
        }))
      )
    );
  }

  // =======================================
  // 🔹 CREATE NEW RECORD
  // =======================================
  createItem(item: Partial<InventoryItem>): Observable<InventoryItem> {
    // raw or finished → routed correctly
    if (item.category === 'raw_material') {
      return this.http.post<InventoryItem>(
        `${this.rawMaterialsUrl}`,
        item
      );
    }

    if (item.category === 'finished_product') {
      return this.http.post<InventoryItem>(
        `${this.finishedProductsUrl}`,
        item
      );
    }

    // Anything else → machine parts
    return this.http.post<InventoryItem>(
      `${this.machinePartsUrl}`,
      item
    );
  }

  // =======================================
  // 🔹 UPDATE EXISTING RECORD
  // =======================================
  updateItem(id: number, item: Partial<InventoryItem>): Observable<InventoryItem> {
    if (item.category === 'raw_material') {
      return this.http.put<InventoryItem>(
        `${this.rawMaterialsUrl}/${id}`,
        item
      );
    }

    if (item.category === 'finished_product') {
      return this.http.put<InventoryItem>(
        `${this.finishedProductsUrl}/${id}`,
        item
      );
    }

    return this.http.put<InventoryItem>(
      `${this.machinePartsUrl}/${id}`,
      item
    );
  }

  // =======================================
  // 🔹 DELETE RECORD
  // =======================================
  deleteItem(id: number, category: InventoryItem['category']): Observable<void> {
    if (category === 'raw_material') {
      return this.http.delete<void>(
        `${this.rawMaterialsUrl}/${id}`
      );
    }

    if (category === 'finished_product') {
      return this.http.delete<void>(
        `${this.finishedProductsUrl}/${id}`
      );
    }

    return this.http.delete<void>(
      `${this.machinePartsUrl}/${id}`
    );
  }
}
