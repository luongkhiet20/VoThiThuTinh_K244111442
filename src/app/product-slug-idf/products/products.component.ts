import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Product, Category, Pagination, sortOptions } from '../product.models';
import { ProductApiService } from '../product-api.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProductsComponent implements OnInit, OnDestroy {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loadingProducts = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  sortOptions = sortOptions;

  // Trạng thái bộ lọc & Phân trang
  selectedCategory = signal<string>('all');
  searchQuery = signal<string>('');
  filterPrice = signal<number>(5000000);
  filterMinPrice = signal<number>(0);
  maxPrice = signal<number>(5000000);
  minPrice = signal<number>(0);
  sortBy = signal<string>('newest');
  columnsView = signal<number>(4);
  sidebarOpened = signal<boolean>(false);

  page = signal<number>(1);
  pageSize = signal<number>(12);
  pagination = signal<Pagination>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });

  private routeSub?: Subscription;
  private apiSub?: Subscription;
  private catSub?: Subscription;

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.selectedCategory() !== 'all') count++;
    if (this.filterPrice() < this.maxPrice()) count++;
    if (this.filterMinPrice() > 0) count++;
    if (this.searchQuery().trim()) count++;
    return count;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productApiService: ProductApiService
  ) {}

  ngOnInit(): void {
    this.loadCategories();

    this.routeSub = this.route.params.subscribe((params) => {
      const cat = params['category'];
      if (cat) {
        this.selectedCategory.set(cat);
      }
      this.loadProducts();
    });
  }

  loadCategories(): void {
    if (this.catSub) {
      this.catSub.unsubscribe();
    }
    this.catSub = this.productApiService.getCategories().subscribe({
      next: (cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          this.categories.set(cats);
        }
      },
      error: () => {
        // Server categories không khả dụng, giữ rỗng
      },
    });
  }

  loadProducts(): void {
    this.loadingProducts.set(true);
    this.errorMessage.set(null);

    if (this.apiSub) {
      this.apiSub.unsubscribe();
    }

    this.apiSub = this.productApiService
      .getProducts({
        category: this.selectedCategory(),
        search: this.searchQuery(),
        page: this.page(),
        limit: this.pageSize(),
        sort: this.sortBy(),
        minPrice: this.filterMinPrice(),
        maxPrice: this.filterPrice(),
      })
      .subscribe({
        next: (res) => {
          const visibleList = (res.products || []).filter((p) => p.visibility !== false);
          this.products.set(visibleList);
          this.pagination.set(
            res.pagination || {
              page: this.page(),
              limit: this.pageSize(),
              total: visibleList.length,
              totalPages: 1,
            }
          );
          this.loadingProducts.set(false);
        },
        error: (err) => {
          this.products.set([]);
          this.pagination.set({
            page: 1,
            limit: this.pageSize(),
            total: 0,
            totalPages: 1,
          });
          this.errorMessage.set(
            err?.message || 'Không thể tải danh sách sản phẩm từ cơ sở dữ liệu MongoDB.'
          );
          this.loadingProducts.set(false);
        },
      });
  }

  setColumns(cols: number): void {
    this.columnsView.set(cols);
  }

  changeCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.page.set(1);
    this.loadProducts();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value || '');
    this.page.set(1);
    this.loadProducts();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.page.set(1);
    this.loadProducts();
  }

  changeSort(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortBy.set(select.value);
    this.loadProducts();
  }

  priceRange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterPrice.set(Number(input.value) || this.maxPrice());
    this.page.set(1);
    this.loadProducts();
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.pagination().totalPages) {
      this.page.set(newPage);
      this.loadProducts();
    }
  }

  clearAllFilters(): void {
    this.selectedCategory.set('all');
    this.searchQuery.set('');
    this.filterPrice.set(this.maxPrice());
    this.filterMinPrice.set(0);
    this.sortBy.set('newest');
    this.page.set(1);
    this.loadProducts();
  }

  toggleSidebar(): void {
    this.sidebarOpened.update((v) => !v);
  }

  isOutOfStock(product: Product): boolean {
    return Number(product.quantity ?? product.stock ?? 1) <= 0;
  }

  hasDiscount(product: Product): boolean {
    return Boolean(product.onSale && product.regularPrice > product.salePrice);
  }

  getDisplayPrice(product: Product): number {
    return product.salePrice || product.regularPrice || 0;
  }

  getOriginalPrice(product: Product): number {
    return product.regularPrice || product.salePrice || 0;
  }

  addToCart(product: Product, event: MouseEvent): void {
    event.stopPropagation();
    alert(`Đã thêm "${product.title}" vào giỏ hàng!`);
  }

  /**
   * Điều hướng đến trang chi tiết sản phẩm theo Slug (titleUrl) hoặc ID
   */
  openProduct(product: Product): void {
    const slugOrId = product.titleUrl || product._id || product.id;
    if (slugOrId) {
      this.router.navigate(['/product-slug-idf', slugOrId]);
    }
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.apiSub) this.apiSub.unsubscribe();
    if (this.catSub) this.catSub.unsubscribe();
  }
}
