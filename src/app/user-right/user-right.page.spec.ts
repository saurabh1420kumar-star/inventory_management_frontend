import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserRightPage } from './user-right.page';

describe('UserRightPage', () => {
  let component: UserRightPage;
  let fixture: ComponentFixture<UserRightPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UserRightPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
