import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface InventoryItem {
  id: number;
  name: string;
  hsn?: string;
  taxRateCode?: string;
  imageUrl?: string;

  /** Raw material only */
  materialCode?: string;
  unit?: 'KG' | 'LITER' | 'PIECE' | 'METER' | 'PIECES' | 'DOZEN';
  price?: number;  // Unit cost/price from API
  perItemPrice?: number;  // Per item price (used in BOM)

  /** Scrap / promotional / spare parts */
  itemCode?: string;

  /** Finished product */
  sku?: string;

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
    | 'MACHINE'
    | 'spare_parts'
    | 'promotional_items'
    | 'scrap_material'
    | 'unit_master';

  createdAt: string;
  updatedAt: string;
}

/* ========== BILL OF MATERIALS ========== */

export interface BOMComponent {
  id?: number;
  rawMaterialId: number;
  rawMaterialName: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  contributionPercent?: number;
}

export interface AdditionalCost {
  id?: number;
  type: string;
  percentage: number;
  amount: number;
}

export interface BillOfMaterial {
  id?: number;
  finishedProductId: number;
  finishedProductName: string;
  bomName: string;
  outputQuantity: number;
  outputUnit: string;
  costAllocationPercent: number;
  components: BOMComponent[];
  additionalCosts: AdditionalCost[];
  totalComponentCost: number;
  totalAdditionalCost: number;
  effectiveCost: number;
  effectiveRatePerUnit: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  private rawMaterialsUrl = `${environment.productsUrl}/raw-materials`;
  private finishedProductsUrl = `${environment.productsUrl}/finished-products/all`;
  private finishedProductsCrudUrl = `${environment.productsUrl}/finished-products`;
  private machinePartsUrl = `${environment.productsUrl}/machine-parts`;
  private promotionalItemsUrl = `${environment.productsUrl}/promotional-items`;
  private scrapItemsUrl = `${environment.productsUrl}/scrap-items`;
  private bomUrl = `${environment.productsUrl}/bom`;

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
    const { category, ...payload } = item;

    if (category === 'raw_material') {
      return this.http.post<InventoryItem>(this.rawMaterialsUrl, payload);
    }
    if (category === 'finished_product') {
      return this.http.post<InventoryItem>(this.finishedProductsCrudUrl, payload);
    }
    if (category === 'spare_parts') {
      return this.http.post<InventoryItem>(this.machinePartsUrl, payload);
    }
    if (category === 'promotional_items') {
      return this.http.post<InventoryItem>(this.promotionalItemsUrl, payload);
    }
    if (category === 'scrap_material') {
      return this.http.post<InventoryItem>(this.scrapItemsUrl, payload);
    }

    // Fallback → machine parts
    return this.http.post<InventoryItem>(this.machinePartsUrl, payload);
  }

  createItemWithImage(
    category: InventoryItem['category'],
    item: Partial<InventoryItem>,
    imageFile: File
  ): Observable<InventoryItem> {
    const formData = new FormData();
    
    // Build the request payload object
    const requestPayload: any = {};
    Object.entries(item).forEach(([key, value]) => {
      if (key !== 'category' && value !== undefined && value !== null && value !== '') {
        requestPayload[key] = value;
      }
    });
    
    // Append the request field as JSON Blob with proper MIME type
    const requestBlob = new Blob([JSON.stringify(requestPayload)], { type: 'application/json' });
    formData.append('request', requestBlob);
    
    // Append the image file
    formData.append('image', imageFile);

    if (category === 'raw_material') {
      return this.http.post<InventoryItem>(this.rawMaterialsUrl, formData);
    }
    if (category === 'finished_product') {
      return this.http.post<InventoryItem>(this.finishedProductsCrudUrl, formData);
    }

    return this.createItem({ category, ...item });
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
        `${this.finishedProductsCrudUrl}/${id}`,
        item
      );
    }

    return this.http.put<InventoryItem>(
      `${this.machinePartsUrl}/${id}`,
      item
    );
  }

  // =======================================
  // 🔹 UPDATE EXISTING RECORD WITH IMAGE
  // =======================================
  updateItemWithImage(
    id: number,
    category: InventoryItem['category'],
    item: Partial<InventoryItem>,
    imageFile: File
  ): Observable<InventoryItem> {
    const formData = new FormData();

    // Build the request payload object (exclude category and undefined/null/empty values)
    const requestPayload: any = {};
    Object.entries(item).forEach(([key, value]) => {
      if (key !== 'category' && value !== undefined && value !== null && value !== '') {
        requestPayload[key] = value;
      }
    });

    console.log('📤 Updating item with image:', { id, category, payload: requestPayload });

    // Append the request field as JSON Blob with proper MIME type
    const requestBlob = new Blob([JSON.stringify(requestPayload)], { type: 'application/json' });
    formData.append('request', requestBlob);

    // Append the image file
    formData.append('image', imageFile);

    if (category === 'raw_material') {
      console.log('📤 Sending to raw-materials endpoint:', `${this.rawMaterialsUrl}/${id}`);
      return this.http.put<InventoryItem>(
        `${this.rawMaterialsUrl}/${id}`,
        formData
      );
    }

    if (category === 'finished_product') {
      console.log('📤 Sending to finished-products endpoint:', `${this.finishedProductsCrudUrl}/${id}`);
      return this.http.put<InventoryItem>(
        `${this.finishedProductsCrudUrl}/${id}`,
        formData
      );
    }

    return this.updateItem(id, item);
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
        `${this.finishedProductsCrudUrl}/${id}`
      );
    }

    return this.http.delete<void>(
      `${this.machinePartsUrl}/${id}`
    );
  }

  // =======================================
  // 🔹 FETCH RAW MATERIALS & FINISHED PRODUCTS (for BOM dropdowns)
  // =======================================
  getRawMaterials(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(
      `${this.rawMaterialsUrl}`
    ).pipe(
      map(items =>
        items.map(i => ({
          ...i,
          category: 'raw_material' as const
        }))
      ),
      catchError(() => of([]))
    );
  }

  getFinishedProducts(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(
      `${this.finishedProductsUrl}`
    ).pipe(
      map(items =>
        items.map(i => ({
          ...i,
          category: 'finished_product' as const
        }))
      ),
      catchError(() => of([]))
    );
  }

  getPromotionalItems(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(
      `${this.promotionalItemsUrl}`
    ).pipe(
      map(items =>
        items.map(i => ({
          ...i,
          category: 'promotional_items' as const
        }))
      ),
      catchError(() => of([]))
    );
  }

  getScrapItems(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(
      `${this.scrapItemsUrl}`
    ).pipe(
      map(items =>
        items.map(i => ({
          ...i,
          category: 'scrap_material' as const
        }))
      ),
      catchError(() => of([]))
    );
  }

  // =======================================
  // 🔹 BILL OF MATERIALS (BOM)
  // =======================================

  getBOMs(): Observable<BillOfMaterial[]> {
    return this.http.get<BillOfMaterial[]>(this.bomUrl).pipe(
      catchError(() => of([]))
    );
  }

  getBOMsList(page: number = 0, size: number = 10, sortBy: string = 'createdAt', sortDir: string = 'desc'): Observable<any> {
    const url = `${environment.apiUrl}/bill-of-materials/list?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    return this.http.get<any>(url).pipe(
      catchError(() => of({ content: [], totalElements: 0 }))
    );
  }

  getBOMSSummary(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/bill-of-materials/summary`).pipe(
      catchError(() => of({}))
    );
  }

  getBOMsByProduct(finishedProductId: number): Observable<BillOfMaterial[]> {
    return this.http.get<BillOfMaterial[]>(
      `${this.bomUrl}/product/${finishedProductId}`
    ).pipe(catchError(() => of([])));
  }

  createBOM(bom: Partial<BillOfMaterial>): Observable<BillOfMaterial> {
    return this.http.post<BillOfMaterial>(
      `${environment.apiUrl}/bill-of-materials/create`,
      bom
    );
  }

  updateBOM(id: number, bom: Partial<BillOfMaterial>): Observable<BillOfMaterial> {
    return this.http.put<BillOfMaterial>(
      `${environment.apiUrl}/bill-of-materials/update/${id}`,
      bom
    );
  }

  deleteBOM(id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/bill-of-materials/delete/${id}`
    );
  }
}
