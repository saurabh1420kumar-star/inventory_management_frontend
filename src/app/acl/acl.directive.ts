// src/app/acl/acl.directive.ts

import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { Acl } from './acl';

@Directive({
  selector: '[appAcl]',
  standalone: true
})
export class AclDirective implements OnInit, OnChanges {

  @Input() appAcl?: string | AclConfig;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private acl: Acl
  ) {}

  ngOnInit() {
    this.updateView();
  }

  ngOnChanges() {
    this.updateView();
  }

  private updateView() {
    this.viewContainer.clear();
    if (this.hasPermission()) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }

  private hasPermission(): boolean {
    if (!this.appAcl) return false;

    if (typeof this.appAcl === 'string') {
      return this.acl.can(this.appAcl);
    }

    const config = this.appAcl as AclConfig;

    if (config.anyFeature === true) {
      return this.acl.hasAnyFeature();
    }

    // Action-level (CRUD) gating: hide add/create/edit/delete controls
    // when the user lacks the specific permission for a feature.
    if (config.feature && config.action) {
      switch (config.action) {
        case 'create':
          return this.acl.canCreate(config.feature);
        case 'read':
          return this.acl.canRead(config.feature);
        case 'update':
          return this.acl.canUpdate(config.feature);
        case 'delete':
          return this.acl.canDelete(config.feature);
      }
    }

    if (config.feature) {
      return this.acl.can(config.feature);
    }

    if (config.features?.length) {
      return this.acl.canAny(config.features);
    }

    if (config.featuresAll?.length) {
      return this.acl.canAll(config.featuresAll);
    }

    if (config.route) {
      return this.acl.canRoute(config.route);
    }

    return false;
  }
}

export interface AclConfig {
  feature?: string;
  features?: string[];
  featuresAll?: string[];
  route?: string;
  anyFeature?: boolean;
  /** When set with `feature`, gates on a specific CRUD permission instead of mere feature access. */
  action?: 'create' | 'read' | 'update' | 'delete';
}
