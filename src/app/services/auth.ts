// src/app/services/auth.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

// ---------------- LOGIN MODELS ----------------
export interface LoginRequest {
  username: string;
  password: string;
}

export interface Feature {
  path: string;
  displayName: string;
  name: string;
}

export interface LoginResponse {
  featureNames: string[];
  features: Feature[];
  message: string;
  token: string;
  type: string;
  userId: number;
  username: string;
  roleType: string; // SUPER_ADMIN / ADMIN / USER
}

// ---------------- SIGNUP MODELS ----------------
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  status: string;
  firstName: string;
  lastName: string;
  contactNo: string;
  alternateContactNo?: string;
  bloodGroup: string;
  completeAddress: string;
  dateOfBirth: string;
  gender: string;
  city: string;
  country: string;
  zip: string;
  roleType: string;
  dateOfBirth: string; // ✅ Added (required)
  gender: string; // ✅ Added (required)
  bloodGroup?: string; // ✅ Added (optional but API may require it)
  completeAddress: string; // ✅ Added (required)
}

export interface CreateUserResponse {
  createdOn: string;
  email: string;
  firstName: string;
  id: number;
  lastName: string;
  roleType: string;
  status: string;
  username: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ---------------- LOGIN ----------------
  login(username: string, password: string): Observable<LoginResponse> {
    const body: LoginRequest = { username, password };

    return this.http
      .post<LoginResponse>(`${this.apiUrl}/api/auth/login`, body)
      .pipe(
        tap((res) => {
          // ===== STORE AUTH DATA =====
          localStorage.setItem('auth_token', res.token);
          localStorage.setItem('auth_token_type', res.type);
          localStorage.setItem('auth_username', res.username);
          localStorage.setItem('auth_user_id', String(res.userId));
          localStorage.setItem('auth_role_type', res.roleType);

          // Store features safely
          localStorage.setItem(
            'auth_features',
            JSON.stringify(res.features || [])
          );
          localStorage.setItem(
            'auth_feature_names',
            JSON.stringify(res.featureNames || [])
          );
        })
      );
  }

  // ---------------- SIGNUP ----------------
  createUser(payload: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(
      `${this.apiUrl}/api/createUsers`,
      payload
    );
  }

  // ---------------- LOGOUT ----------------
  logout(): void {
    localStorage.clear();
  }

  // ---------------- AUTH HELPERS ----------------
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getTokenType(): string | null {
    return localStorage.getItem('auth_token_type');
  }

  getUsername(): string | null {
    return localStorage.getItem('auth_username');
  }

  getUserId(): number | null {
    const id = localStorage.getItem('auth_user_id');
    return id ? Number(id) : null;
  }

  // ---------------- ROLE HELPERS ----------------
  getRoleType(): string | null {
    return localStorage.getItem('auth_role_type');
  }

  isSuperAdmin(): boolean {
    return this.getRoleType() === 'SUPER_ADMIN';
  }

  // ---------------- FEATURE HELPERS ----------------
  getFeatures(): Feature[] {
    const raw = localStorage.getItem('auth_features');
    return raw ? JSON.parse(raw) : [];
  }

  getFeatureNames(): string[] {
    const raw = localStorage.getItem('auth_feature_names');
    return raw ? JSON.parse(raw) : [];
  }
  logoutApi(): Observable<any> {
  const token = this.getToken();

  return this.http.post(`${this.apiUrl}/api/auth/logout`, { token });
}


  hasFeature(featureName: string): boolean {
    // SUPER_ADMIN has all permissions
    if (this.isSuperAdmin()) {
      return true;
    }
    return this.getFeatureNames().includes(featureName);
  }
}
