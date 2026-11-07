import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-report-hero',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './report-hero.component.html',
  // Ionic sizes ion-content via the .ion-page flex chain (ion-header + ion-content as
  // direct flex children). Without display:contents this component's own box breaks
  // that chain and ion-content collapses/stops scrolling.
  host: { style: 'display: contents' },
})
export class ReportHeroComponent {
  @Input() toolbarAccent = '';
  @Input() toolbarTitle = 'Reports';
  @Input() eyebrow = 'Reports';
  @Input() heroTitle = '';
  @Input() subtitle = '';
  @Input() icon = 'stats-chart-outline';
  @Input() lastUpdated: Date | null = null;
  @Input() isBusy = false;
  /** Opt-in black top bar (matches Distributor Master). Off by default so other report pages are unchanged. */
  @Input() darkToolbar = false;
  @Output() refresh = new EventEmitter<void>();
}
