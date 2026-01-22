import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HrDepartmentPage } from './hr-department.page';

describe('HrDepartmentPage', () => {
  let component: HrDepartmentPage;
  let fixture: ComponentFixture<HrDepartmentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HrDepartmentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
