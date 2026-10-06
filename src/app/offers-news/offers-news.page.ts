import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { ContentService, Offer, Notification } from '../services/content.service';
import { HapticService } from '../services/haptic.service';

@Component({
  selector: 'app-offers-news',
  templateUrl: './offers-news.page.html',
  styleUrls: ['./offers-news.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class OffersNewsPage implements OnInit {
  activeTab: 'offers' | 'news' = 'offers';
  offers: Offer[] = [];
  notifications: Notification[] = [];

  constructor(
    private contentService: ContentService,
    private router: Router,
    private haptic: HapticService
  ) {}

  ngOnInit(): void {
    this.contentService.loadActiveOffers();
    this.contentService.loadActiveNotifications();

    this.contentService.offers$.subscribe((o) => (this.offers = o));
    this.contentService.notifications$.subscribe((n) => (this.notifications = n));
  }

  switchTab(tab: 'offers' | 'news'): void {
    this.haptic.light();
    this.activeTab = tab;
  }

  goBack(): void {
    this.haptic.light();
    this.router.navigate(['/dashboard']);
  }

  reload(): void {
    this.haptic.light();
    this.contentService.refreshOffers();
    this.contentService.refreshNotifications();
  }

  handleRefresh(event: any): void {
    this.contentService.refreshOffers();
    this.contentService.refreshNotifications();
    setTimeout(() => event.target.complete(), 1200);
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'ALERT': return 'warning-outline';
      case 'PROMOTION': return 'gift-outline';
      case 'UPDATE': return 'refresh-circle-outline';
      default: return 'information-circle-outline';
    }
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'ALERT': return '#fb7185';
      case 'PROMOTION': return '#c084fc';
      case 'UPDATE': return '#38bdf8';
      default: return '#10b981';
    }
  }
}
