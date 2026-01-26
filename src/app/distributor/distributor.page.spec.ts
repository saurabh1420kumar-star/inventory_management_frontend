import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DistributorPage } from './distributor.page';

describe('DistributorPage', () => {
  let component: DistributorPage;
  let fixture: ComponentFixture<DistributorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DistributorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
