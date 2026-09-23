import { Component } from '@angular/core';
import { CatalogService } from '../services/catalog.service';

@Component({
  selector: 'app-service-product-catalog',
  standalone: false,
  templateUrl: './service-product-catalog.component.html',
  styleUrls: ['./service-product-catalog.component.css']
})
export class ServiceProductCatalogComponent {
  public categories: any;

  constructor(private catalogService: CatalogService) {
    this.categories = this.catalogService.getCategories();
  }
}
