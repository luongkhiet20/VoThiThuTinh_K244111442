export interface ProductVariant {
  _id?: string;
  classification?: string;
  color?: string;
  size?: string;
  sku?: string;
  salePrice?: number;
  regularPrice?: number;
  stock?: number;
  image?: string;
}

export interface Product {
  _id?: string;
  id?: string | number;
  IdF?: number; // Mã số nguyên duy nhất của Fashion
  title: string;
  titleUrl?: string; // Slug thực tế từ MongoDB
  description?: string;
  descriptionFull?: string[];
  salePrice: number;
  regularPrice: number;
  onSale?: boolean;
  quantity?: number;
  stock?: number | string;
  sku?: string;
  visibility?: boolean;
  vi?: {
    title?: string;
    description?: string;
    descriptionFull?: string[];
    visibility?: boolean;
    classifications?: string[];
    colors?: { name: string; hex: string }[];
    sizes?: string[];
    hasClassification?: boolean;
    hasColors?: boolean;
    hasSizes?: boolean;
  };
  mainImage?: { url: string; name?: string };
  images?: string[];
  category?: string;
  categoryTitle?: string;
  tags?: string[];
  variants?: ProductVariant[];
  rating?: number;
  ratingCount?: number;
  classifications?: string[];
  colors?: { name: string; hex: string }[];
  sizes?: string[];
  hasClassification?: boolean;
  hasColors?: boolean;
  hasSizes?: boolean;
  shippingBasicCost?: number;
  shippingExtendedCost?: number;
  shippingCost?: number;
  shipping?: string;
}

export interface Category {
  _id?: string;
  title: string;
  titleUrl?: string;
  description?: string;
  image?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: string;
}

export interface Cart {
  items: CartItem[];
  totalQty?: number;
  totalAmount?: number;
}

export const sortOptions = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá tăng dần' },
  { value: 'price-desc', label: 'Giá giảm dần' },
  { value: 'name-asc', label: 'Tên A - Z' },
];
