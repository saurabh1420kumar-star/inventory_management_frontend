import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Auth } from './auth';

export interface FeatureItem {
  id: number;
  name: string;
  displayName: string;
  path: string;
}

export interface RoleFeaturePermission {
  id: number;
  roleId: number;
  featureId: number;
  feature: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PermissionPayload {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserRightsService {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private readonly base = `${environment.apiUrl}/role-feature-permissions`;

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { 'Authorization': `Bearer ${token}` } : {});
  }

  /** GET /api/role-feature-permissions/features */
  getFeatures(): Observable<FeatureItem[]> {
    return this.http.get<FeatureItem[]>(`${this.base}/features`, { headers: this.getHeaders() }).pipe(
      catchError(() => of([]))
    );
  }

  /** GET /api/role-feature-permissions/role/{roleId} */
  getRolePermissions(roleId: number): Observable<RoleFeaturePermission[]> {
    return this.http.get<RoleFeaturePermission[]>(`${this.base}/role/${roleId}`, { headers: this.getHeaders() }).pipe(
      catchError(() => of([]))
    );
  }

  /** GET /api/role-feature-permissions/role/{roleId}/feature/{featureId} */
  getFeaturePermission(roleId: number, featureId: number): Observable<RoleFeaturePermission | null> {
    return this.http
      .get<RoleFeaturePermission>(`${this.base}/role/${roleId}/feature/${featureId}`, { headers: this.getHeaders() })
      .pipe(catchError(() => of(null)));
  }

  /** PUT /api/role-feature-permissions/role/{roleId}/feature/{featureId} */
  setFeaturePermission(
    roleId: number,
    featureId: number,
    payload: PermissionPayload
  ): Observable<RoleFeaturePermission | null> {
    return this.http
      .put<RoleFeaturePermission>(`${this.base}/role/${roleId}/feature/${featureId}`, payload, { headers: this.getHeaders() })
      .pipe(catchError(() => of(null)));
  }

}
