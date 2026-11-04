import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  forwardRef,
  inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';

interface SelectRow {
  value: any;
  label: string;
  isClear?: boolean;
}

/**
 * Searchable replacement for a native <select>.
 *
 * Works with reactive forms (`formControlName`) or standalone (`[value]` + `(selectionChange)`).
 * Options are plain objects; tell it which keys to use:
 *   <app-searchable-select [options]="items" valueKey="code" labelPrefixKey="code" labelKey="name" ... />
 * renders "CODE - Name" labels and stores `code` as the value.
 */
@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [IonIcon],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchableSelectComponent), multi: true }
  ],
  template: `
    <button type="button"
            class="ss-trigger"
            [class.ss-trigger--error]="hasError"
            [class.ss-trigger--open]="isOpen"
            [disabled]="disabled"
            aria-haspopup="listbox"
            [attr.aria-expanded]="isOpen"
            (click)="toggle()"
            (keydown)="onTriggerKeydown($event)">
      <span class="ss-value" [class.ss-placeholder]="!selectedLabel()">{{ selectedLabel() || placeholder }}</span>
      <ion-icon name="chevron-down-outline" class="ss-chevron" [class.ss-chevron--open]="isOpen"></ion-icon>
    </button>

    @if (isOpen) {
      <div class="ss-panel">
        <div class="ss-search">
          <ion-icon name="search-outline" class="ss-search-icon"></ion-icon>
          <input #searchInput
                 type="text"
                 autocomplete="off"
                 spellcheck="false"
                 [placeholder]="searchPlaceholder"
                 [value]="query"
                 (input)="onQuery($any($event.target).value)"
                 (keydown)="onSearchKeydown($event)" />
        </div>

        <div class="ss-list" role="listbox">
          @for (row of visibleRows(); track $index) {
            <button type="button"
                    role="option"
                    class="ss-option"
                    [class.ss-option--active]="$index === activeIndex"
                    [class.ss-option--selected]="isSelected(row)"
                    [class.ss-option--clear]="row.isClear"
                    [attr.aria-selected]="isSelected(row)"
                    (mouseenter)="activeIndex = $index"
                    (click)="select(row)">
              <span class="ss-option-label">{{ row.label }}</span>
              @if (isSelected(row) && !row.isClear) {
                <ion-icon name="checkmark-outline" class="ss-check"></ion-icon>
              }
            </button>
          }
          @if (filteredOptions().length === 0) {
            <div class="ss-empty">{{ query ? 'No matches found' : 'No options available' }}</div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; position: relative; }

    .ss-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      text-align: left;
      background: #f8fafc;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 14px;
      line-height: 20px;
      cursor: pointer;
      transition: background-color .2s ease, border-color .2s ease, box-shadow .2s ease;
    }
    .ss-trigger:hover { background: #ffffff; }
    .ss-trigger:focus-visible,
    .ss-trigger--open {
      outline: none;
      background: #ffffff;
      border-color: #34d399;
      box-shadow: 0 0 0 4px #ecfdf5;
    }
    .ss-trigger--error { border-color: #fb7185; background: rgba(255, 241, 242, .35); }
    .ss-trigger:disabled { opacity: .6; cursor: not-allowed; }

    .ss-value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ss-placeholder { color: #94a3b8; }
    .ss-chevron { flex-shrink: 0; color: #94a3b8; transition: transform .2s ease; }
    .ss-chevron--open { transform: rotate(180deg); }

    .ss-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      z-index: 40;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 14px 36px rgba(15, 23, 42, .18);
      padding: 8px;
    }

    .ss-search { position: relative; }
    .ss-search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 16px;
      pointer-events: none;
    }
    .ss-search input {
      width: 100%;
      box-sizing: border-box;
      background: #f8fafc;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px 10px 9px 32px;
      font-size: 14px;
      outline: none;
    }
    .ss-search input::placeholder { color: #94a3b8; }
    .ss-search input:focus { background: #ffffff; border-color: #34d399; box-shadow: 0 0 0 3px #ecfdf5; }

    .ss-list { max-height: 220px; overflow-y: auto; margin-top: 6px; }

    .ss-option {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      text-align: left;
      background: transparent;
      border: 0;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 14px;
      color: #334155;
      cursor: pointer;
    }
    .ss-option-label { min-width: 0; overflow-wrap: anywhere; }
    .ss-option--active { background: #ecfdf5; }
    .ss-option--selected { color: #047857; font-weight: 600; }
    .ss-option--clear { color: #94a3b8; font-style: italic; }
    .ss-check { flex-shrink: 0; color: #059669; }
    .ss-empty { padding: 10px 12px; font-size: 12px; font-weight: 500; color: #64748b; }
  `]
})
export class SearchableSelectComponent implements ControlValueAccessor {
  /** Source objects. */
  @Input() options: any[] = [];
  /** Property holding the value that gets stored / emitted. */
  @Input() valueKey = 'value';
  /** Property holding the visible text. */
  @Input() labelKey = 'label';
  /** Optional property shown before the label as "PREFIX - label" (e.g. material code). */
  @Input() labelPrefixKey = '';
  @Input() placeholder = 'Select...';
  @Input() searchPlaceholder = 'Search...';
  /** When set, a first row with this text lets the user clear the selection (emits ''). */
  @Input() clearLabel = '';
  @Input() hasError: boolean | null | undefined = false;
  @Input() disabled = false;
  /** Current value for standalone use; with forms the control drives this. */
  @Input() value: any = '';

  @Output() selectionChange = new EventEmitter<any>();

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  isOpen = false;
  query = '';
  activeIndex = 0;

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  // ── ControlValueAccessor ───────────────────────────────────────
  writeValue(v: any): void { this.value = v ?? ''; }
  registerOnChange(fn: (v: any) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  // ── Option helpers ─────────────────────────────────────────────
  private resolve(o: any): SelectRow {
    const main = o?.[this.labelKey] ?? '';
    const prefix = this.labelPrefixKey ? o?.[this.labelPrefixKey] : '';
    return { value: o?.[this.valueKey], label: prefix ? `${prefix} - ${main}` : String(main) };
  }

  private hasValue(): boolean {
    return this.value !== null && this.value !== undefined && this.value !== '';
  }

  private sameValue(a: any, b: any): boolean {
    return String(a) === String(b);
  }

  selectedLabel(): string {
    if (!this.hasValue()) return '';
    const match = (this.options ?? []).map(o => this.resolve(o)).find(r => this.sameValue(r.value, this.value));
    return match ? match.label : String(this.value);
  }

  filteredOptions(): SelectRow[] {
    const rows = (this.options ?? []).map(o => this.resolve(o));
    const tokens = this.query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return rows;
    return rows.filter(r => {
      const text = r.label.toLowerCase();
      return tokens.every(t => text.includes(t));
    });
  }

  visibleRows(): SelectRow[] {
    const rows = this.filteredOptions();
    return this.clearLabel && !this.query
      ? [{ value: '', label: this.clearLabel, isClear: true }, ...rows]
      : rows;
  }

  isSelected(row: SelectRow): boolean {
    return row.isClear ? !this.hasValue() : this.hasValue() && this.sameValue(row.value, this.value);
  }

  // ── Open / close ───────────────────────────────────────────────
  toggle(): void {
    if (this.isOpen) this.close(); else this.open();
  }

  open(): void {
    if (this.disabled) return;
    this.query = '';
    this.isOpen = true;
    const selectedIdx = this.visibleRows().findIndex(r => this.isSelected(r) && !r.isClear);
    this.activeIndex = selectedIdx >= 0 ? selectedIdx : 0;
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
      this.host.nativeElement.querySelector('.ss-panel')?.scrollIntoView({ block: 'nearest' });
      this.scrollActiveIntoView();
    });
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.onTouched();
  }

  select(row: SelectRow): void {
    this.value = row.value;
    this.onChange(row.value);
    this.selectionChange.emit(row.value);
    this.close();
  }

  onQuery(q: string): void {
    this.query = q;
    this.activeIndex = 0;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.isOpen && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  // ── Keyboard ───────────────────────────────────────────────────
  onTriggerKeydown(event: KeyboardEvent): void {
    if (!this.isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.open();
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const rows = this.visibleRows();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex = Math.min(rows.length - 1, this.activeIndex + 1);
        this.scrollActiveIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex = Math.max(0, this.activeIndex - 1);
        this.scrollActiveIntoView();
        break;
      case 'Enter':
        event.preventDefault();
        if (rows[this.activeIndex]) this.select(rows[this.activeIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close();
        this.host.nativeElement.querySelector<HTMLElement>('.ss-trigger')?.focus();
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  private scrollActiveIntoView(): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector('.ss-option--active')?.scrollIntoView({ block: 'nearest' });
    });
  }
}
