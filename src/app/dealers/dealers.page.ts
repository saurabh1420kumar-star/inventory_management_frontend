// Dealer directory — read-only table fed by GET /api/dealers (environment.dealersUrl, via DealerService).
// Columns: dealer name, phone, address, distributor. Search + distributor filter + client-side paging.
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleCircleOutline, storefrontOutline, searchOutline, closeCircle, callOutline,
  locationOutline, businessOutline, chevronBackOutline, chevronForwardOutline,
  refreshOutline, alertCircleOutline, funnelOutline,
} from 'ionicons/icons';
import { DealerDto, DealerService } from '../services/dealer.service';
import { HapticService } from '../services/haptic.service';
import { ReportHeroComponent } from '../reports/report-hero/report-hero.component';

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
  page = 1;

  isLoading = false;
  loadFailed = false;
  lastUpdated: Date | null = null;

  constructor() {
    addIcons({
      peopleCircleOutline, storefrontOutline, searchOutline, closeCircle, callOutline,
      locationOutline, businessOutline, chevronBackOutline, chevronForwardOutline,
      refreshOutline, alertCircleOutline, funnelOutline,
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

  resetFilters() {
    this.searchTerm = '';
    this.distributorFilter = 'all';
    this.haptic.selectionChanged();
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm.trim() || this.distributorFilter !== 'all';
  }

  private applyFilters(resetPage = true) {
    const q = this.searchTerm.trim().toLowerCase();
    this.filtered = this.dealers.filter(d =>
      (this.distributorFilter === 'all' || d.distributorName === this.distributorFilter) &&
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
}
