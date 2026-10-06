import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ContentService, Offer, Notification } from '../../services/content.service';
import { Toast } from '../../services/toast';
import { Auth } from '../../services/auth';
import { AclDirective } from '../../acl/acl.directive';

@Component({
  selector: 'app-notifications-offers',
  templateUrl: './notifications-offers.page.html',
  styleUrls: ['./notifications-offers.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, AclDirective],
})
export class NotificationsOffersPage implements OnInit {
  readonly FEATURE = 'NOTIFICATIONS_AND_OFFERS';

  activeTab: 'offers' | 'notifications' = 'offers';

  offers: Offer[] = [];
  notifications: Notification[] = [];
  isLoading = false;
  isSaving = false;

  // ── Offer form state ──
  showOfferModal = false;
  isEditingOffer = false;
  editingOfferId: number | null = null;
  offerForm = {
    title: '',
    description: '',
    validFrom: '',
    validTo: '',
    displayOrder: 0,
  };
  offerImageFile: File | null = null;
  offerPreview: string | null = null;

  // ── Notification form state ──
  showNotifModal = false;
  isEditingNotif = false;
  editingNotifId: number | null = null;
  notifForm = {
    title: '',
    message: '',
    type: 'INFO',
    expiresAt: '',
  };
  notifImageFile: File | null = null;
  notifPreview: string | null = null;
  notificationTypes = ['INFO', 'ALERT', 'PROMOTION', 'UPDATE'];

  constructor(
    private contentService: ContentService,
    private toast: Toast,
    public auth: Auth
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  switchTab(tab: 'offers' | 'notifications'): void {
    this.activeTab = tab;
  }

  loadAll(): void {
    this.isLoading = true;
    this.contentService.getAllOffers().subscribe({
      next: (data) => {
        this.offers = data;
        this.contentService.getAllNotifications().subscribe({
          next: (n) => {
            this.notifications = n;
            this.isLoading = false;
          },
          error: () => {
            this.isLoading = false;
          },
        });
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  // ════════════════════════════════════════════
  // OFFERS CRUD
  // ════════════════════════════════════════════

  openCreateOffer(): void {
    this.isEditingOffer = false;
    this.editingOfferId = null;
    this.offerForm = { title: '', description: '', validFrom: '', validTo: '', displayOrder: 0 };
    this.offerImageFile = null;
    this.offerPreview = null;
    this.showOfferModal = true;
  }

  openEditOffer(offer: Offer): void {
    this.isEditingOffer = true;
    this.editingOfferId = offer.id;
    this.offerForm = {
      title: offer.title,
      description: offer.description,
      validFrom: offer.validFrom,
      validTo: offer.validTo,
      displayOrder: offer.displayOrder,
    };
    this.offerImageFile = null;
    this.offerPreview = offer.imageUrl || null;
    this.showOfferModal = true;
  }

  closeOfferModal(): void {
    this.showOfferModal = false;
  }

  onOfferImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.offerImageFile = input.files[0];
    const reader = new FileReader();
    reader.onload = () => (this.offerPreview = reader.result as string);
    reader.readAsDataURL(this.offerImageFile);
  }

  removeOfferImage(): void {
    this.offerImageFile = null;
    this.offerPreview = null;
  }

  submitOffer(): void {
    if (!this.offerForm.title.trim()) {
      this.toast.present('Title is required', 'warning');
      return;
    }
    const payload: any = { ...this.offerForm };
    this.isSaving = true;

    const done = (message: string) => {
      this.toast.present(message, 'success');
      this.isSaving = false;
      this.closeOfferModal();
      this.loadAll();
    };
    const fail = (message: string) => {
      this.toast.present(message, 'danger');
      this.isSaving = false;
    };

    if (this.isEditingOffer && this.editingOfferId != null) {
      this.contentService
        .updateOffer(this.editingOfferId, payload, this.offerImageFile || undefined)
        .subscribe({
          next: () => done('Offer updated'),
          error: () => fail('Failed to update offer'),
        });
    } else {
      this.contentService
        .createOffer(payload, this.offerImageFile || undefined)
        .subscribe({
          next: () => done('Offer created'),
          error: () => fail('Failed to create offer'),
        });
    }
  }

  deleteOffer(offer: Offer): void {
    if (!confirm(`Delete offer "${offer.title}"?`)) return;
    this.contentService.deleteOffer(offer.id).subscribe({
      next: () => {
        this.toast.present('Offer deleted', 'success');
        this.loadAll();
      },
      error: () => this.toast.present('Failed to delete offer', 'danger'),
    });
  }

  // ════════════════════════════════════════════
  // NOTIFICATIONS CRUD
  // ════════════════════════════════════════════

  openCreateNotif(): void {
    this.isEditingNotif = false;
    this.editingNotifId = null;
    this.notifForm = { title: '', message: '', type: 'INFO', expiresAt: '' };
    this.notifImageFile = null;
    this.notifPreview = null;
    this.showNotifModal = true;
  }

  openEditNotif(n: Notification): void {
    this.isEditingNotif = true;
    this.editingNotifId = n.id;
    this.notifForm = {
      title: n.title,
      message: n.message,
      type: n.type,
      expiresAt: n.expiresAt,
    };
    this.notifImageFile = null;
    this.notifPreview = n.imageUrl || null;
    this.showNotifModal = true;
  }

  closeNotifModal(): void {
    this.showNotifModal = false;
  }

  onNotifImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.notifImageFile = input.files[0];
    const reader = new FileReader();
    reader.onload = () => (this.notifPreview = reader.result as string);
    reader.readAsDataURL(this.notifImageFile);
  }

  removeNotifImage(): void {
    this.notifImageFile = null;
    this.notifPreview = null;
  }

  submitNotif(): void {
    if (!this.notifForm.title.trim()) {
      this.toast.present('Title is required', 'warning');
      return;
    }
    const payload: any = { ...this.notifForm };
    this.isSaving = true;

    const done = (message: string) => {
      this.toast.present(message, 'success');
      this.isSaving = false;
      this.closeNotifModal();
      this.loadAll();
    };
    const fail = (message: string) => {
      this.toast.present(message, 'danger');
      this.isSaving = false;
    };

    if (this.isEditingNotif && this.editingNotifId != null) {
      this.contentService
        .updateNotification(this.editingNotifId, payload, this.notifImageFile || undefined)
        .subscribe({
          next: () => done('Notification updated'),
          error: () => fail('Failed to update notification'),
        });
    } else {
      this.contentService
        .createNotification(payload, this.notifImageFile || undefined)
        .subscribe({
          next: () => done('Notification created'),
          error: () => fail('Failed to create notification'),
        });
    }
  }

  deleteNotif(n: Notification): void {
    if (!confirm(`Delete notification "${n.title}"?`)) return;
    this.contentService.deleteNotification(n.id).subscribe({
      next: () => {
        this.toast.present('Notification deleted', 'success');
        this.loadAll();
      },
      error: () => this.toast.present('Failed to delete notification', 'danger'),
    });
  }

  // ════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════

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
      case 'ALERT': return '#f43f5e';
      case 'PROMOTION': return '#a855f7';
      case 'UPDATE': return '#0ea5e9';
      default: return '#10b981';
    }
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
