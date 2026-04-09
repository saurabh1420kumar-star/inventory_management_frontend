import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ============= DISTRIBUTOR MODELS =============

export interface DistributorDto {
  id: number;
  name: string;
  firmName?: string;
  lastName?: string;
  assignedPerson?: string;
  salesPersonRoleType?: string;
  salespersonId?: number;
  distributorType: string;
  companyType: string;
  contactEmail: string;
  phoneNumber: string;
  alternateContact?: string;
  address: string;
  state?: string;
  district?: string;
  pinCode?: string;
  aadhaarNumber: string;
  panNumber: string;
  gstNumber: string;
  status: string;
  creditLimit?: boolean;
  creditAmount?: number;
  bankGuaranteeNumber?: string;
  bgExpiryDate?: string;
  accountNumber?: string;
  accountName?: string;
  ifsc?: string;
  username?: string;
  password?: string;
  companyName?: string;
  createdOn: string;
  updatedOn: string;
}

/**
 * DISTRIBUTOR CREATION REQUEST
 * Used when creating a new distributor account with credentials
 */
export interface CreateDistributorRequest {
  firmName: string;
  assignedPerson: string;
  salesPersonRoleType: string;
  salespersonId: number;
  distributorType: string;
  companyType: string;
  contactEmail: string;
  phoneNumber: string;
  alternateContact?: string;
  address: string;
  state?: string;
  district?: string;
  pinCode?: string;
  aadhaarNumber: string;
  panNumber: string;
  gstNumber: string;
  status: string;
  creditLimit: boolean;
  creditAmount?: number;
  bankGuaranteeNumber?: string;
  bgExpiryDate?: string;
  username: string;
  password: string;
  accountNumber?: string;
  accountName?: string;
  ifsc?: string;
}

/**
 * GENERIC API RESPONSE WRAPPER
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ============= ORDER MODELS =============

export interface OrderCartItem {
  id: number;
  itemId: number;
  itemName: string;
  itemSku: string;
  priceAtTime: number;
  quantity: number;
  totalPrice: number;
}

export interface DistributorOrder {
  id: number;
  cartItems: OrderCartItem[];
  createdAt: string;
  distributorId: number;
  distributorName: string;
  salespersonId: number | null;
  salespersonName: string | null;
  status: 'APPROVED' | 'PAYMENT_APPROVED' | 'DISMISSED' | string;
  totalCartAmount: number;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DistributorService {
  private readonly baseUrl = environment.distributorUrl;

  constructor(private http: HttpClient) {}

  getAllDistributors(): Observable<ApiResponse<DistributorDto[]>> {
    return this.http.get<ApiResponse<DistributorDto[]>>(
      this.baseUrl
    );
  }

  /**
   * Create a new distributor account with credentials
   * @param payload CreateDistributorRequest object with all required fields
   * @returns Observable<ApiResponse<DistributorDto>>
   */
  createDistributor(
    payload: CreateDistributorRequest
  ): Observable<ApiResponse<DistributorDto>> {
    return this.http.post<ApiResponse<DistributorDto>>(
      `${this.baseUrl}/create-distributor`,
      payload
    );
  }

  updateDistributor(
    id: number,
    payload: any
  ): Observable<ApiResponse<DistributorDto>> {
    return this.http.put<ApiResponse<DistributorDto>>(
      `${this.baseUrl}/${id}`,
      payload
    );
  }

  getDistributorById(id: number): Observable<ApiResponse<DistributorDto>> {
    return this.http.get<ApiResponse<DistributorDto>>(
      `${this.baseUrl}/${id}`
    );
  }

  deleteDistributor(id: number): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(
      `${this.baseUrl}/${id}`
    );
  }

  getSalesPersons(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${environment.apiUrl}/hrmaster/salespersons`
    );
  }

  getKeyPersonsByRole(role: string): Observable<any[]> {
    console.log('🔄 API Request - GET /api/sales-hierarchy/by-role');
    console.log('📤 Role:', role);
    console.log('🌐 Full URL:', `${environment.apiUrl}/sales-hierarchy/by-role?role=${role}`);
    
    return this.http.get<any[]>(
      `${environment.apiUrl}/sales-hierarchy/by-role?role=${role}`
    ).pipe(
      catchError((error: any) => {
        console.error('❌ API Error Response:', error);
        return of([]);
      })
    );
  }

  /**
   * Get all orders for a specific distributor
   * @param distributorId The distributor ID (userId from login)
   * @returns Observable<ApiResponse<DistributorOrder[]>>
   */
  getDistributorOrders(distributorId: number | string): Observable<ApiResponse<DistributorOrder[]>> {
    return this.http.get<ApiResponse<DistributorOrder[]>>(
      `${this.baseUrl}/${distributorId}/orders`
    );
  }

  confirmOrder(distributorId: number, payload: {
    orderId: number;
    gdnNumber: string;
    status: string;
    overallRating: number;
    feedback: string;
    remarks: string;
    itemConfirmations: any[];
  }): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${distributorId}/confirm-order`,
      payload
    );
  }
}
