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
  roleType: string;
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
  alternateContactNo?: string; // ✅ Added (optional)
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

  // ---------------- LOGIN API ----------------
  login(username: string, password: string): Observable<LoginResponse> {
    const body: LoginRequest = { username, password };
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/api/auth/login`,
      body
    ).pipe(
      tap(res => {
        // Store authentication info
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('auth_token_type', res.type);
        localStorage.setItem('auth_username', res.username);
        localStorage.setItem('auth_user_id', String(res.userId));
        localStorage.setItem('auth_features', JSON.stringify(res.features));
        localStorage.setItem('auth_feature_names', JSON.stringify(res.featureNames));
        localStorage.setItem('auth_role_type', res.roleType);
      })
    );
  }

  // ---------------- SIGNUP API ----------------
  createUser(payload: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(
      `${this.apiUrl}/api/createUsers`,
      payload
    );
  }

  // ---------------- AUTH HELPERS ----------------
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token_type');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_user_id');
    localStorage.removeItem('auth_feature_names');
    localStorage.removeItem('auth_features');
    localStorage.removeItem('auth_role_type');
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUsername(): string | null {
    return localStorage.getItem('auth_username');
  }

  getFeatures(): Feature[] {
    const raw = localStorage.getItem('auth_features');
    return raw ? JSON.parse(raw) : [];
  }

  getRoleType(): string | null {
    return localStorage.getItem('auth_role_type');
  }
}
