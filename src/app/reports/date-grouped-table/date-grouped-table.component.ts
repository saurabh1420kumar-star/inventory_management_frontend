import { Component, ContentChild, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HapticService } from '../../services/haptic.service';
import {
  DateGroup, groupByDate, groupByValue,
  Pager, paginate, totalPages, pageWindow, pageRange,
} from '../report-shared';

// One extra column in the per-group summary row, computed from that group's rows
// (the group column and the record-count column are always present). The modal shows each of
// these as a stat tile.
export interface DateSummaryColumn<T> {
  header: string;
  value: (rows: T[]) => string | number;
}

export interface DateGroupDetailContext<T> {
  $implicit: T[];
  group: DateGroup<T>;
}

interface SummaryGroup<T> extends DateGroup<T> {
  summary: (string | number)[];
}

/**
 * Clusters a report's rows — by date (`dateField`) or by a text value such as product (`groupField`).
 * The table lists one summary row per group; clicking one opens a modal with that group's full table,
 * summary tiles, a search box, and Excel / PDF export buttons scoped to the rows shown.
 *
 * The page supplies the full table through a template so its own cell markup and styles are reused:
 *
 *   <app-date-grouped-table heading="Scrap Sale" [rows]="saleRows" dateField="date" [summaryColumns]="cols"
 *       (exportExcel)="exportGroupExcel($event)" (exportPdf)="exportGroupPdf($event)">
 *     <ng-template #detail let-rows> <table class="report-table report-table-sticky">…</table> </ng-template>
 *   </app-date-grouped-table>
 *
 * `rows` must be a stable array (not a getter that filters on every read) — a new array identity
 * re-clusters the rows and resets the pager.
 */
@Component({
  selector: 'app-date-grouped-table',
  templateUrl: './date-grouped-table.component.html',
  styleUrls: ['./date-grouped-table.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class DateGroupedTableComponent<T> implements OnChanges {

  private haptic = inject(HapticService);

  // Names the report in the modal header, e.g. "Promotional Issue". Not called `title`: a static
  // `title="…"` attribute would also render as a native hover tooltip over the whole table.
  @Input({ required: true }) heading!: string;
  @Input({ required: true }) rows!: T[];
  // Exactly one of these says how to cluster: a row property holding a date, or one holding plain text.
  @Input() dateField?: keyof T & string;
  @Input() groupField?: keyof T & string;
  // Heading of the first column and the kind of group shown in the modal ("Date" when clustering by date).
  @Input() groupHeader?: string;
  @Input() groupIcon?: string;
  @Input() summaryColumns: DateSummaryColumn<T>[] = [];
  // Heading of the record-count column and the noun used for it ("Items", "Orders", "Invoices"…).
  @Input() countLabel = 'Items';
  @Input() emptyText = 'No records found';
  @Input() pageSize = 5;

  @Output() exportExcel = new EventEmitter<DateGroup<T>>();
  @Output() exportPdf = new EventEmitter<DateGroup<T>>();

  @ContentChild('detail', { read: TemplateRef }) detailTemplate?: TemplateRef<DateGroupDetailContext<T>>;

  groups: SummaryGroup<T>[] = [];
  pager: Pager = { page: 1, pageSize: 5 };

  // `selected` outlives `isModalOpen` so the modal's content stays rendered while it animates closed.
  selected: SummaryGroup<T> | null = null;
  isModalOpen = false;

  // Rows currently shown in the modal: the selected group's rows narrowed by the search box. Held in a
  // field, not a getter — a getter would hand the template a fresh array on every change-detection pass.
  search = '';
  visibleRows: T[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rows'] || changes['dateField'] || changes['groupField'] || changes['summaryColumns']) {
      this.groups = this.cluster().map(group => ({ ...group, summary: this.summaryColumns.map(col => col.value(group.rows)) }));
      this.pager.page = 1;
    }
    this.pager.pageSize = this.pageSize;
    this.pager.page = Math.min(this.pager.page, this.totalPageCount);
  }

  private cluster(): DateGroup<T>[] {
    const rows = this.rows ?? [];
    const { groupField, dateField } = this;
    if (groupField) return groupByValue(rows, row => row[groupField] as unknown as string | null | undefined);
    if (dateField) return groupByDate(rows, row => row[dateField] as unknown as string | null | undefined);
    throw new Error('app-date-grouped-table needs either dateField or groupField');
  }

  get columnHeader(): string { return this.groupHeader ?? (this.groupField ? 'Group' : 'Date'); }
  get icon(): string { return this.groupIcon ?? (this.groupField ? 'layers-outline' : 'calendar-outline'); }
  get itemCount(): number { return this.rows?.length ?? 0; }
  get selectedIndex(): number { return this.selected ? this.groups.indexOf(this.selected) : -1; }

  get pagedGroups(): SummaryGroup<T>[] { return paginate(this.groups, this.pager); }
  get rowRange(): { start: number; end: number } { return pageRange(this.pager, this.groups.length); }
  get totalPageCount(): number { return totalPages(this.groups.length, this.pager.pageSize); }
  get pageNumbers(): (number | '...')[] { return pageWindow(this.pager.page, this.totalPageCount); }

  goToPage(p: number | '...') { if (p !== '...') this.pager.page = p; }
  prevPage() { if (this.pager.page > 1) this.pager.page--; }
  nextPage() { if (this.pager.page < this.totalPageCount) this.pager.page++; }

  trackByKey(_: number, group: SummaryGroup<T>): string { return group.key; }

  open(group: SummaryGroup<T>) {
    this.haptic.medium();
    this.show(group);
    this.isModalOpen = true;
  }

  close() {
    this.isModalOpen = false;
  }

  onDismissed() {
    this.isModalOpen = false;
    this.selected = null;
  }

  // Steps through the groups in the same order the table lists them.
  step(delta: number) {
    const target = this.groups[this.selectedIndex + delta];
    if (!target) return;
    this.haptic.selectionChanged();
    this.show(target);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.isModalOpen || event.target instanceof HTMLInputElement) return;
    if (event.key === 'ArrowLeft') this.step(-1);
    else if (event.key === 'ArrowRight') this.step(1);
  }

  onSearch(value: string) {
    this.search = value;
    this.applySearch();
  }

  clearSearch() {
    this.onSearch('');
  }

  // Exports what the modal shows, so a filtered view exports the filtered rows.
  exportSelectedExcel() {
    if (this.selected) this.exportExcel.emit({ ...this.selected, rows: this.visibleRows });
  }

  exportSelectedPdf() {
    if (this.selected) this.exportPdf.emit({ ...this.selected, rows: this.visibleRows });
  }

  private show(group: SummaryGroup<T>) {
    this.selected = group;
    this.search = '';
    this.visibleRows = group.rows;
  }

  private applySearch() {
    const rows = this.selected?.rows ?? [];
    const query = this.search.trim().toLowerCase();
    this.visibleRows = query
      ? rows.filter(row => Object.values(row as object).join(' ').toLowerCase().includes(query))
      : rows;
  }
}
