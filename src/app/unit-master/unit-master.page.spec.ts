import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnitMasterPage } from './unit-master.page';

describe('UnitMasterPage', () => {
  let component: UnitMasterPage;
  let fixture: ComponentFixture<UnitMasterPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitMasterPage],
    }).compileComponents();

    fixture = TestBed.createComponent(UnitMasterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
