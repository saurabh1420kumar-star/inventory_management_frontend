import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountsMasterPage } from './accounts-master.page';

describe('AccountsMasterPage', () => {
  let component: AccountsMasterPage;
  let fixture: ComponentFixture<AccountsMasterPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountsMasterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
