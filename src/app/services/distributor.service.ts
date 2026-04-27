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
  distributorCode?: string;
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

export interface DistributorStockItem {
  itemId: number;
  itemName: string;
  itemSku: string;
  totalQuantity: number;
  totalValue: number;
  unitPrice: number;
  unitType: string;
}

export interface DistributorStock {
  distributorId: number;
  distributorName: string;
  lastUpdated: string;
  stockItems: DistributorStockItem[];
  totalQuantity: number;
  totalStockValue: number;
  totalUniqueItems: number;
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

  getDistributorStock(id: number): Observable<ApiResponse<DistributorStock>> {
    return this.http.get<ApiResponse<DistributorStock>>(
      `${this.baseUrl}/${id}/stock`
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

  /**
   * Check if distributor can place a new order
   * 
   * BUTTON STATE LOGIC:
   * ❌ DISABLED if: ANY order in history has status = PLACED (currently being processed)
   * ✅ ENABLED if: No PLACED orders AND latest order status = ACTIVE, GDN_GENERATED, DISMISSED, GDN_REJECTED
   * ✅ ENABLED if: First order (no previous orders)
   */
  canDistributorPlaceOrder(orders: DistributorOrder[]): { canPlace: boolean; message: string; lastOrder?: DistributorOrder } {
    console.log('🔍 Checking order eligibility. Total orders:', orders.length);
    
    if (!orders || orders.length === 0) {
      console.log('✅ No previous orders - First order ALLOWED');
      return { 
        canPlace: true, 
        message: 'Ready to place your first order' 
      };
    }

    // ❌ CHECK 1: Is there ANY PLACED order in history?
    const placedOrders = orders.filter(o => o.status?.toUpperCase() === 'PLACED');
    if (placedOrders.length > 0) {
      console.log('❌ FOUND PLACED ORDER(S) in history:', placedOrders.length);
      placedOrders.forEach(o => {
        console.log('   - Order ID:', o.id, 'Status:', o.status, 'Created:', o.createdAt);
      });
      return {
        canPlace: false,
        message: `Cannot place new order yet. You have a previous order still in PLACED status waiting for GDN generation.`,
        lastOrder: placedOrders[0]
      };
    }

    // CHECK 2: Get the latest order
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const lastOrder = sortedOrders[0];
    const lastOrderStatus = lastOrder.status?.toUpperCase() || 'UNKNOWN';
    
    console.log('📋 Latest order status:', lastOrderStatus);

    // ✅ ENABLED statuses: can place next order
    const enabledStatuses = ['ACTIVE', 'GDN_GENERATED', 'DISMISSED', 'GDN_REJECTED'];
    if (enabledStatuses.includes(lastOrderStatus)) {
      console.log('✅', lastOrderStatus, ': Button ENABLED - Ready to place next order');
      return {
        canPlace: true,
        message: `Ready to place next order (Previous: ${lastOrderStatus})`,
        lastOrder
      };
    }

    // ❌ Any other status defaults to DISABLED (safety)
    console.log('❌ Status:', lastOrderStatus, '- Button DISABLED by default');
    return {
      canPlace: false,
      message: `Cannot place order yet. Previous order status: ${lastOrderStatus}. Please wait for GDN generation.`,
      lastOrder
    };
  }
}
