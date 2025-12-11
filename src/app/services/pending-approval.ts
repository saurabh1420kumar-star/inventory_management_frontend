import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PendingApprovalResponse {
  id: number;
  approvalStatus: string;
  requestedOn: string;
  reviewComments: string | null;
  reviewedBy: string | null;
  reviewedOn: string | null;
  user: {
    city: string;
    contactNo: string;
    country: string;
    createdOn: string;
    email: string;
    firstName: string;
    id: number;
    lastLoginTime: string | null;
    lastName: string;
    otp: string;
    password: string;
    passwordSetDate: string;
    roleType: string;
    status: string;
    username: string;
    zip: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PendingApproval {

  constructor(private http: HttpClient) {}

  /** Load pending approvals */
  getPendingApprovals(): Observable<PendingApprovalResponse[]> {
    return this.http.get<PendingApprovalResponse[]>(
      `${environment.apiUrl}/api/superadmin/pending-approvals`
    );
  }

  /** Approve user */
  approveUser(userId: number, roleType: string): Observable<any> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('roleType', roleType);

    return this.http.post(
      `${environment.apiUrl}/api/admin/roles/assign-user`,
      {},  // empty body
      { params }
    );
  }
}
