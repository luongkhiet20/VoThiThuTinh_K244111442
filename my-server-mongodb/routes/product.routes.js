const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

// 1. Kiểm tra tình trạng server & MongoDB (Read-Only Health Check)
router.get('/health', productController.getHealth);

// 2. Lấy danh mục sản phẩm từ MongoDB (ĐẶT TRƯỚC route /:slug để tránh nuốt param)
router.get('/products/categories', productController.getCategories);

// 3. Lấy danh sách sản phẩm có phân trang, lọc, tìm kiếm
router.get('/products', productController.getProducts);

// 4. Lấy chi tiết sản phẩm theo Slug (titleUrl) hoặc ID
router.get('/products/:slug', productController.getProductBySlug);

// Chặn toàn bộ các thao tác ghi dữ liệu nếu có request gửi tới
const readOnlyBlocker = (req, res) => {
  res.status(405).json({
    message: 'Chế độ an toàn: Server được cấu hình TUYỆT ĐỐI READ-ONLY. Mọi thao tác ghi (POST/PUT/DELETE) bị từ chối.',
  });
};

router.post('*', readOnlyBlocker);
router.put('*', readOnlyBlocker);
router.patch('*', readOnlyBlocker);
router.delete('*', readOnlyBlocker);

module.exports = router;
