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

/**
 * Per-feature CRUD permission entry returned in the login response.
 * Governs which action buttons (add/create/edit/delete) are visible for a feature.
 */
export interface FeaturePermission {
  userId?: number;
  featureId?: number;
  feature: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export interface LoginResponse {
  featureNames: string[];
  features: Feature[];
  roleFeaturePermissions?: FeaturePermission[];
  message: string;
  token: string;
  type: string;
  userId: number;
  salespersonId?: number;
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
  completeAddress: string;
  employeeRollNo:string; // ✅ Added (required)
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
  firstName: string;
  lastName: string;
  assignedPerson: string;
  salesPersonRoleType: string;
  salespersonId: number;
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
  accountNumber?: string;
  accountName?: string;
  ifsc?: string;
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
          localStorage.setItem('auth_role_type', res.roleType?.toUpperCase() || '');

          // Store features safely
          localStorage.setItem(
            'auth_features',
            JSON.stringify(res.features || [])
          );
          localStorage.setItem(
            'auth_feature_names',
            JSON.stringify(res.featureNames || [])
          );
          // Store per-feature CRUD permissions used to gate action buttons
          localStorage.setItem(
            'auth_feature_permissions',
            JSON.stringify(res.roleFeaturePermissions || [])
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

  // ---------------- FORGOT PASSWORD ----------------
  /**
   * Reset password for a given username.
   * POST /api/auth/forgot-password/{username}
   * Body: { newPassword, confirmPassword }
   */
  forgotPassword(
    username: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/auth/forgot-password/${encodeURIComponent(username)}`,
      { newPassword, confirmPassword }
    );
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

  getSalespersonId(): number | null {
    const id = localStorage.getItem('auth_user_id');
    return id ? Number(id) : null;
  }

  // ---------------- ROLE HELPERS ----------------
  getRoleType(): string | null {
    const role = localStorage.getItem('auth_role_type');
    return role ? role.toUpperCase() : null;
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

  // ---------------- CRUD PERMISSION HELPERS ----------------
  /**
   * The per-feature CRUD permissions stored at login.
   * Returns an empty array for legacy sessions (logged in before this field existed).
   */
  getFeaturePermissions(): FeaturePermission[] {
    const raw = localStorage.getItem('auth_feature_permissions');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Check whether the current user may perform an action on a feature.
   *
   * Business rule: a single "edit access" flag (`canUpdate`) governs the
   * visibility of ALL action buttons — add/create, edit and delete alike.
   * The `canCreate` and `canDelete` flags are intentionally ignored; if a role
   * has `canUpdate = true` for a feature it sees every create/edit/delete
   * control on that page, otherwise the page is view-only.
   *
   * Other rules (designed to never regress existing behaviour):
   * - SUPER_ADMIN can do everything.
   * - If no granular permissions were returned (legacy session / backend without
   *   the field), fall back to permissive so pages keep working as before.
   * - If a feature is accessible but has no entry, stay permissive (page access is
   *   already governed by the feature list; we only hide buttons when told to).
   */
  canDo(featureName: string, action: PermissionAction): boolean {
    if (this.isSuperAdmin()) {
      return true;
    }

    const permissions = this.getFeaturePermissions();
    if (!permissions.length) {
      return true;
    }

    const entry = permissions.find((p) => p.feature === featureName);
    if (!entry) {
      return true;
    }

    switch (action) {
      // All write actions (create/update/delete) hang off `canUpdate` only.
      case 'create':
      case 'update':
      case 'delete':
        return !!entry.canUpdate;
      case 'read':
        return !!entry.canRead;
      default:
        return false;
    }
  }

  canCreate(featureName: string): boolean {
    return this.canDo(featureName, 'create');
  }

  canRead(featureName: string): boolean {
    return this.canDo(featureName, 'read');
  }

  canUpdate(featureName: string): boolean {
    return this.canDo(featureName, 'update');
  }

  canDelete(featureName: string): boolean {
    return this.canDo(featureName, 'delete');
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
