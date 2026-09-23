import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCustomerGroupComponent } from './service-customer-group.component';

describe('ServiceCustomerGroupComponent', () => {
  let component: ServiceCustomerGroupComponent;
  let fixture: ComponentFixture<ServiceCustomerGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceCustomerGroupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCustomerGroupComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
