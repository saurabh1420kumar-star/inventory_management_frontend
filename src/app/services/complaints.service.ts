import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export interface Complaint {
  id: number;
  type: string;
  fullName: string;
  emailAddress: string;
  phoneNumber: string;
  category: 'PAYMENT' | 'ACCOUNT' | 'TECHNICAL' | 'DELIVERY' | 'OTHER';
  subject: string;
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  comment?: string | null;
  salespersonId?: number | null;
  distributorId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplaintRequest {
  type: string;
  fullName: string;
  emailAddress: string;
  phoneNumber: string;
  category: string;
  subject: string;
  priorityLevel: string;
  description: string;
  salespersonId?: number | null;
  distributorId?: number | null;
}

export interface ComplaintsResponse {
  success: boolean;
  message: string;
  data: {
    content: Complaint[];
    empty: boolean;
    first: boolean;
    last: boolean;
    number: number;
    numberOfElements: number;
    pageable: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ComplaintsService {
  private apiUrl = `${environment.apiUrl}/complaints`;

  constructor(
    private http: HttpClient,
    private auth: Auth
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Create a new complaint
   * POST /api/complaints/create
   */
  createComplaint(complaint: CreateComplaintRequest): Observable<any> {
    console.log('🎯 Submitting complaint to:', `${this.apiUrl}/create`);
    console.log('📦 Payload:', complaint);
    console.log('🔐 Token present:', !!this.auth.getToken());
    
    return this.http.post<any>(`${this.apiUrl}/create`, complaint, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get all complaints with pagination
   * GET /api/complaints?page={page}&size={size}
   */
  getComplaints(page: number = 1, size: number = 10): Observable<ComplaintsResponse> {
    return this.http.get<ComplaintsResponse>(`${this.apiUrl}?page=${page}&size=${size}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get complaints filtered by salesperson or distributor
   * GET /api/complaints/filter
   */
  getComplaintsByFilter(params: {
    salespersonId?: number | null;
    distributorId?: number | null;
    page?: number;
    size?: number;
  }): Observable<ComplaintsResponse> {
    const query = new URLSearchParams();
    if (params.salespersonId != null) query.set('salespersonId', String(params.salespersonId));
    if (params.distributorId != null) query.set('distributorId', String(params.distributorId));
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 10));
    return this.http.get<ComplaintsResponse>(`${this.apiUrl}/filter?${query.toString()}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Update complaint status
   * PUT /api/complaints/{id}/status
   */
  updateComplaintStatus(id: number, status: string, comment?: string): Observable<any> {
    const body: any = { status };
    if (comment?.trim()) body.comment = comment.trim();
    return this.http.put<any>(`${this.apiUrl}/${id}/status`, body, {
      headers: this.getAuthHeaders()
    });
  }
}
