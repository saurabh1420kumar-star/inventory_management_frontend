// Shared mock-data helpers for report pages that have no backend endpoint yet.
// Deterministic (seeded) so the same filter selection always reproduces the same figures.
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DownloadService } from '../services/download.service';
import { Toast } from '../services/toast';

export const CATEGORICAL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
export const STATUS_COLORS: Record<string, string> = { good: '#10b981', warning: '#f59e0b', serious: '#f97316', critical: '#ef4444' };

export const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
export const WAREHOUSES = ['Main Warehouse', 'Cold Storage', 'Finished Goods Store', 'Raw Material Store'];
export const PLANTS = ['Plant A - Nashik', 'Plant B - Pune', 'Plant C - Indore'];

export const DISTRIBUTORS = ['Shree Distributors', 'Metro Traders', 'Sunrise Agencies', 'Coastal Supplies', 'Highland Mart'];
export const DEALERS = ['ABC Distributors', 'XYZ Traders', 'PQR Agencies', 'LMN Supplies', 'Ganesh Mart', 'Silverline Stores'];
export const SALESMEN = ['Rajesh Kumar', 'Anita Sharma', 'Vikram Singh', 'Priya Menon', 'Suresh Rao', 'Neha Gupta'];

export const FINISHED_PRODUCTS = ['Mango Nectar 1L', 'Mixed Fruit Pulp 5kg', 'Orange Nectar 200ml', 'Guava Pulp 1kg', 'Apple Nectar 1L', 'Litchi Nectar 200ml'];
export const RAW_MATERIALS = ['Mango Pulp Concentrate', 'Sugar', 'Citric Acid', 'PET Bottles 1L', 'Preform Caps', 'Corrugated Boxes', 'Orange Concentrate', 'Guava Puree'];
export const SUPPLIERS = ['AgroFresh Suppliers', 'Prime Packaging Co.', 'Nature Pulp Industries', 'Crown Bottling Ltd.', 'Eastern Sugar Mills'];

export const VEHICLES = ['MH12AB1234', 'MH12CD5678', 'MH14EF9012', 'MH20GH3456', 'MH20IJ6789'];
export const ROUTES = ['Route A - North Zone', 'Route B - South Zone', 'Route C - East Zone', 'Route D - West Zone', 'Route E - Central Zone'];
export const DRIVERS = ['Ramesh Yadav', 'Suresh Patil', 'Amit Verma', 'Deepak Joshi', 'Manoj Tiwari'];
export const EMPLOYEES = ['Ravi Kulkarni', 'Sneha Deshmukh', 'Arjun Nair', 'Pooja Reddy', 'Karan Malhotra'];

// Deterministic PRNG keyed by a string seed (filters, ids, etc.)
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length)];
}

export function formatCurrencyFull(val: number): string {
  const sign = val < 0 ? '-' : '';
  return `${sign}₹ ${Math.abs(Math.round(val)).toLocaleString('en-IN')}`;
}

export function formatCurrencyCompact(val: number): string {
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getStamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Pagination ────────────────────────────────────────────────────────────

export interface Pager {
  page: number;
  pageSize: number;
}

export function paginate<T>(rows: T[], pager: Pager): T[] {
  const start = (pager.page - 1) * pager.pageSize;
  return rows.slice(start, start + pager.pageSize);
}

export function totalPages(rowCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(rowCount / pageSize));
}

export function pageRange(pager: Pager, rowCount: number): { start: number; end: number } {
  if (rowCount === 0) return { start: 0, end: 0 };
  const start = (pager.page - 1) * pager.pageSize + 1;
  const end = Math.min(pager.page * pager.pageSize, rowCount);
  return { start, end };
}

// Windowed page-number list with '...' gaps, e.g. [1, '...', 4, 5, 6, '...', 20]
export function pageWindow(current: number, total: number, span = 1): (number | '...')[] {
  const pages: (number | '...')[] = [];
  const add = (p: number) => pages.push(p);
  add(1);
  const lo = Math.max(2, current - span);
  const hi = Math.min(total - 1, current + span);
  if (lo > 2) pages.push('...');
  for (let p = lo; p <= hi; p++) add(p);
  if (hi < total - 1) pages.push('...');
  if (total > 1) add(total);
  return pages;
}

// ── Excel / PDF export ───────────────────────────────────────────────────

export async function exportRowsToExcel(
  jsonRows: Record<string, unknown>[],
  title: string,
  downloadService: DownloadService,
  toast: Toast
): Promise<void> {
  const worksheet = XLSX.utils.json_to_sheet(jsonRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31));
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  await downloadService.downloadBlob(blob, `${slugify(title)}-${getStamp()}.xlsx`);
  toast.present('Excel exported successfully', 'success');
}

export async function exportRowsToPdf(
  headers: string[],
  rows: (string | number)[][],
  title: string,
  downloadService: DownloadService,
  toast: Toast
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.setTextColor(5, 150, 105);
  doc.text(title, 14, 16);

  autoTable(doc, {
    startY: 24,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    bodyStyles: { textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [240, 253, 250] },
    margin: { top: 24, left: 14, right: 14, bottom: 14 },
  });

  const blob = doc.output('blob');
  await downloadService.downloadBlob(blob, `${slugify(title)}-${getStamp()}.pdf`);
  toast.present('PDF exported successfully', 'success');
}
