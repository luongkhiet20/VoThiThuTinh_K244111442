import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { ProductComponent } from './product/product.component';
import { ProductsComponent } from './products/products.component';
import { PriceFormatPipe } from './price.pipe';
import { ProductApiService } from './product-api.service';

const routes: Routes = [
  { path: '', redirectTo: 'all', pathMatch: 'full' },
  { path: 'all', component: ProductsComponent },
  { path: 'category/:category', component: ProductsComponent },
  { path: ':id', component: ProductComponent },
];

@NgModule({
  declarations: [
    ProductComponent,
    ProductsComponent,
    PriceFormatPipe,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
  exports: [
    ProductComponent,
    ProductsComponent,
    PriceFormatPipe,
    RouterModule,
  ],
  providers: [
    ProductApiService,
  ],
})
export class ProductModule {}