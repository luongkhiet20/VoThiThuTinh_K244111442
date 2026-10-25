const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG CHO IdF VÀ BACKEND ===');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cheri');
    const collection = db.collection('products');

    // 1. Kiểm tra toàn bộ sản phẩm đã có IdF
    const totalCount = await collection.countDocuments({});
    const withIdFCount = await collection.countDocuments({
      IdF: { $exists: true, $type: 'number', $gt: 0 },
    });
    console.log(`[TEST 1] Tổng số sản phẩm: ${totalCount} | Sản phẩm có IdF hợp lệ: ${withIdFCount}`);
    if (totalCount !== withIdFCount) {
      throw new Error(`TEST 1 THẤT BẠI: Vẫn còn ${totalCount - withIdFCount} sản phẩm thiếu IdF!`);
    }
    console.log(' -> ĐẠT: 100% sản phẩm đã có IdF số nguyên dương.');

    // 2. Kiểm tra không có IdF trùng lặp
    const dupCheck = await collection
      .aggregate([
        { $group: { _id: '$IdF', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();
    console.log(`[TEST 2] Số IdF bị trùng: ${dupCheck.length}`);
    if (dupCheck.length > 0) {
      throw new Error(`TEST 2 THẤT BẠI: Phát hiện IdF trùng lặp: ${JSON.stringify(dupCheck)}`);
    }
    console.log(' -> ĐẠT: Không có bất kỳ IdF nào bị trùng lặp.');

    // 3. Kiểm tra Unique Index trên trường IdF
    const indexes = await collection.indexes();
    const hasIdFIndex = indexes.some(
      (idx) => idx.key && idx.key.IdF === 1 && idx.unique === true
    );
    console.log(`[TEST 3] Trạng thái Unique Index IdF_1: ${hasIdFIndex ? 'TỒN TẠI VÀ BẢO ĐẢM' : 'THIẾU'}`);
    if (!hasIdFIndex) {
      throw new Error('TEST 3 THẤT BẠI: Thiếu unique index trên trường IdF!');
    }
    console.log(' -> ĐẠT: Unique index bảo vệ tầng DB hoạt động bình thường.');

    // 4. Kiểm tra API GET /api/products
    console.log('[TEST 4] Gọi HTTP API GET /api/products...');
    const listRes = await fetch('http://localhost:4000/api/products?limit=5');
    if (!listRes.ok) throw new Error(`HTTP ${listRes.status} khi gọi /api/products`);
    const listData = await listRes.json();
    console.log(` -> Nhận được ${listData.products.length} sản phẩm từ API.`);
    for (const p of listData.products) {
      if (typeof p.IdF !== 'number' || p.IdF <= 0) {
        throw new Error(`Sản phẩm "${p.title}" không có IdF hợp lệ từ API: ${p.IdF}`);
      }
    }
    console.log(' -> ĐẠT: Toàn bộ sản phẩm trong API response có trường IdF hợp lệ.');

    // 5. Kiểm tra API GET /api/products/:slug
    const sampleSlug = listData.products[0].titleUrl;
    const sampleIdF = listData.products[0].IdF;
    console.log(`[TEST 5] Gọi HTTP API GET /api/products/${sampleSlug}...`);
    const detailRes = await fetch(`http://localhost:4000/api/products/${sampleSlug}`);
    if (!detailRes.ok) throw new Error(`HTTP ${detailRes.status} khi gọi /api/products/${sampleSlug}`);
    const detailData = await detailRes.json();
    if (detailData.IdF !== sampleIdF) {
      throw new Error(`IdF không khớp: Kỳ vọng ${sampleIdF}, nhận được ${detailData.IdF}`);
    }
    console.log(` -> ĐẠT: Sản phẩm "${detailData.title}" trả về đúng IdF: #${detailData.IdF}`);

    // 6. Kiểm tra sản phẩm có visibility: false bị ẩn
    console.log('[TEST 6] Kiểm tra sản phẩm ẩn không xuất hiện trong danh sách...');
    const hiddenInList = listData.products.some((p) => p.visibility === false);
    if (hiddenInList) {
      throw new Error('TEST 6 THẤT BẠI: Sản phẩm ẩn xuất hiện trong danh sách API!');
    }
    console.log(' -> ĐẠT: Sản phẩm có trạng thái ẩn được lọc bỏ an toàn.');

    console.log('\n=== TẤT CẢ BÀI KIỂM THỬ ĐÃ VƯỢT QUA 100% ===');
  } finally {
    await client.close();
  }
}

runTests().catch((err) => {
  console.error('\n[LỖI KIỂM THỬ]:', err.message);
  process.exit(1);
});
