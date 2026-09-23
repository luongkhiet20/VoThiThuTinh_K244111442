import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { ServiceProductImageEventComponent } from './service-product-image-event/service-product-image-event.component';
import { ServiceProductImageEventDetailComponent } from './service-product-image-event-detail/service-product-image-event-detail.component';
import { NavigationComponent } from './navigation/navigation.component';
import { ServiceProductCatalogComponent } from './service-product-catalog/service-product-catalog.component';
import { ServiceCustomerGroupComponent } from './service-customer-group/service-customer-group.component';
import { ProductService } from './services/product.service';
import { CatalogService } from './services/catalog.service';
import { CustomerHttpService, ProductHttpService } from './services/customer-http.service';

@NgModule({
  declarations: [
    App,
    ServiceProductImageEventComponent,
    ServiceProductImageEventDetailComponent,
    NavigationComponent,
    ServiceProductCatalogComponent,
    ServiceCustomerGroupComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
  ],
  providers: [
    provideHttpClient(),
    ProductService,
    CatalogService,
    CustomerHttpService,
    ProductHttpService,
  ],
  bootstrap: [App],
})
export class AppModule {}
