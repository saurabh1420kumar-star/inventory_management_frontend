import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

// ──────────────────────────────────────────────────────────
// TODO: Set USE_MOCK = false when backend API is ready.
// ──────────────────────────────────────────────────────────
const USE_MOCK = false;
const MOCK_KEY = 'sales_hierarchy_persons';
const ORDERS_MOCK_KEY = 'sales_hierarchy_orders';

/** Pre-seeded Bihar hierarchy from the org chart */
const SEED_DATA: SalesPerson[] = [
  // SSM
  { id: 1,  name: 'State Sale Manager', employeeCode: 'SSM-001', role: 'SSM',            region: 'BIHAR',   zone: undefined,  managerId: null },
  // RSMs
  { id: 2,  name: 'RAM',                employeeCode: 'RSM-001', role: 'RSM',            region: 'BIHAR',   zone: 'S BIHAR',  managerId: 1 },
  { id: 3,  name: 'AJAY',               employeeCode: 'RSM-002', role: 'RSM',            region: 'BIHAR',   zone: 'N BIHAR',  managerId: 1 },
  // S BIHAR ASMs
  { id: 4,  name: 'SHYAM',              employeeCode: 'ASM-001', role: 'ASM',            region: 'BIHAR',   zone: 'S BIHAR',  managerId: 2 },
  { id: 5,  name: 'SHYAM',              employeeCode: 'ASM-002', role: 'ASM',            region: 'BIHAR',   zone: 'S BIHAR',  managerId: 2 },
  { id: 6,  name: 'MOHAN',              employeeCode: 'ASM-003', role: 'ASM',            region: 'BIHAR',   zone: 'S BIHAR',  managerId: 2 },
  { id: 7,  name: 'SOHAN',              employeeCode: 'ASM-004', role: 'ASM',            region: 'BIHAR',   zone: 'S BIHAR',  managerId: 2 },
  // N BIHAR ASMs
  { id: 8,  name: 'DURGESH',            employeeCode: 'ASM-005', role: 'ASM',            region: 'BIHAR',   zone: 'N BIHAR',  managerId: 3 },
  { id: 9,  name: 'SHIVAM',             employeeCode: 'ASM-006', role: 'ASM',            region: 'BIHAR',   zone: 'N BIHAR',  managerId: 3 },
  { id: 10, name: 'ROHAN',              employeeCode: 'ASM-007', role: 'ASM',            region: 'BIHAR',   zone: 'N BIHAR',  managerId: 3 },
  { id: 11, name: 'ROHAN',              employeeCode: 'ASM-008', role: 'ASM',            region: 'BIHAR',   zone: 'N BIHAR',  managerId: 3 },
  // S BIHAR SEs — SHYAM (id:4)
  { id: 12, name: 'Amit',               employeeCode: 'SE-001',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 4 },
  { id: 13, name: 'Amit',               employeeCode: 'SE-002',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 4 },
  { id: 14, name: 'Rahul',              employeeCode: 'SE-003',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 4 },
  { id: 15, name: 'Deepak',             employeeCode: 'SE-004',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 4 },
  // S BIHAR SEs — SHYAM (id:5)
  { id: 16, name: 'Vikas',              employeeCode: 'SE-005',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 5 },
  { id: 17, name: 'Rakesh',             employeeCode: 'SE-006',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 5 },
  { id: 18, name: 'Neha',               employeeCode: 'SE-007',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 5 },
  { id: 19, name: 'Dursh',              employeeCode: 'SE-008',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 5 },
  // S BIHAR SEs — MOHAN (id:6)
  { id: 20, name: 'Rakesh',             employeeCode: 'SE-009',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 6 },
  { id: 21, name: 'Neha',               employeeCode: 'SE-010',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 6 },
  // S BIHAR SEs — SOHAN (id:7)
  { id: 22, name: 'Suresh',             employeeCode: 'SE-011',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 7 },
  { id: 23, name: 'Nitesh',             employeeCode: 'SE-012',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'S BIHAR',  managerId: 7 },
  // N BIHAR SEs — DURGESH (id:8)
  { id: 24, name: 'Pankaj',             employeeCode: 'SE-013',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 8 },
  { id: 25, name: 'Sunil',              employeeCode: 'SE-014',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 8 },
  { id: 26, name: 'Nitin',              employeeCode: 'SE-015',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 8 },
  // N BIHAR SEs — SHIVAM (id:9)
  { id: 27, name: 'Vikas',              employeeCode: 'SE-016',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 9 },
  { id: 28, name: 'Alok',               employeeCode: 'SE-017',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 9 },
  { id: 29, name: 'Ankur',              employeeCode: 'SE-018',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 9 },
  { id: 30, name: 'Ashish',             employeeCode: 'SE-019',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 9 },
  // N BIHAR SEs — ROHAN (id:10)
  { id: 31, name: 'Ashish',             employeeCode: 'SE-020',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 10 },
  { id: 32, name: 'Akash',              employeeCode: 'SE-021',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 10 },
  // N BIHAR SEs — ROHAN (id:11)
  { id: 33, name: 'Akash',              employeeCode: 'SE-022',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 11 },
  { id: 34, name: 'Anand',              employeeCode: 'SE-023',  role: 'SALES_EXECUTIVE', region: 'BIHAR',  zone: 'N BIHAR',  managerId: 11 },
];

/** Dummy orders data for visualization */
const SEED_ORDERS: OrderWithSalesPerson[] = [
  // S BIHAR Orders
  { orderId: 1001, distributorId: 101, distributorName: 'Sharma & Co', amount: 45000, status: 'completed', createdAt: '2024-03-15', salespersonId: 12, salespersonName: 'Amit', salespersonRole: 'SALES_EXECUTIVE', zone: 'S BIHAR' },
  { orderId: 1002, distributorId: 102, distributorName: 'Kumar Enterprises', amount: 38500, status: 'approved', createdAt: '2024-03-16', salespersonId: 14, salespersonName: 'Rahul', salespersonRole: 'SALES_EXECUTIVE', zone: 'S BIHAR' },
  { orderId: 1003, distributorId: 103, distributorName: 'Patel Brothers', amount: 52300, status: 'pending', createdAt: '2024-03-17', salespersonId: 16, salespersonName: 'Vikas', salespersonRole: 'SALES_EXECUTIVE', zone: 'S BIHAR' },
  { orderId: 1004, distributorId: 104, distributorName: 'Delhi Distribution', amount: 61200, status: 'completed', createdAt: '2024-03-14', salespersonId: 20, salespersonName: 'Rakesh', salespersonRole: 'SALES_EXECUTIVE', zone: 'S BIHAR' },
  { orderId: 1005, distributorId: 105, distributorName: 'Jain Trading Co', amount: 48900, status: 'completed', createdAt: '2024-03-16', salespersonId: 13, salespersonName: 'Amit', salespersonRole: 'SALES_EXECUTIVE', zone: 'S BIHAR' },
  { orderId: 1006, distributorId: 106, distributorName: 'Gupta Industries', amount: 55000, status: 'approved', createdAt: '2024-03-12', salespersonId: 17, salespersonName: 'Rakesh', salespersonRole: 'SALES_EXECUTIVE', zone: 'S BIHAR' },
  { orderId: 1007, distributorId: 107, distributorName: 'Raj Supplies', amount: 39500, status: 'pending', createdAt: '2024-03-18', salespersonId: 22, salespersonName: 'Suresh', salespersonRole: 'SALES_EXECUTIVE', zone: 'S BIHAR' },
  { orderId: 1008, distributorId: 108, distributorName: 'Global Trades', amount: 67800, status: 'completed', createdAt: '2024-03-13', salespersonId: 15, salespersonName: 'Deepak', salespersonRole: 'SALES_EXECUTIVE', zone: 'S BIHAR' },
  // N BIHAR Orders
  { orderId: 2001, distributorId: 201, distributorName: 'Bihar Distributors', amount: 43200, status: 'completed', createdAt: '2024-03-15', salespersonId: 24, salespersonName: 'Pankaj', salespersonRole: 'SALES_EXECUTIVE', zone: 'N BIHAR' },
  { orderId: 2002, distributorId: 202, distributorName: 'North Trading Hub', amount: 51600, status: 'approved', createdAt: '2024-03-16', salespersonId: 27, salespersonName: 'Vikas', salespersonRole: 'SALES_EXECUTIVE', zone: 'N BIHAR' },
  { orderId: 2003, distributorId: 203, distributorName: 'Mittal & Associates', amount: 47300, status: 'pending', createdAt: '2024-03-17', salespersonId: 28, salespersonName: 'Alok', salespersonRole: 'SALES_EXECUTIVE', zone: 'N BIHAR' },
  { orderId: 2004, distributorId: 204, distributorName: 'Supreme Logistics', amount: 59800, status: 'completed', createdAt: '2024-03-14', salespersonId: 31, salespersonName: 'Ashish', salespersonRole: 'SALES_EXECUTIVE', zone: 'N BIHAR' },
  { orderId: 2005, distributorId: 205, distributorName: 'Excel Markets', amount: 44700, status: 'completed', createdAt: '2024-03-16', salespersonId: 25, salespersonName: 'Sunil', salespersonRole: 'SALES_EXECUTIVE', zone: 'N BIHAR' },
  { orderId: 2006, distributorId: 206, distributorName: 'Verma & Co', amount: 56200, status: 'approved', createdAt: '2024-03-12', salespersonId: 29, salespersonName: 'Ankur', salespersonRole: 'SALES_EXECUTIVE', zone: 'N BIHAR' },
  { orderId: 2007, distributorId: 207, distributorName: 'Metro Distribution', amount: 62500, status: 'pending', createdAt: '2024-03-18', salespersonId: 32, salespersonName: 'Akash', salespersonRole: 'SALES_EXECUTIVE', zone: 'N BIHAR' },
  { orderId: 2008, distributorId: 208, distributorName: 'National Traders', amount: 58300, status: 'completed', createdAt: '2024-03-13', salespersonId: 26, salespersonName: 'Nitin', salespersonRole: 'SALES_EXECUTIVE', zone: 'N BIHAR' },
];

export interface HierarchyRole {
  value: string;
  label: string;
  shortLabel: string;
  icon: string;
}

export const HIERARCHY_ROLES: HierarchyRole[] = [
  { value: 'NATIONAL_SALES_MGR', label: 'National Sales Manager', shortLabel: 'NSM', icon: 'star-outline' },
  { value: 'STATE_SALES_MGR',    label: 'State Sales Manager',    shortLabel: 'SSM', icon: 'ribbon-outline' },
  { value: 'ZONAL_SALES_MGR',    label: 'Zonal Sales Manager',    shortLabel: 'ZSM', icon: 'earth-outline' },
  { value: 'REGIONAL_SALES_MGR', label: 'Regional Sales Manager', shortLabel: 'RSM', icon: 'map-outline' },
  { value: 'AREA_SALES_MGR',     label: 'Area Sales Manager',     shortLabel: 'ASM', icon: 'business-outline' },
  { value: 'SALES_OFFICER',      label: 'Sales Officer',          shortLabel: 'SO',  icon: 'briefcase-outline' },
  { value: 'SALES_EXECUTIVE',    label: 'Sales Executive',        shortLabel: 'SE',  icon: 'person-outline' }
];

export const MOCK_ROLES: RoleOption[] = [
  { value: 'NATIONAL_SALES_MGR', label: 'National Sales Manager' },
  { value: 'STATE_SALES_MGR', label: 'State Sales Manager' },
  { value: 'ZONAL_SALES_MGR', label: 'Zonal Sales Manager' },
  { value: 'REGIONAL_SALES_MGR', label: 'Regional Sales Manager' },
  { value: 'AREA_SALES_MGR', label: 'Area Sales Manager' },
  { value: 'SALES_OFFICER', label: 'Sales Officer' },
  { value: 'SALES_EXECUTIVE', label: 'Sales Executive' }
];

export interface RoleOption {
  value: string;
  label: string;
}

export interface SalesPerson {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
  employeeRollNo?: string;
  role: string;
  zone?: string;
  region?: string;
  phone?: string;
  contactNo?: string;
  alternateContactNo?: string;
  email?: string;
  managerId?: number | null;
  managerName?: string;
  username?: string;
  password?: string;
  status?: string;
  bloodGroup?: string;
  completeAddress?: string;
  dateOfBirth?: string;
  gender?: string;
  city?: string;
  country?: string;
  zip?: string;
  createdAt?: string;
  active?: boolean;
}

export interface HierarchyNode {
  person: SalesPerson;
  children: HierarchyNode[];
}

export interface OrderWithSalesPerson {
  orderId: number;
  distributorName: string;
  distributorId: number;
  amount: number;
  status: string;
  createdAt: string;
  salespersonId?: number;
  salespersonName?: string;
  salespersonRole?: string;
  zone?: string;
}

// ─── localStorage helpers ───────────────────────────────────────────────────

function readStore(): SalesPerson[] {
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw) as SalesPerson[];
  } catch { /* ignore */ }
  // First load — seed with Bihar hierarchy
  localStorage.setItem(MOCK_KEY, JSON.stringify(SEED_DATA));
  return SEED_DATA;
}

function writeStore(data: SalesPerson[]): void {
  localStorage.setItem(MOCK_KEY, JSON.stringify(data));
}

function nextId(data: SalesPerson[]): number {
  return data.length ? Math.max(...data.map(p => p.id)) + 1 : 1;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class SalesHierarchyService {
  private baseUrl = `${environment.apiUrl}/sales-hierarchy`;
  private orderApiUrl = `${environment.apiUrl}/order`;

  constructor(private http: HttpClient, private auth: Auth) {}

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getAllSalesPersons(): Observable<SalesPerson[]> {
    if (USE_MOCK) {
      return of(readStore()).pipe(delay(300));
    }
    return this.http.get<SalesPerson[]>(`${this.baseUrl}/list`, { headers: this.getHeaders() });
  }

  createSalesPerson(data: Partial<SalesPerson>): Observable<SalesPerson> {
    if (USE_MOCK) {
      const store = readStore();
      const newPerson: SalesPerson = {
        id: nextId(store),
        name: data.name ?? '',
        employeeCode: data.employeeCode ?? '',
        role: (data.role as SalesPerson['role']) ?? 'SALES_EXECUTIVE',
        zone: data.zone,
        region: data.region ?? 'BIHAR',
        phone: data.phone,
        email: data.email,
        managerId: data.managerId ?? null,
        createdAt: new Date().toISOString()
      };
      store.push(newPerson);
      writeStore(store);
      return of(newPerson).pipe(delay(400));
    }
    return this.http.post<SalesPerson>(`${this.baseUrl}/create`, data, { headers: this.getHeaders() });
  }

  updateSalesPerson(id: number, data: Partial<SalesPerson>): Observable<SalesPerson> {
    if (USE_MOCK) {
      const store = readStore();
      const idx = store.findIndex(p => p.id === id);
      if (idx === -1) return throwError(() => new Error('Not found'));
      store[idx] = { ...store[idx], ...data };
      writeStore(store);
      return of(store[idx]).pipe(delay(400));
    }
    return this.http.put<SalesPerson>(`${this.baseUrl}/update/${id}`, data, { headers: this.getHeaders() });
  }

  deleteSalesPerson(id: number): Observable<void> {
    if (USE_MOCK) {
      const store = readStore().filter(p => p.id !== id);
      writeStore(store);
      return of(undefined).pipe(delay(300));
    }
    return this.http.delete<void>(`${this.baseUrl}/delete/${id}`, { headers: this.getHeaders() });
  }

  getHierarchyOrders(_params?: {
    zone?: string; role?: string; salespersonId?: number; status?: string;
  }): Observable<OrderWithSalesPerson[]> {
    if (USE_MOCK) {
      const data = SEED_ORDERS;
      return of(data).pipe(delay(350));
    }
    const { zone, role, salespersonId, status } = _params ?? {};
    let url = `${this.orderApiUrl}/hierarchy-orders`;
    const query: string[] = [];
    if (zone) query.push(`zone=${encodeURIComponent(zone)}`);
    if (role) query.push(`role=${encodeURIComponent(role)}`);
    if (salespersonId) query.push(`salespersonId=${salespersonId}`);
    if (status) query.push(`status=${encodeURIComponent(status)}`);
    if (query.length) url += '?' + query.join('&');
    return this.http.get<OrderWithSalesPerson[]>(url, { headers: this.getHeaders() });
  }

  getRolesDropdown(): Observable<RoleOption[]> {
    if (USE_MOCK) {
      return of(MOCK_ROLES).pipe(delay(200));
    }
    return this.http.get<RoleOption[]>(`${this.baseUrl}/roles/dropdown`, { headers: this.getHeaders() });
  }

  getPersonsByRole(role: string): Observable<SalesPerson[]> {
    if (USE_MOCK) {
      return of(readStore().filter(p => p.role === role)).pipe(delay(200));
    }
    return this.http.get<SalesPerson[]>(`${this.baseUrl}/by-role`, {
      headers: this.getHeaders(),
      params: { role }
    });
  }

  buildHierarchyTree(persons: SalesPerson[]): HierarchyNode[] {
    const roots: HierarchyNode[] = [];
    const nodeMap = new Map<number, HierarchyNode>();
    persons.forEach(p => nodeMap.set(p.id, { person: p, children: [] }));
    persons.forEach(p => {
      if (p.managerId && nodeMap.has(p.managerId)) {
        nodeMap.get(p.managerId)!.children.push(nodeMap.get(p.id)!);
      } else {
        roots.push(nodeMap.get(p.id)!);
      }
    });
    return roots;
  }
}
