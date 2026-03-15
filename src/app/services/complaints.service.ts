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
  category: 'PAYMENT' | 'PRODUCT' | 'SERVICE' | 'DELIVERY' | 'OTHER';
  subject: string;
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
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
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Create a new complaint
   * POST /api/complaints/create
   */
  createComplaint(complaint: CreateComplaintRequest): Observable<any> {
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
   * Update complaint status
   * PUT /api/complaints/{id}/status
   */
  updateComplaintStatus(id: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/status`, { status }, {
      headers: this.getAuthHeaders()
    });
  }
}
