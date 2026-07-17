import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';
import { SalesHierarchyService, RoleOption } from './sales-hierarchy.service';

export interface Designation {
  value: string;   // machine key, e.g. QUALITY_MANAGER
  label: string;   // display name, e.g. Quality Manager
  custom?: boolean; // true when created by a user (not a built-in / API role)
  roleCategory?: 'USER' | 'SALES'; // Category: USER or SALES
}

/**
 * Source of truth for designations / roles shown in the HR "Create Designation"
 * modal and (potentially) role dropdowns.
 *
 * Persistence strategy:
 * - Built-in designations (HR roles + sales-hierarchy roles) are bundled here.
 * - Roles returned by the backend roles-dropdown API are merged in when available.
 * - User-created designations are stored in localStorage FOR NOW. When the
 *   create-designation backend endpoint is ready, flip `USE_API` to true and the
 *   HTTP calls below take over — the component code does not need to change.
 */
@Injectable({ providedIn: 'root' })
export class DesignationService {
  /** Flip to `true` once the backend designation endpoints exist. */
  private readonly USE_API = false;

  /** Future REST base — GET (list) / POST (create). Adjust path to match backend. */
  private readonly base = `${environment.apiUrl}/designations`;

  private readonly STORAGE_KEY = 'custom_designations';

  /**
   * Built-in designations: HR department roles + full sales hierarchy.
   * Kept in sync with hr-department roleTypes so the modal lists everything.
   */
  private readonly builtIn: Designation[] = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'BUSINESS_DEV_MGR', label: 'Business Dev Manager' },
    { value: 'PLANT_MGR', label: 'Plant Manager' },
    { value: 'HR_MGR', label: 'HR Manager' },
    { value: 'LOGISTICS_MGR', label: 'Logistics Manager' },
    { value: 'ACCOUNT_MGR', label: 'Account Manager' },
    { value: 'ACCOUNT_OFFICER', label: 'Account Officer' },
    { value: 'ACCOUNT_EXECUTIVE', label: 'Account Executive' },
    { value: 'NATIONAL_SALES_MGR', label: 'National Sales Manager' },
    { value: 'STATE_SALES_MGR', label: 'State Sales Manager' },
    { value: 'ZONAL_SALES_MGR', label: 'Zonal Sales Manager' },
    { value: 'REGIONAL_SALES_MGR', label: 'Regional Sales Manager' },
    { value: 'AREA_SALES_MGR', label: 'Area Sales Manager' },
    { value: 'SALES_OFFICER', label: 'Sales Officer' },
    { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
    { value: 'LOGISTICS_OFFICER', label: 'Logistics Officer' },
    { value: 'HR_EXECUTIVE', label: 'HR Executive' },
    { value: 'PLANT_OFFICER', label: 'Plant Officer' },
    { value: 'PLANT_EXECUTIVE', label: 'Plant Executive' },
  ];

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private salesHierarchy: SalesHierarchyService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  /**
   * Full, de-duplicated designation list: built-in + backend roles + custom.
   * Falls back gracefully if the roles API is unavailable.
   */
  getDesignations(): Observable<Designation[]> {
    if (this.USE_API) {
      return this.http
        .get<Designation[]>(this.base, { headers: this.getHeaders() })
        .pipe(
          map((apiList) => this.merge(apiList.map((d) => ({ value: d.value, label: d.label })))),
          catchError(() => of(this.merge([])))
        );
    }

    // No dedicated designation API yet — enrich the built-in list with whatever
    // the sales roles dropdown returns, then fall back if that call fails too.
    return this.salesHierarchy.getRolesDropdown().pipe(
      map((roles: RoleOption[]) => this.merge(roles.map((r) => ({ value: r.value, label: r.label })))),
      catchError(() => of(this.merge([])))
    );
  }

  /** Create a designation. Persists to localStorage now; POSTs once USE_API is on. */
  addDesignation(label: string, roleCategory?: 'USER' | 'SALES'): Observable<Designation> {
    const clean = (label || '').trim();
    const designation: Designation = { value: this.toValue(clean), label: clean, custom: true, roleCategory };

    if (this.USE_API) {
      return this.http
        .post<Designation>(this.base, { label: clean, value: designation.value, roleCategory }, { headers: this.getHeaders() })
        .pipe(map((res) => ({ ...res, custom: true })));
    }

    const custom = this.getCustom();
    if (!custom.some((c) => c.value === designation.value)) {
      custom.push(designation);
      this.saveCustom(custom);
    }
    return of(designation);
  }

  /** True when a designation with this label/value already exists (built-in or custom). */
  exists(label: string): boolean {
    const value = this.toValue(label);
    if (!value) return false;
    return (
      this.builtIn.some((d) => d.value === value) ||
      this.getCustom().some((d) => d.value === value)
    );
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private merge(extra: Designation[]): Designation[] {
    const byValue = new Map<string, Designation>();
    for (const d of this.builtIn) byValue.set(d.value, d);
    for (const d of extra) if (!byValue.has(d.value)) byValue.set(d.value, d);
    for (const d of this.getCustom()) byValue.set(d.value, { ...d, custom: true });
    return Array.from(byValue.values());
  }

  private getCustom(): Designation[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveCustom(list: Designation[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
  }

  /** Normalise a free-text label into an uppercase snake-case key. */
  private toValue(label: string): string {
    return (label || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
