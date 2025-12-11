import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PendingApprovalsPage } from './pending-approvals.page';

describe('PendingApprovalsPage', () => {
  let component: PendingApprovalsPage;
  let fixture: ComponentFixture<PendingApprovalsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PendingApprovalsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
