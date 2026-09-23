import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ServiceProductImageEventComponent } from './service-product-image-event/service-product-image-event.component';
import { ServiceProductImageEventDetailComponent } from './service-product-image-event-detail/service-product-image-event-detail.component';
import { ServiceProductCatalogComponent } from './service-product-catalog/service-product-catalog.component';
import { ServiceCustomerGroupComponent } from './service-customer-group/service-customer-group.component';

const routes: Routes = [
  { path: '', redirectTo: 'service-product-image-event', pathMatch: 'full' },
  { path: 'service-product-image-event', component: ServiceProductImageEventComponent },
  { path: 'service-product-image-event/:id', component: ServiceProductImageEventDetailComponent },
  { path: 'service-product-catalog', component: ServiceProductCatalogComponent },
  { path: 'bai-14', component: ServiceProductCatalogComponent },
  { path: 'service-customer-group', component: ServiceCustomerGroupComponent },
  { path: 'bai-18', component: ServiceCustomerGroupComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
