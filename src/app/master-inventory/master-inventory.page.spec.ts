import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MasterInventoryPage } from './master-inventory.page';

describe('MasterInventoryPage', () => {
  let component: MasterInventoryPage;
  let fixture: ComponentFixture<MasterInventoryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MasterInventoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
