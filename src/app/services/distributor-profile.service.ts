import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DistributorService } from './distributor.service';
import { Auth } from './auth';

/**
 * Global Distributor Profile Service
 * Manages the logged-in distributor's profile data across the entire application
 */
@Injectable({
  providedIn: 'root'
})
export class DistributorProfileService {
  
  private profileSubject = new BehaviorSubject<any>(null);
  public profile$ = this.profileSubject.asObservable();
  
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();
  
  private distributorId: string | number | null = null;
  private profileLoaded = false;

  constructor(
    private distributorService: DistributorService,
    private auth: Auth
  ) {}

  /**
   * Load the distributor profile on app initialization
   */
  loadProfile(): void {
    if (this.profileLoaded) {
      return; // Already loaded, don't reload
    }

    this.distributorId = this.auth.getUserId();
    
    if (!this.distributorId) {
      console.warn('No distributor ID available');
      return;
    }

    this.isLoadingSubject.next(true);
    
    this.distributorService.getDistributorById(Number(this.distributorId)).subscribe({
      next: (response) => {
        if (response.data) {
          this.profileSubject.next(response.data);
          this.profileLoaded = true;
          console.log('✅ Global distributor profile loaded');
        }
        this.isLoadingSubject.next(false);
      },
      error: (error) => {
        console.error('❌ Failed to load distributor profile:', error);
        this.isLoadingSubject.next(false);
      }
    });
  }

  /**
   * Get the current profile data synchronously
   */
  getProfile(): any {
    return this.profileSubject.getValue();
  }

  /**
   * Get profile as observable
   */
  getProfile$(): Observable<any> {
    return this.profile$;
  }

  /**
   * Refresh the profile data from server
   */
  refreshProfile(): void {
    this.profileLoaded = false;
    this.loadProfile();
  }

  /**
   * Clear the profile (on logout)
   */
  clearProfile(): void {
    this.profileSubject.next(null);
    this.profileLoaded = false;
    this.distributorId = null;
  }
}
