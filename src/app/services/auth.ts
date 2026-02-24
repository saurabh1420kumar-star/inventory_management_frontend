// src/app/services/auth.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Platform } from '@ionic/angular';
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

// ============= DISTRIBUTOR SIGNUP MODELS =============
/**
 * DISTRIBUTOR CREATION REQUEST
 * Used when creating a new distributor account with login credentials
 * 
 * Fields:
 * - name: Distributor company/contact name
 * - assignedPerson: Sales executive assigned to this distributor
 * - distributorType: Type of distributor (e.g., "Wholesale")
 * - companyType: Type of company (e.g., "LLC", "Pvt Ltd")
 * - contactEmail: Distributor email address
 * - phoneNumber: Primary contact number
 * - alternateContact: Secondary contact number (optional)
 * - address: Full business address
 * - aadhaarNumber: Aadhar identification number
 * - panNumber: PAN (Permanent Account Number)
 * - gstNumber: GST registration number
 * - status: Account status (e.g., "ACTIVE")
 * - creditLimit: Whether credit limit is enabled
 * - username: Login username for distributor portal
 * - password: Login password for distributor portal
 */
export interface CreateDistributorRequest {
  name: string;
  assignedPerson: string;
  distributorType: string;
  companyType: string;
  contactEmail: string;
  phoneNumber: string;
  alternateContact?: string;
  address: string;
  aadhaarNumber: string;
  panNumber: string;
  gstNumber: string;
  status: string;
  creditLimit: boolean;
  username: string;
  password: string;
}

export interface CreateDistributorResponse {
  id: number;
  name: string;
  assignedPerson: string;
  distributorType: string;
  companyType: string;
  contactEmail: string;
  phoneNumber: string;
  address: string;
  status: string;
  createdOn: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private platform: Platform) {}

  // ---------------- LOGIN ----------------
  login(username: string, password: string): Observable<LoginResponse> {
    const body: LoginRequest = { username, password };

    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, body)
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
      `${this.apiUrl}/createUsers`,
      payload
    );
  }

  /**
   * CREATE DISTRIBUTOR ACCOUNT
   * Creates a new distributor account with login credentials
   * 
   * @param payload CreateDistributorRequest with distributor details
   * @returns Observable<CreateDistributorResponse>
   */
  createDistributor(payload: CreateDistributorRequest): Observable<CreateDistributorResponse> {
    return this.http.post<CreateDistributorResponse>(
      `${this.apiUrl}/distributors/create-distributor`,
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

  return this.http.post(`${this.apiUrl}/auth/logout`, { token });
}


  hasFeature(featureName: string): boolean {
    // SUPER_ADMIN has all permissions
    if (this.isSuperAdmin()) {
      return true;
    }
    return this.getFeatureNames().includes(featureName);
  }

  // ============ PLATFORM & DEVICE HELPERS ============
  /**
   * Detect if user is on mobile platform
   */
  isMobileDevice(): boolean {
    return this.platform.is('android') || this.platform.is('ios');
  }

  /**
   * Detect if user is on desktop platform
   */
  isDesktopDevice(): boolean {
    return this.platform.is('desktop') || (!this.platform.is('android') && !this.platform.is('ios'));
  }

  /**
   * Validate if a role can login on the current platform
   * 
   * PLATFORM RULES:
   * - ADMIN: Can login on both MOBILE and DESKTOP
   * - SUPER_ADMIN: Can login on both MOBILE and DESKTOP
   * - DISTRIBUTOR: Can login on MOBILE only
   * - SALES: Can login on MOBILE only
   * - Other roles (USER, etc.): Can login on DESKTOP only
   */
  canLoginOnCurrentPlatform(roleType: string): boolean {
    const role = roleType?.toUpperCase() || '';
    const isMobile = this.isMobileDevice();

    // ADMIN and SUPER_ADMIN can login on both platforms
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return true;
    }

    // DISTRIBUTOR and SALES can only login on mobile
    if ((role === 'DISTRIBUTOR' || role === 'SALES') && isMobile) {
      return true;
    }

    // Other users (USER, etc.) can only login on desktop
    if (!isMobile && (role === 'USER' || role === 'MANAGER' || role === 'OPERATOR')) {
      return true;
    }

    return false;
  }

  /**
   * Get platform-specific error message for invalid login attempt
   */
  getPlatformErrorMessage(roleType: string): string {
    const role = roleType?.toUpperCase() || '';
    const isMobile = this.isMobileDevice();
    const deviceType = isMobile ? 'mobile' : 'desktop';

    if (role === 'DISTRIBUTOR' || role === 'SALES') {
      return `${role} users can only login on mobile devices. Please switch to the mobile app.`;
    } else if (role === 'USER' || role === 'MANAGER' || role === 'OPERATOR') {
      return `Your account is only accessible on desktop. Please use a desktop browser to login.`;
    }

    return `Your account cannot be accessed on ${deviceType} platform.`;
  }
}
