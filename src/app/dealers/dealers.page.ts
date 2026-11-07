// Dealer directory — read-only table fed by GET /api/dealers (environment.dealersUrl, via DealerService).
// Columns: dealer name, phone, address, distributor. Search + distributor filter + client-side paging.
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleCircleOutline, storefrontOutline, searchOutline, closeCircle, callOutline,
  locationOutline, businessOutline, chevronBackOutline, chevronForwardOutline,
  refreshOutline, alertCircleOutline, funnelOutline,
  gridOutline, documentTextOutline, banOutline, checkmarkCircleOutline,
} from 'ionicons/icons';
import { DealerDto, DealerService, DealerStatus } from '../services/dealer.service';
import { HapticService } from '../services/haptic.service';
import { DownloadService } from '../services/download.service';
import { Toast } from '../services/toast';
import { ReportHeroComponent } from '../reports/report-hero/report-hero.component';
import { exportRowsToExcel, exportRowsToPdf } from '../reports/report-shared';

@Component({
  selector: 'app-dealers',
  templateUrl: './dealers.page.html',
  styleUrls: ['./dealers.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReportHeroComponent],
})
export class DealersPage implements OnInit {

  private dealerService = inject(DealerService);
  private haptic = inject(HapticService);
  private alertCtrl = inject(AlertController);
  private downloadService = inject(DownloadService);
  private toast = inject(Toast);

  readonly pageSize = 10;
  readonly skeletonRows = [1, 2, 3, 4, 5];

  dealers: DealerDto[] = [];
  distributors: string[] = [];

  // Stored (not getters) so the template re-renders from stable arrays.
  filtered: DealerDto[] = [];
  pageRows: DealerDto[] = [];
  pageNumbers: (number | '...')[] = [1];

  searchTerm = '';
  distributorFilter = 'all';
  statusFilter: 'all' | DealerStatus = 'all';
  page = 1;

  // Dealer ids with a status change in flight (disables that row's button, shows a spinner).
  private updatingIds = new Set<number>();
  isExporting = false;

  isLoading = false;
  loadFailed = false;
  lastUpdated: Date | null = null;

  constructor() {
    addIcons({
      peopleCircleOutline, storefrontOutline, searchOutline, closeCircle, callOutline,
      locationOutline, businessOutline, chevronBackOutline, chevronForwardOutline,
      refreshOutline, alertCircleOutline, funnelOutline,
      gridOutline, documentTextOutline, banOutline, checkmarkCircleOutline,
    });
  }

  ngOnInit() {
    this.loadDealers();
  }

  loadDealers() {
    this.isLoading = true;
    this.loadFailed = false;

    this.dealerService.getDealerDirectory().subscribe({
      next: (list) => {
        this.dealers = list;
        this.distributors = [...new Set(list.map(d => d.distributorName).filter((n): n is string => !!n))]
          .sort((a, b) => a.localeCompare(b));
        // A refresh can drop the distributor that was selected — fall back instead of showing an empty table.
        if (this.distributorFilter !== 'all' && !this.distributors.includes(this.distributorFilter)) {
          this.distributorFilter = 'all';
        }
        this.applyFilters(false);
        this.isLoading = false;
        this.lastUpdated = new Date();
      },
      error: (err) => {
        console.error('Dealers page: failed to load dealers', err);
        this.loadFailed = true;
        this.isLoading = false;
        this.haptic.error();
      },
    });
  }

  onSearch(value: string) {
    this.searchTerm = value ?? '';
    this.applyFilters();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilters();
  }

  onDistributorChange(value: string) {
    this.distributorFilter = value;
    this.haptic.selectionChanged();
    this.applyFilters();
  }

  onStatusChange(value: 'all' | DealerStatus) {
    this.statusFilter = value;
    this.haptic.selectionChanged();
    this.applyFilters();
  }

  resetFilters() {
    this.searchTerm = '';
    this.distributorFilter = 'all';
    this.statusFilter = 'all';
    this.haptic.selectionChanged();
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm.trim() || this.distributorFilter !== 'all' || this.statusFilter !== 'all';
  }

  private applyFilters(resetPage = true) {
    const q = this.searchTerm.trim().toLowerCase();
    this.filtered = this.dealers.filter(d =>
      (this.distributorFilter === 'all' || d.distributorName === this.distributorFilter) &&
      (this.statusFilter === 'all' || this.statusOf(d) === this.statusFilter) &&
      (!q || [d.fullName, d.phone, d.address, d.distributorName].some(v => (v ?? '').toLowerCase().includes(q)))
    );
    if (resetPage) this.page = 1;
    this.updatePage();
  }

  // ── Paging ────────────────────────────────────────────────────────────

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get rangeStart(): number {
    return this.filtered.length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.filtered.length);
  }

  private updatePage() {
    this.page = Math.min(Math.max(1, this.page), this.pageCount);
    const start = (this.page - 1) * this.pageSize;
    this.pageRows = this.filtered.slice(start, start + this.pageSize);
    this.pageNumbers = this.buildPageNumbers(this.page, this.pageCount);
  }

  // Windowed list with '...' gaps, e.g. [1, '...', 4, 5, 6, '...', 20]
  private buildPageNumbers(current: number, total: number): (number | '...')[] {
    const pages: (number | '...')[] = [1];
    const lo = Math.max(2, current - 1);
    const hi = Math.min(total - 1, current + 1);
    if (lo > 2) pages.push('...');
    for (let p = lo; p <= hi; p++) pages.push(p);
    if (hi < total - 1) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
  }

  goToPage(p: number | '...') {
    if (p === '...' || p === this.page) return;
    this.haptic.selectionChanged();
    this.page = p;
    this.updatePage();
  }

  prevPage() {
    if (this.page > 1) this.goToPage(this.page - 1);
  }

  nextPage() {
    if (this.page < this.pageCount) this.goToPage(this.page + 1);
  }

  // ── Template helpers ──────────────────────────────────────────────────

  initials(name: string): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(p => /^[\p{L}\p{N}]/u.test(p));
    if (parts.length === 0) return '?';
    const first = Array.from(parts[0])[0];
    const second = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] : '';
    return (first + second).toUpperCase();
  }

  phoneHref(phone: string): string {
    return 'tel:' + phone.replace(/[^\d+]/g, '');
  }

  trackByDealer(index: number, d: DealerDto): number | string {
    return d.id ?? index;
  }

  // ── Suspend / activate ────────────────────────────────────────────────

  statusOf(d: DealerDto): DealerStatus {
    return d.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  }

  isUpdating(d: DealerDto): boolean {
    return this.updatingIds.has(d.id);
  }

  async toggleStatus(d: DealerDto) {
    if (d.id == null || this.isUpdating(d)) return;

    const next: DealerStatus = this.statusOf(d) === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

    // Suspending blocks a dealer, so ask first. Re-activating is the safe direction — no prompt.
    if (next === 'SUSPENDED') {
      this.haptic.warning();
      const alert = await this.alertCtrl.create({
        header: 'Suspend dealer?',
        message: `${d.fullName || 'This dealer'} will be marked as suspended. You can activate them again at any time.`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Suspend', role: 'confirm' },
        ],
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role !== 'confirm') return;
    }

    this.updatingIds.add(d.id);
    this.dealerService.updateDealerStatus(d.id, next).subscribe({
      next: () => {
        this.updatingIds.delete(d.id);
        d.status = next;
        d.isActive = next === 'ACTIVE';
        // Re-run the filters so a row leaves/enters the list if a status filter is on (stays on the same page).
        this.applyFilters(false);
        this.haptic.success();
        this.toast.present(
          next === 'SUSPENDED' ? `${d.fullName || 'Dealer'} suspended` : `${d.fullName || 'Dealer'} activated`,
          'success'
        );
      },
      error: (err) => {
        console.error('Dealers page: failed to update dealer status', err);
        this.updatingIds.delete(d.id);
        this.haptic.error();
        const msg = err?.error?.message ?? err?.error?.error ?? 'Failed to update dealer status';
        this.toast.present(msg, 'danger');
      },
    });
  }

  // ── Export (everything matching the current filters, not just the visible page) ──

  get canExport(): boolean {
    return !this.isLoading && !this.loadFailed && !this.isExporting && this.filtered.length > 0;
  }

  private exportHeaders = ['#', 'Dealer', 'Phone', 'Address', 'Distributor', 'Status'];

  private exportRows(): (string | number)[][] {
    return this.filtered.map((d, i) => [
      i + 1,
      d.fullName || '—',
      d.phone || '—',
      d.address || '—',
      d.distributorName || '—',
      this.statusOf(d) === 'SUSPENDED' ? 'Suspended' : 'Active',
    ]);
  }

  async exportExcel() {
    if (!this.canExport) return;
    this.isExporting = true;
    try {
      // Plain loop: Object.fromEntries needs lib ES2019, which this project's tsconfig doesn't target.
      const rows = this.exportRows().map(r => {
        const row: Record<string, unknown> = {};
        this.exportHeaders.forEach((h, idx) => { row[h] = r[idx]; });
        return row;
      });
      await exportRowsToExcel(rows, 'Dealer Directory', this.downloadService, this.toast);
    } catch (err) {
      console.error('Dealers page: Excel export failed', err);
      this.toast.present('Failed to export Excel', 'danger');
    } finally {
      this.isExporting = false;
    }
  }

  async exportPdf() {
    if (!this.canExport) return;
    this.isExporting = true;
    try {
      await exportRowsToPdf(this.exportHeaders, this.exportRows(), 'Dealer Directory', this.downloadService, this.toast);
    } catch (err) {
      console.error('Dealers page: PDF export failed', err);
      this.toast.present('Failed to export PDF', 'danger');
    } finally {
      this.isExporting = false;
    }
  }
}
