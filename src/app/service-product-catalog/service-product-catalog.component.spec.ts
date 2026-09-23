import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceProductCatalogComponent } from './service-product-catalog.component';

describe('ServiceProductCatalogComponent', () => {
  let component: ServiceProductCatalogComponent;
  let fixture: ComponentFixture<ServiceProductCatalogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceProductCatalogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceProductCatalogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
