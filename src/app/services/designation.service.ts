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

export interface RoleApiItem {
  id: number;
  name: string;
  roleType: string;
  roleCategory: 'USER' | 'SALES';
  description?: string;
}

/**
 * Source of truth for designations / roles shown in the HR "Create Designation"
 * modal and Role Type dropdowns.
 *
 * Persistence strategy:
 * - GET /admin/roles/all is the live source of truth, merged with a built-in
 *   list (HR roles + sales hierarchy) as a fallback for offline use.
 * - POST /admin/roles/create persists new designations to the backend; they
 *   are also cached in localStorage so they appear instantly in the same session.
 */
@Injectable({ providedIn: 'root' })
export class DesignationService {
  /** Live endpoint for creating a new role/designation. */
  private readonly createUrl = `${environment.apiUrl}/admin/roles/create`;

  /** Live endpoint listing every role/designation known to the backend. */
  private readonly allRolesUrl = `${environment.apiUrl}/admin/roles/all`;

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

  /** Nicer display labels for known role types; anything else falls back to a humanized name. */
  private readonly labelMap: Record<string, string> =
    this.builtIn.reduce((acc, d) => ({ ...acc, [d.value]: d.label }), {} as Record<string, string>);

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
   * Full, de-duplicated designation list sourced from GET /admin/roles/all
   * (the same live API used for Role Type dropdowns), merged with the
   * built-in list. Falls back to the sales-hierarchy roles dropdown, then to
   * the built-in list alone, if the roles API is unavailable.
   */
  getDesignations(): Observable<Designation[]> {
    return this.getAllRoles().pipe(
      map((roles) => this.merge(roles.map((r) => ({
        value: r.roleType,
        label: this.labelMap[r.roleType] || this.humanize(r.roleType),
        roleCategory: r.roleCategory
      })))),
      catchError(() =>
        this.salesHierarchy.getRolesDropdown().pipe(
          map((roles: RoleOption[]) => this.merge(roles.map((r) => ({ value: r.value, label: r.label })))),
          catchError(() => of(this.merge([])))
        )
      )
    );
  }

  /** Create a designation via POST /admin/roles/create, then cache it locally for the chip list. */
  addDesignation(label: string, roleCategory?: 'USER' | 'SALES'): Observable<Designation> {
    const clean = (label || '').trim();
    const designation: Designation = { value: this.toValue(clean), label: clean, custom: true, roleCategory };

    return this.http
      .post(this.createUrl, { roleType: designation.value, roleCategory }, { headers: this.getHeaders() })
      .pipe(
        map(() => {
          const custom = this.getCustom();
          if (!custom.some((c) => c.value === designation.value)) {
            custom.push(designation);
            this.saveCustom(custom);
          }
          return designation;
        })
      );
  }

  /** Fetch every role/designation the backend knows about (used to populate Role Type dropdowns). */
  getAllRoles(): Observable<RoleApiItem[]> {
    return this.http.get<RoleApiItem[]>(this.allRolesUrl, { headers: this.getHeaders() });
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

  /** Title-case fallback label for role types not in labelMap, e.g. QUALITY_MGR -> Quality Manager. */
  private humanize(value: string): string {
    return value
      .split('_')
      .map((word) => (word === 'MGR' ? 'Manager' : word.charAt(0) + word.slice(1).toLowerCase()))
      .join(' ');
  }
}
