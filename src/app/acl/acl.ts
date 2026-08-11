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
  // CRUD ACTION CHECKS (button-level gating)
  // =====================================
  canCreate(featureName: string): boolean {
    return this.auth.canCreate(featureName);
  }

  canRead(featureName: string): boolean {
    return this.auth.canRead(featureName);
  }

  canUpdate(featureName: string): boolean {
    return this.auth.canUpdate(featureName);
  }

  canDelete(featureName: string): boolean {
    return this.auth.canDelete(featureName);
  }

  // First web-admin module route the current user can open. Used to land users who
  // lack the DASHBOARD feature on a page they actually have access to (instead of the
  // hidden dashboard). Order = sidebar priority; only existing top-level routes listed.
  getLandingRoute(): string {
    const routeByFeature: Array<[string, string]> = [
      ['ACCOUNTS_MASTER', '/accounts-master'],
      ['TRANSACTION_MASTER', '/transaction-master'],
      ['TRANSACTION_CASHBOOK', '/transaction-cashbook'],
      ['HR', '/hr-department'],
      ['ADMIN_APPROVAL', '/hr-admin-approval'],
      ['INVENTORY_MASTERS', '/master-inventory'],
      ['INVENTORY_INWARD', '/inward'],
      ['INVENTORY_OUTWARD', '/outward-inventory'],
      ['ORDER_DETAILS', '/order-details'],
      ['DISPATCH', '/dispatch'],
      ['COMPLAINT', '/complaints'],
      ['REPORTS', '/reports/mis-dashboard'],
      ['USER_RIGHTS', '/user-right'],
    ];
    const match = routeByFeature.find(([feature]) => this.can(feature));
    // Absolute last resort (exotic feature set) — dashboard beats a 404.
    return match ? match[1] : '/dashboard';
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
