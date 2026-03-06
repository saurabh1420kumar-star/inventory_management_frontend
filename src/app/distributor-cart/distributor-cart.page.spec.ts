import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DistributorCartPage } from './distributor-cart.page';

describe('DistributorCartPage', () => {
  let component: DistributorCartPage;
  let fixture: ComponentFixture<DistributorCartPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DistributorCartPage ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DistributorCartPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
