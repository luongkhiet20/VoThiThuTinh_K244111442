import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Product, Category, Pagination } from './product.models';

export interface ProductsApiResponse {
  products: Product[];
  pagination: Pagination;
}

@Injectable({
  providedIn: 'root',
})
export class ProductApiService {
  // Điểm cuối API đọc sản phẩm từ server backend kết nối MongoDB
  // Mặc định gọi qua proxy hoặc direct backend cổng 4000 của hệ thống Cheri
  private readonly baseUrl = 'http://localhost:4000/api/products';
  private readonly fallbackUrl = '/api/products';

  constructor(private http: HttpClient) {}

  /**
   * Lấy danh sách sản phẩm thực từ MongoDB qua API server
   * Hỗ trợ bộ lọc category, search, page, limit, sort, minPrice, maxPrice
   */
  getProducts(filters: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
  } = {}): Observable<ProductsApiResponse> {
    let params = new HttpParams();

    if (filters.category && filters.category !== 'all') {
      params = params.set('category', filters.category);
    }
    if (filters.search && filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.page && filters.page > 0) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.limit && filters.limit > 0) {
      params = params.set('limit', filters.limit.toString());
    }
    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      params = params.set('minPrice', filters.minPrice.toString());
    }
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      params = params.set('maxPrice', filters.maxPrice.toString());
    }

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      catchError((primaryErr) => {
        // Thử fallbackUrl nếu baseUrl trực tiếp bị chặn CORS hoặc proxy được cấu hình
        return this.http.get<any>(this.fallbackUrl, { params }).pipe(
          catchError(() => throwError(() => primaryErr))
        );
      }),
      map((res: any) => {
        // Chuẩn hóa phản hồi từ server
        if (res && Array.isArray(res.products)) {
          return {
            products: res.products as Product[],
            pagination: res.pagination || {
              page: filters.page || 1,
              limit: filters.limit || 12,
              total: res.products.length,
              totalPages: Math.ceil(res.products.length / (filters.limit || 12)) || 1,
            },
          };
        } else if (Array.isArray(res)) {
          return {
            products: res as Product[],
            pagination: {
              page: filters.page || 1,
              limit: filters.limit || 12,
              total: res.length,
              totalPages: Math.ceil(res.length / (filters.limit || 12)) || 1,
            },
          };
        }
        return {
          products: [],
          pagination: { page: 1, limit: 12, total: 0, totalPages: 1 },
        };
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Lấy danh sách danh mục sản phẩm từ server
   */
  getCategories(): Observable<Category[]> {
    const url = `${this.baseUrl}/categories`;
    const fallback = `${this.fallbackUrl}/categories`;

    return this.http.get<any>(url).pipe(
      catchError(() => this.http.get<any>(fallback)),
      map((res: any) => {
        if (Array.isArray(res)) {
          return res as Category[];
        }
        return [];
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Lấy chi tiết sản phẩm từ MongoDB bằng Slug (titleUrl) hoặc ID
   * Endpoint server: GET /api/products/:name
   */
  getProductBySlugOrId(slugOrId: string): Observable<Product> {
    if (!slugOrId || !slugOrId.trim()) {
      return throwError(() => new Error('Slug hoặc ID sản phẩm không hợp lệ'));
    }

    const encoded = encodeURIComponent(slugOrId.trim());
    const url = `${this.baseUrl}/${encoded}`;
    const fallback = `${this.fallbackUrl}/${encoded}`;

    return this.http.get<Product>(url).pipe(
      catchError((primaryErr) => {
        return this.http.get<Product>(fallback).pipe(
          catchError(() => throwError(() => primaryErr))
        );
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Đã xảy ra lỗi khi kết nối tới máy chủ API.';
    if (error.status === 0) {
      message = 'Không thể kết nối đến máy chủ backend (Port 4000). Vui lòng đảm bảo server đang chạy.';
    } else if (error.status === 404) {
      message = 'Không tìm thấy sản phẩm trong cơ sở dữ liệu MongoDB.';
    } else if (error.error && typeof error.error.message === 'string') {
      message = error.error.message;
    }
    return throwError(() => ({ status: error.status, message }));
  }
}
