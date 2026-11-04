import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { DateFilterState, DateMonthOption, DatePreset, EMPTY_DATE_FILTER } from './date-range-filter';

/**
 * Compact date filter: quick presets, a month picker (only months that have data) and a custom range.
 * Fully controlled — the parent owns `value` and re-filters on `valueChange`.
 */
@Component({
  selector: 'app-date-range-filter',
  standalone: true,
  imports: [IonIcon],
  template: `
    <div class="df">
      <span class="df-label">
        <ion-icon name="calendar-outline"></ion-icon>
        Date
      </span>

      <div class="df-chips">
        <button type="button" class="df-chip" [class.df-chip--active]="value.preset === 'all'" (click)="setPreset('all')">All time</button>
        <button type="button" class="df-chip" [class.df-chip--active]="value.preset === 'today'" (click)="setPreset('today')">Today</button>
        <button type="button" class="df-chip" [class.df-chip--active]="value.preset === '7d'" (click)="setPreset('7d')">Last 7 days</button>
        <button type="button" class="df-chip" [class.df-chip--active]="value.preset === 'month'" (click)="setPreset('month')">This month</button>
        <button type="button" class="df-chip" [class.df-chip--active]="value.preset === 'lastMonth'" (click)="setPreset('lastMonth')">Last month</button>

        <label class="df-chip df-select" [class.df-chip--active]="value.preset === 'pickMonth'">
          <select aria-label="Filter by month" (change)="onMonth($any($event.target).value)">
            <option value="" [selected]="value.preset !== 'pickMonth'">Pick month</option>
            @for (m of months; track m.value) {
              <option [value]="m.value" [selected]="value.preset === 'pickMonth' && value.month === m.value">{{ m.label }} ({{ m.count }})</option>
            }
          </select>
          <ion-icon name="chevron-down-outline"></ion-icon>
        </label>

        <button type="button" class="df-chip" [class.df-chip--active]="value.preset === 'custom'" (click)="toggleCustom()">
          <ion-icon name="options-outline"></ion-icon>
          Custom
        </button>

        @if (value.preset !== 'all') {
          <button type="button" class="df-clear" (click)="setPreset('all')">
            <ion-icon name="close-circle-outline"></ion-icon>
            Clear
          </button>
        }
      </div>

      @if (value.preset === 'custom') {
        <div class="df-range">
          <label>
            <span>From</span>
            <input type="date" [value]="value.from" [attr.max]="value.to || null" (change)="onRange('from', $any($event.target).value)" />
          </label>
          <label>
            <span>To</span>
            <input type="date" [value]="value.to" [attr.min]="value.from || null" (change)="onRange('to', $any($event.target).value)" />
          </label>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .df { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }

    .df-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #64748b;
    }

    .df-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }

    .df-chip {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      font-size: 12.5px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease;
    }
    .df-chip:hover { border-color: #6ee7b7; color: #047857; background: #f0fdf4; }
    .df-chip:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }
    .df-chip--active,
    .df-chip--active:hover {
      background: #10b981;
      border-color: #10b981;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(16, 185, 129, .3);
    }

    .df-select { padding-right: 26px; }
    .df-select select {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      outline: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
      padding: 0;
      max-width: 130px;
    }
    .df-select select option { color: #1e293b; background: #ffffff; }
    .df-select ion-icon { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); font-size: 12px; pointer-events: none; }

    .df-clear {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 30px;
      padding: 0 8px;
      border: 0;
      background: transparent;
      color: #64748b;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 8px;
    }
    .df-clear:hover { color: #e11d48; background: #fff1f2; }

    .df-range {
      flex-basis: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: 8px 12px;
      padding: 8px 10px;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      background: #f8fafc;
    }
    .df-range label { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #64748b; }
    .df-range input {
      height: 30px;
      padding: 0 10px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      color: #1e293b;
      font-size: 12.5px;
      outline: none;
    }
    .df-range input:focus { border-color: #34d399; box-shadow: 0 0 0 3px #ecfdf5; }
  `]
})
export class DateRangeFilterComponent {
  @Input() value: DateFilterState = { ...EMPTY_DATE_FILTER };
  /** Months that have entries, newest first (built by the page from its data). */
  @Input() months: DateMonthOption[] = [];
  @Output() valueChange = new EventEmitter<DateFilterState>();

  setPreset(preset: DatePreset): void {
    this.valueChange.emit({ ...EMPTY_DATE_FILTER, preset });
  }

  toggleCustom(): void {
    if (this.value.preset === 'custom') {
      this.setPreset('all');
    } else {
      this.valueChange.emit({ ...this.value, preset: 'custom' });
    }
  }

  onMonth(month: string): void {
    this.valueChange.emit(month ? { ...EMPTY_DATE_FILTER, preset: 'pickMonth', month } : { ...EMPTY_DATE_FILTER });
  }

  onRange(side: 'from' | 'to', date: string): void {
    this.valueChange.emit({ ...this.value, preset: 'custom', [side]: date });
  }
}
