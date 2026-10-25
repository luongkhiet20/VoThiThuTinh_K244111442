const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

// Đọc từ my-server-mongodb/.env hoặc my-app/.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!uri) {
  console.error('[DATABASE CRITICAL] Không tìm thấy MONGO_URI hoặc MONGODB_URI trong file .env');
  process.exit(1);
}

let client = null;
let db = null;

async function connectDatabase() {
  if (db) return db;

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();
    // Ẩn thông tin nhạy cảm trong log
    const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`[DATABASE] Đã kết nối thành công tới MongoDB: ${masked}`);

    // Database chính thức theo connection string
    db = client.db('cheri');
    return db;
  } catch (error) {
    console.error('[DATABASE ERROR] Không thể kết nối tới MongoDB:', error.message);
    throw error;
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database chưa được kết nối. Hãy gọi connectDatabase() trước.');
  }
  return db;
}

async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[DATABASE] Đã đóng kết nối MongoDB an toàn.');
  }
}

module.exports = {
  connectDatabase,
  getDb,
  closeDatabase,
};
