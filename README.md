# VoThiThuTinh_K244111442 - MyApp

Dự án ứng dụng Angular kết hợp Backend Node.js Express kết nối MongoDB Atlas Cloud.

---

## 1. Khởi động Backend Server (MongoDB API)

Máy chủ backend nằm trong thư mục `my-server-mongodb`, chạy trên cổng `4000`:

```powershell
cd "d:\Tài liệu\WEBthuchanh\VoThiThuTinh_K244111442\my-app\my-server-mongodb"
npm start
```

### Các Endpoint Backend cung cấp:
- Kiểm tra trạng thái: `GET http://localhost:4000/api/health`
- Danh sách sản phẩm: `GET http://localhost:4000/api/products`
- Danh mục sản phẩm: `GET http://localhost:4000/api/products/categories`
- Chi tiết theo Slug: `GET http://localhost:4000/api/products/:slug`

---

## 2. Khởi động Frontend Angular

Ứng dụng Angular chạy trên cổng mặc định `4200`:

```powershell
cd "d:\Tài liệu\WEBthuchanh\VoThiThuTinh_K244111442\my-app"
npm start
```

### Các đường dẫn chức năng:
- Danh sách sản phẩm: `http://localhost:4200/product-slug-idf/all`
- Chi tiết sản phẩm theo Slug: `http://localhost:4200/product-slug-idf/:slug`

---

## 3. Lệnh Build và Kiểm thử

### Build Frontend:
```powershell
npm run build
```

### Chạy kiểm thử Frontend:
```powershell
ng test
```

---

## 4. Quản lý và Kiểm thử IdF cho Fashion

### Kiểm tra thử migration (Dry-run, không ghi DB):
```powershell
cd "d:\Tài liệu\WEBthuchanh\VoThiThuTinh_K244111442\my-app\my-server-mongodb"
npm run migrate:idf:dry
```

### Chạy migration chính thức cấp IdF và tạo Unique Index:
```powershell
cd "d:\Tài liệu\WEBthuchanh\VoThiThuTinh_K244111442\my-app\my-server-mongodb"
npm run migrate:idf
```

### Chạy kiểm thử tự động toàn diện IdF và Backend:
```powershell
cd "d:\Tài liệu\WEBthuchanh\VoThiThuTinh_K244111442\my-app\my-server-mongodb"
npm run test:idf
```

