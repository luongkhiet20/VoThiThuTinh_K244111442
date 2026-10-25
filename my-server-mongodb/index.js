const express = require('express');
const cors = require('cors');
const { connectDatabase, closeDatabase } = require('./config/database');
const productRoutes = require('./routes/product.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Cấu hình CORS cho phép Angular app gọi API
const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (ví dụ curl, Postman) hoặc nằm trong danh sách được duyệt
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Cho phép các client cục bộ
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Trang chào mừng
app.get('/', (req, res) => {
  res.json({
    name: 'MongoDB Product API Server (READ-ONLY)',
    version: '1.0.0',
    documentation: {
      health: 'GET /api/health',
      products: 'GET /api/products',
      categories: 'GET /api/products/categories',
      productDetailBySlug: 'GET /api/products/:slug',
    },
  });
});

// Gắn các routes API
app.use('/api', productRoutes);

// Xử lý route không tồn tại (404)
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Đường dẫn '${req.originalUrl}' không tồn tại trên server.`,
  });
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]:', err);
  res.status(500).json({
    status: 'error',
    message: 'Lỗi máy chủ nội bộ: ' + (err.message || 'Unknown error'),
  });
});

// Khởi động server sau khi kết nối MongoDB
let server = null;

async function startServer() {
  try {
    console.log('[SERVER] Đang kết nối tới cơ sở dữ liệu MongoDB...');
    await connectDatabase();

    server = app.listen(PORT, () => {
      console.log('========================================================');
      console.log(`[SERVER] Backend MongoDB API đang chạy tại: http://localhost:${PORT}`);
      console.log(`[SERVER] API danh sách:  GET http://localhost:${PORT}/api/products`);
      console.log(`[SERVER] API danh mục:   GET http://localhost:${PORT}/api/products/categories`);
      console.log(`[SERVER] API theo slug:  GET http://localhost:${PORT}/api/products/:slug`);
      console.log(`[SERVER] API kiểm tra:   GET http://localhost:${PORT}/api/health`);
      console.log('[SERVER] Chế độ hoạt động: TUYỆT ĐỐI READ-ONLY (Không ghi MongoDB)');
      console.log('========================================================');
    });
  } catch (error) {
    console.error('[SERVER CRITICAL] Khởi động server thất bại:', error.message);
    process.exit(1);
  }
}

// Xử lý tín hiệu tắt server an toàn
const gracefulShutdown = async (signal) => {
  console.log(`\n[SERVER] Nhận tín hiệu ${signal}. Đang tắt server...`);
  if (server) {
    server.close(async () => {
      console.log('[SERVER] HTTP server đã dừng.');
      await closeDatabase();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
