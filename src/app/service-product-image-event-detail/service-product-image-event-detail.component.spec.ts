import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ServiceProductImageEventDetailComponent } from './service-product-image-event-detail.component';

describe('ServiceProductImageEventDetailComponent', () => {
  let component: ServiceProductImageEventDetailComponent;
  let fixture: ComponentFixture<ServiceProductImageEventDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceProductImageEventDetailComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceProductImageEventDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
