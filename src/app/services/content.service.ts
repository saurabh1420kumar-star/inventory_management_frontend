import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export interface Offer {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  validFrom: string;
  validTo: string;
  displayOrder: number;
  createdAt: string;
  createdBy: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  imageUrl: string;
  createdBy: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  private offersUrl = `${environment.contentUrl}/offers`;
  private notificationsUrl = `${environment.contentUrl}/notifications`;

  private offersSubject = new BehaviorSubject<Offer[]>([]);
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private offersLoaded = false;
  private notificationsLoaded = false;

  offers$ = this.offersSubject.asObservable();
  notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private auth: Auth
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  // ── Admin endpoints (all, including inactive) ──

  getAllOffers(): Observable<Offer[]> {
    return this.http
      .get<Offer[]>(`${this.offersUrl}/all`, { headers: this.getHeaders() })
      .pipe(catchError(() => of([])));
  }

  createOffer(data: Partial<Offer>, image?: File): Observable<Offer> {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('data', blob);
    if (image) {
      formData.append('image', image);
    }
    return this.http.post<Offer>(this.offersUrl, formData, {
      headers: this.getHeaders(),
    });
  }

  updateOffer(id: number, data: Partial<Offer>, image?: File): Observable<Offer> {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('data', blob);
    if (image) {
      formData.append('image', image);
    }
    return this.http.put<Offer>(`${this.offersUrl}/${id}`, formData, {
      headers: this.getHeaders(),
    });
  }

  deleteOffer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.offersUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  getAllNotifications(): Observable<Notification[]> {
    return this.http
      .get<Notification[]>(`${this.notificationsUrl}/all`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(() => of([])));
  }

  createNotification(data: Partial<Notification>, image?: File): Observable<Notification> {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('data', blob);
    if (image) {
      formData.append('image', image);
    }
    return this.http.post<Notification>(this.notificationsUrl, formData, {
      headers: this.getHeaders(),
    });
  }

  updateNotification(id: number, data: Partial<Notification>, image?: File): Observable<Notification> {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('data', blob);
    if (image) {
      formData.append('image', image);
    }
    return this.http.put<Notification>(`${this.notificationsUrl}/${id}`, formData, {
      headers: this.getHeaders(),
    });
  }

  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.notificationsUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  // ── Distributor feed (cached) ──
  // The backend exposes only the `/all` endpoints, which include inactive
  // records, so the active filter is applied here before distributors see it.

  loadActiveOffers(): void {
    if (this.offersLoaded) return;
    this.getAllOffers().subscribe((offers) => {
      this.offersSubject.next(offers.filter((o) => o.isActive));
      this.offersLoaded = true;
    });
  }

  loadActiveNotifications(): void {
    if (this.notificationsLoaded) return;
    this.getAllNotifications().subscribe((notifications) => {
      this.notificationsSubject.next(notifications.filter((n) => n.isActive));
      this.notificationsLoaded = true;
    });
  }

  refreshOffers(): void {
    this.offersLoaded = false;
    this.loadActiveOffers();
  }

  refreshNotifications(): void {
    this.notificationsLoaded = false;
    this.loadActiveNotifications();
  }

  clearContent(): void {
    this.offersSubject.next([]);
    this.notificationsSubject.next([]);
    this.offersLoaded = false;
    this.notificationsLoaded = false;
  }
}
