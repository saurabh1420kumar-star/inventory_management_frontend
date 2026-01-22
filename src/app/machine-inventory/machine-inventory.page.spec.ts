import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MachineInventoryPage } from './machine-inventory.page';

describe('MachineInventoryPage', () => {
  let component: MachineInventoryPage;
  let fixture: ComponentFixture<MachineInventoryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MachineInventoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
