import { Injectable } from '@angular/core';
import { Auth } from '../services/auth';

@Injectable({
  providedIn: 'root',
})
export class Acl {

  constructor(private auth: Auth) {}

  // =====================================
  // 🔑 SIDEBAR VISIBILITY (ANY FEATURE)
  // =====================================
  hasAnyFeature(): boolean {
    const features = this.auth.getFeatures();
    const featureNames = this.auth.getFeatureNames();

    return (
      (Array.isArray(features) && features.length > 0) ||
      (Array.isArray(featureNames) && featureNames.length > 0)
    );
  }

  // =====================================
  // FEATURE CHECKS
  // =====================================
  can(featureName: string): boolean {
    return this.auth.hasFeature(featureName);
  }

  canAny(featureNames: string[]): boolean {
    return featureNames.some(f => this.auth.hasFeature(f));
  }

  canAll(featureNames: string[]): boolean {
    return featureNames.every(f => this.auth.hasFeature(f));
  }

  canRoute(path: string): boolean {
    return this.auth.getFeatures()?.some(f => f.path === path) ?? false;
  }

  // =====================================
  // USER INFO (OPTIONAL)
  // =====================================
  getRole(): string | null {
    return this.auth.getRoleType();
  }

  getUserName(): string | null {
    return this.auth.getUsername();
  }

  getUserId(): number | null {
    return this.auth.getUserId();
  }
}
