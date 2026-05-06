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
  issuedTo?: string;
  referenceNumber?: string;
}

export interface OutwardGivingPayload {
  itemType: 'SPARE_PARTS' | 'PROMOTIONAL_ITEMS' | 'SCRAP_MATERIAL';
  transactionType: 'OUTWARD_GIVING';
  materialCode: string;
  materialName: string;
  unit: 'KILOGRAMS' | 'DOZENS' | 'PIECES' | 'LITRES';
  quantity: number;
  comments: string;
  quotedSellingPrice: number;
  referenceNumber?: string;
  issuedTo?: string;
}

export interface OutwardItemResponse {
  id: number;
  itemType: 'SPARE_PARTS' | 'PROMOTIONAL_ITEMS' | 'SCRAP_MATERIAL';
  transactionType: 'OUTWARD_GIVING' | 'RETURNED_PART';
  materialCode: string;
  materialName: string;
  unit: 'KILOGRAMS' | 'DOZENS' | 'PIECES' | 'LITRES';
  quantity: number;
  comments?: string;
  quotedSellingPrice?: number;
  issuedTo?: string | null;
  referenceNumber?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OutwardInventoryService {

  private readonly baseUrl = `${environment.productsUrl}/outward-inventory`;
  private readonly outwardGivingUrl = `${environment.productsUrl}/outward-items`;

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

  createOutwardItem(payload: OutwardGivingPayload): Observable<unknown> {
    return this.http.post(this.outwardGivingUrl, payload);
  }

  getAllOutwardItems(): Observable<OutwardItemResponse[]> {
    return this.http.get<OutwardItemResponse[]>(this.outwardGivingUrl);
  }

  getOutwardItemsByType(itemType: OutwardGivingPayload['itemType']): Observable<OutwardItemResponse[]> {
    return this.http.get<OutwardItemResponse[]>(`${this.outwardGivingUrl}/type/${itemType}`);
  }

  getOutwardScrapItems(): Observable<OutwardItemResponse[]> {
    return this.http.get<OutwardItemResponse[]>(`${this.outwardGivingUrl}/scrap`);
  }

  update(id: number, payload: Partial<OutwardRecord>): Observable<OutwardRecord> {
    return this.http.put<OutwardRecord>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
