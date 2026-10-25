import { Component, OnDestroy, signal, Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { Product, ProductVariant } from '../product.models';
import { ProductApiService } from '../product-api.service';
import { filterProductDescriptionBullets } from './product-description';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  standalone: false,
})
export class ProductComponent implements OnDestroy {
  productLoading$ = signal<boolean>(false);
  product$ = signal<Product | null>(null);
  errorMessage = signal<string | null>(null);

  currentLang: string = 'vi';
  private routeSub: Subscription;
  private apiSub?: Subscription;

  // State cho Popup/Modal
  selectedImage: string = '';
  galleryImages: string[] = [];
  selectedClassification: string | null = null;
  selectedColor: string | null = null;
  selectedSize: string | null = null;
  selectedVariant: ProductVariant | null = null;

  quantity: number = 1;
  isOnSale: boolean = false;
  displaySalePrice: number = 0;
  displayRegularPrice: number = 0;
  maxStock: number = 0;
  isOutOfStock: boolean = false;
  displaySku: string = '';
  productIdF: number | null = null;

  productTitle: string = '';
  productDescriptionFull: string[] = [];
  categoryBreadcrumb: string | null = null;

  hasClassification: boolean = false;
  availableClassifications: string[] = [];

  hasColors: boolean = false;
  availableColors: { name: string; hex: string }[] = [];

  hasSizes: boolean = false;
  availableSizes: string[] = [];

  shippingInfo: {
    basicCost: number | null;
    extendedCost: number | null;
    note: string | null;
  } | null = null;

  productTags: string[] = [];
  isUnavailable: boolean = false;
  currentProductId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private title: Title,
    private productApiService: ProductApiService
  ) {
    this.routeSub = this.route.params.subscribe((params) => {
      const rawId = params['id'] || params['titleUrl'] || params['slug'] || '';
      if (rawId) {
        this.loadProductFromApi(rawId);
      }
    });
  }

  /**
   * Gọi API server để lấy dữ liệu thực của sản phẩm từ MongoDB thông qua Slug hoặc ID
   */
  loadProductFromApi(slugOrId: string): void {
    this.productLoading$.set(true);
    this.errorMessage.set(null);
    this.isUnavailable = false;

    if (this.apiSub) {
      this.apiSub.unsubscribe();
    }

    this.apiSub = this.productApiService.getProductBySlugOrId(slugOrId).subscribe({
      next: (product) => {
        if (product) {
          this.product$.set(product);
          this.initProductState(product);
          this.productLoading$.set(false);
        } else {
          this.product$.set(null);
          this.isUnavailable = true;
          this.errorMessage.set('Sản phẩm không tồn tại trong cơ sở dữ liệu MongoDB.');
          this.productLoading$.set(false);
        }
      },
      error: (err) => {
        this.product$.set(null);
        this.isUnavailable = true;
        this.errorMessage.set(
          err?.message || 'Không thể tải thông tin sản phẩm từ máy chủ MongoDB.'
        );
        this.productLoading$.set(false);
      },
    });
  }

  private initProductState(product: Product): void {
    if (!product) {
      this.isUnavailable = false;
      return;
    }

    if (product.visibility === false || product.vi?.visibility === false) {
      this.isUnavailable = true;
      return;
    }
    this.isUnavailable = false;
    this.productIdF = typeof product.IdF === 'number' ? product.IdF : null;

    this.currentProductId = String(product._id || product.id || product.titleUrl || '');
    this.title.setTitle(product.title || 'Chi tiết sản phẩm');

    const viData = product.vi || product;
    this.productTitle = viData.title || product.title || '';

    if (Array.isArray(viData.descriptionFull) && viData.descriptionFull.length > 0) {
      this.productDescriptionFull = filterProductDescriptionBullets(viData.descriptionFull);
    } else if (Array.isArray(product.descriptionFull) && product.descriptionFull.length > 0) {
      this.productDescriptionFull = filterProductDescriptionBullets(product.descriptionFull);
    } else if (product.description) {
      this.productDescriptionFull = [product.description];
    } else {
      this.productDescriptionFull = [];
    }

    this.categoryBreadcrumb = product.categoryTitle || product.category || 'Thời Trang';

    this.galleryImages = [];
    const mainImgUrl = product.mainImage?.url;
    if (mainImgUrl) {
      this.galleryImages.push(mainImgUrl);
    }
    if (Array.isArray(product.images)) {
      for (const img of product.images) {
        const url = typeof img === 'string' ? img : (img as any)?.url;
        if (url && !this.galleryImages.includes(url)) {
          this.galleryImages.push(url);
        }
      }
    }
    this.selectedImage = this.galleryImages.length > 0 ? this.galleryImages[0] : '';

    // Classification
    let classList: string[] = [];
    if (Array.isArray(viData.classifications) && viData.classifications.length > 0) {
      classList = viData.classifications;
    } else if (Array.isArray(product.classifications) && product.classifications.length > 0) {
      classList = product.classifications;
    } else if (Array.isArray(product.variants) && product.variants.length > 0) {
      classList = Array.from(new Set(product.variants.map((v) => v.classification).filter((v): v is string => Boolean(v))));
    }
    this.hasClassification = classList.length > 0;
    this.availableClassifications = classList;
    this.selectedClassification = this.availableClassifications.length > 0 ? this.availableClassifications[0] : null;

    // Colors
    let colorList: { name: string; hex: string }[] = [];
    if (Array.isArray(viData.colors) && viData.colors.length > 0) {
      colorList = viData.colors;
    } else if (Array.isArray(product.colors) && product.colors.length > 0) {
      colorList = product.colors;
    } else if (Array.isArray(product.variants)) {
      const distinctColors = Array.from(new Set(product.variants.map((v) => v.color).filter((v): v is string => Boolean(v))));
      if (distinctColors.length > 0) {
        colorList = distinctColors.map((name) => ({ name, hex: '#74070E' }));
      }
    }
    this.hasColors = colorList.length > 0;
    this.availableColors = colorList;
    this.selectedColor = this.availableColors.length > 0 ? this.availableColors[0].name : null;

    // Sizes
    let sizeList: string[] = [];
    if (Array.isArray(viData.sizes) && viData.sizes.length > 0) {
      sizeList = viData.sizes;
    } else if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      sizeList = product.sizes;
    } else if (Array.isArray(product.variants)) {
      sizeList = Array.from(new Set(product.variants.map((v) => v.size).filter((v): v is string => Boolean(v))));
    }
    this.hasSizes = sizeList.length > 0;
    this.availableSizes = sizeList;
    this.selectedSize = this.availableSizes.length > 0 ? this.availableSizes[0] : null;

    this.productTags = Array.isArray(product.tags) ? product.tags : [];

    const shipBasic = product.shippingBasicCost !== undefined ? product.shippingBasicCost : 25000;
    const shipExt = product.shippingExtendedCost !== undefined ? product.shippingExtendedCost : 35000;
    const shipNote = product.shipping || 'Giao hàng nhanh từ 2 - 4 ngày làm việc.';

    this.shippingInfo = {
      basicCost: shipBasic,
      extendedCost: shipExt,
      note: shipNote,
    };

    this.quantity = 1;
    this.updateSelectedVariant();
  }

  updateSelectedVariant(): void {
    const product = this.product$();
    if (!product) return;

    const variants: ProductVariant[] = Array.isArray(product.variants) ? product.variants : [];
    if (variants.length > 0) {
      this.selectedVariant = variants.find((v) => {
        const matchClass = !this.hasClassification || !this.selectedClassification || v.classification === this.selectedClassification;
        const matchColor = !this.hasColors || !this.selectedColor || v.color === this.selectedColor;
        const matchSize = !this.hasSizes || !this.selectedSize || v.size === this.selectedSize;
        return matchClass && matchColor && matchSize;
      }) || variants[0];
    } else {
      this.selectedVariant = null;
    }

    this.calculatePriceAndStock();
  }

  calculatePriceAndStock(): void {
    const product = this.product$();
    if (!product) return;

    if (this.selectedVariant) {
      this.displaySku = this.selectedVariant.sku || product.sku || '';
      const reg = Number(this.selectedVariant.regularPrice) || Number(product.regularPrice) || 0;
      const sale = Number(this.selectedVariant.salePrice) || reg;
      if (sale > 0 && sale < reg) {
        this.isOnSale = true;
        this.displaySalePrice = sale;
        this.displayRegularPrice = reg;
      } else {
        this.isOnSale = false;
        this.displaySalePrice = reg;
        this.displayRegularPrice = reg;
      }
      this.maxStock = Math.max(0, Number(this.selectedVariant.stock) || 0);
      this.isOutOfStock = this.maxStock <= 0;
    } else {
      this.displaySku = product.sku || '';
      const reg = Number(product.regularPrice) || 0;
      const sale = Number(product.salePrice) || reg;
      if (product.onSale && sale > 0 && reg > sale) {
        this.isOnSale = true;
        this.displaySalePrice = sale;
        this.displayRegularPrice = reg;
      } else {
        this.isOnSale = false;
        this.displaySalePrice = sale || reg;
        this.displayRegularPrice = reg || sale;
      }
      const q = Number(product.quantity ?? product.stock ?? 10);
      this.maxStock = Math.max(0, q);
      this.isOutOfStock = this.maxStock <= 0;
    }

    if (this.isOutOfStock) {
      this.quantity = 0;
    } else {
      if (this.quantity < 1) this.quantity = 1;
      if (this.maxStock > 0 && this.quantity > this.maxStock) {
        this.quantity = this.maxStock;
      }
    }
  }

  isSelectionComplete(): boolean {
    if (this.hasClassification && !this.selectedClassification) return false;
    if (this.hasColors && !this.selectedColor) return false;
    if (this.hasSizes && !this.selectedSize) return false;
    return true;
  }

  onSelectClassification(cls: string): void {
    this.selectedClassification = cls;
    this.updateSelectedVariant();
  }

  onSelectColor(c: string): void {
    this.selectedColor = c;
    this.updateSelectedVariant();
  }

  onSelectSize(s: string): void {
    this.selectedSize = s;
    this.updateSelectedVariant();
  }

  selectImage(img: string): void {
    this.selectedImage = img;
  }

  openGalleryDialog(): void {
    // Zoom / Preview dialog
  }

  decreaseQty(): void {
    if (this.isOutOfStock || this.quantity <= 1) return;
    this.quantity--;
  }

  increaseQty(): void {
    if (this.isOutOfStock) return;
    if (this.maxStock > 0 && this.quantity >= this.maxStock) return;
    this.quantity++;
  }

  handleAddToCart(): void {
    const product = this.product$();
    if (!product || this.isOutOfStock) return;
    alert(`Đã thêm ${this.quantity} sản phẩm "${product.title}" vào giỏ hàng!`);
  }

  handleBuyNow(): void {
    const product = this.product$();
    if (!product || this.isOutOfStock) return;
    alert(`Mua ngay ${this.quantity} sản phẩm "${product.title}"!`);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/product-slug-idf/all']);
    }
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.apiSub) this.apiSub.unsubscribe();
  }
}
