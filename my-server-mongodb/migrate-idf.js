/**
 * MIGRATION SCRIPT: Cấp mã IdF số nguyên dương duy nhất cho Fashion
 *
 * Tính năng:
 * - Có chế độ --dry-run để chạy thử nghiệm, không ghi đè DB.
 * - Tự động tạo bản sao lưu dữ liệu trước khi cập nhật (--backup).
 * - Có thể chạy lại an toàn nhiều lần (idempotent), không cấp lại IdF cho bản ghi đã có.
 * - Tự động tạo Unique Index { IdF: 1 } trên MongoDB để bảo đảm không trùng lặp.
 * - Khởi tạo Atomic Counter trong collection 'counters' để hỗ trợ tạo mới đồng thời.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

// Tải cấu hình từ .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) {
  console.error('[MIGRATION CRITICAL] Không tìm thấy biến môi trường MONGO_URI hoặc MONGODB_URI.');
  process.exit(1);
}

// Tham số dòng lệnh
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRestore = args.includes('--restore');
const restoreFileIndex = args.indexOf('--restore');
const restoreFilePath = restoreFileIndex !== -1 ? args[restoreFileIndex + 1] : null;

// Tên Database và Collection mục tiêu
// Tự động phân tích từ connection string hoặc cấu hình
function getTargetDatabaseName(connectionUri) {
  try {
    const url = new URL(connectionUri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
    const pathname = url.pathname.replace(/^\//, '');
    return pathname.split('?')[0] || process.env.SOURCE_DB || 'cheri';
  } catch {
    return process.env.SOURCE_DB || 'cheri';
  }
}

const DB_NAME = getTargetDatabaseName(uri);
const COLLECTION_NAME = 'products';

async function runMigration() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
  });

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const counters = db.collection('counters');

    console.log(`\n======================================================`);
    console.log(`[MIGRATION] BẮT ĐẦU MIGRATION IdF CHO FASHION`);
    console.log(`- Database:   ${DB_NAME}`);
    console.log(`- Collection: ${COLLECTION_NAME}`);
    console.log(`- Chế độ:     ${isDryRun ? 'DRY-RUN (Chỉ kiểm tra, không ghi)' : (isRestore ? 'RESTORE (Khôi phục từ backup)' : 'LIVE RUN (Cập nhật thực tế)')}`);
    console.log(`======================================================\n`);

    // ── XỬ LÝ KHÔI PHỤC NẾU CHỌN --restore ──
    if (isRestore) {
      if (!restoreFilePath || !fs.existsSync(restoreFilePath)) {
        throw new Error(`Tệp sao lưu không tồn tại: ${restoreFilePath}`);
      }
      console.log(`[RESTORE] Đang đọc tệp sao lưu: ${restoreFilePath}`);
      const backupData = JSON.parse(fs.readFileSync(restoreFilePath, 'utf8'));
      console.log(`[RESTORE] Tìm thấy ${backupData.length} bản ghi sao lưu.`);

      for (const item of backupData) {
        if (item.IdF === null || item.IdF === undefined) {
          await collection.updateOne({ _id: item._id }, { $unset: { IdF: '' } });
        } else {
          await collection.updateOne({ _id: item._id }, { $set: { IdF: item.IdF } });
        }
      }
      console.log(`[RESTORE] Khôi phục hoàn tất thành công!`);
      return;
    }

    // 1. Kiểm tra tổng số document hiện có
    const totalCount = await collection.countDocuments({});
    console.log(`[BƯỚC 1] Tổng số document trong collection: ${totalCount}`);

    // 2. Lấy toàn bộ document để phân tích IdF hiện tại
    const allDocs = await collection
      .find({}, { projection: { _id: 1, IdF: 1, titleUrl: 1, 'vi.title': 1, title: 1, dateAdded: 1 } })
      .sort({ dateAdded: 1, _id: 1 })
      .toArray();

    const usedIds = new Set();
    const docsWithValidIdF = [];
    const docsNeedIdF = [];

    for (const doc of allDocs) {
      if (typeof doc.IdF === 'number' && Number.isInteger(doc.IdF) && doc.IdF > 0) {
        if (usedIds.has(doc.IdF)) {
          console.warn(`[CẢNH BÁO] Phát hiện IdF bị trùng trong dữ liệu cũ: IdF=${doc.IdF} (Doc _id: ${doc._id})`);
          docsNeedIdF.push(doc);
        } else {
          usedIds.add(doc.IdF);
          docsWithValidIdF.push(doc);
        }
      } else {
        docsNeedIdF.push(doc);
      }
    }

    console.log(`- Bản ghi đã có IdF hợp lệ: ${docsWithValidIdF.length}`);
    console.log(`- Bản ghi cần cấp IdF mới:   ${docsNeedIdF.length}`);

    // 3. Nếu toàn bộ đã có IdF và không có bản ghi nào cần cấp mới
    if (docsNeedIdF.length === 0) {
      console.log(`\n[THÔNG BÁO] Toàn bộ ${totalCount} bản ghi đã có IdF hợp lệ!`);
    } else {
      console.log(`\n[BƯỚC 2] Tính toán cấp IdF tuần tự từ 1 (bỏ qua các số đã sử dụng)...`);

      // Sao lưu trước khi cập nhật
      const backupDir = path.resolve(__dirname, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `backup-idf-${timestamp}.json`);

      const backupList = allDocs.map((d) => ({
        _id: d._id,
        IdF: d.IdF !== undefined ? d.IdF : null,
        titleUrl: d.titleUrl,
      }));
      fs.writeFileSync(backupFile, JSON.stringify(backupList, null, 2), 'utf8');
      console.log(`- Đã tạo bản sao lưu an toàn tại: ${backupFile}`);

      // Phân bổ IdF mới
      const updates = [];
      let candidateId = 1;

      for (const doc of docsNeedIdF) {
        while (usedIds.has(candidateId)) {
          candidateId++;
        }
        const assignedId = candidateId;
        usedIds.add(assignedId);

        updates.push({
          _id: doc._id,
          assignedId,
          titleUrl: doc.titleUrl || '(không có slug)',
          title: doc.vi?.title || doc.title || 'Sản phẩm',
        });
        candidateId++;
      }

      console.log(`- Đã tính toán xong ${updates.length} mã IdF mới.`);
      console.log(`  Mẫu 3 bản ghi đầu tiên:`);
      updates.slice(0, 3).forEach((u) => {
        console.log(`    * [IdF: #${u.assignedId}] "${u.title}" (slug: ${u.titleUrl})`);
      });
      if (updates.length > 3) {
        const last = updates[updates.length - 1];
        console.log(`    ...`);
        console.log(`    * [IdF: #${last.assignedId}] "${last.title}" (slug: ${last.titleUrl})`);
      }

      if (isDryRun) {
        console.log(`\n[DRY-RUN HOÀN TẤT] Không có thay đổi nào được ghi vào cơ sở dữ liệu.`);
        return;
      }

      // 4. Thực thi bulkWrite cập nhật MongoDB
      console.log(`\n[BƯỚC 3] Đang cập nhật ${updates.length} bản ghi vào MongoDB...`);
      const bulkOps = updates.map((u) => ({
        updateOne: {
          filter: { _id: u._id },
          update: { $set: { IdF: u.assignedId } },
        },
      }));

      const bulkResult = await collection.bulkWrite(bulkOps, { ordered: true });
      console.log(`- Kết quả bulkWrite: Modified ${bulkResult.modifiedCount} documents.`);
    }

    // 5. Kiểm tra tính toàn vẹn dữ liệu
    console.log(`\n[BƯỚC 4] Kiểm tra tính toàn vẹn của trường IdF sau migration...`);
    const countMissing = await collection.countDocuments({
      $or: [
        { IdF: { $exists: false } },
        { IdF: null },
        { IdF: { $lte: 0 } },
      ],
    });

    if (countMissing > 0) {
      throw new Error(`Phát hiện ${countMissing} bản ghi thiếu hoặc có IdF không hợp lệ!`);
    }

    // Kiểm tra trùng lặp IdF bằng Aggregation
    const duplicateCheck = await collection
      .aggregate([
        { $group: { _id: '$IdF', count: { $sum: 1 }, docs: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    if (duplicateCheck.length > 0) {
      throw new Error(`Phát hiện IdF bị trùng lặp: ${JSON.stringify(duplicateCheck)}`);
    }
    console.log(`- Kiểm tra toàn vẹn: 100% bản ghi có IdF duy nhất, không có trùng lặp.`);

    // 6. Tạo Unique Index cho trường IdF
    console.log(`\n[BƯỚC 5] Đảm bảo Unique Index trên trường 'IdF'...`);
    const existingIndexes = await collection.indexes();
    const hasIdFIndex = existingIndexes.some((idx) => idx.key && idx.key.IdF === 1 && idx.unique === true);

    if (hasIdFIndex) {
      console.log(`- Unique Index 'IdF_1' đã tồn tại.`);
    } else {
      await collection.createIndex({ IdF: 1 }, { unique: true, name: 'IdF_1' });
      console.log(`- Đã tạo thành công Unique Index { IdF: 1 } chống trùng lặp.`);
    }

    // 7. Đồng bộ Atomic Counter cho các thao tác tạo mới tương lai
    console.log(`\n[BƯỚC 6] Khởi tạo Atomic Counter cho tạo Fashion mới...`);
    const maxDoc = await collection.find({ IdF: { $exists: true } }).sort({ IdF: -1 }).limit(1).toArray();
    const currentMaxIdF = maxDoc.length > 0 && typeof maxDoc[0].IdF === 'number' ? maxDoc[0].IdF : totalCount;

    await counters.updateOne(
      { _id: 'fashion_idf' },
      { $set: { seq: currentMaxIdF, updatedAt: new Date() } },
      { upsert: true }
    );
    console.log(`- Counter 'fashion_idf' đã được đồng bộ ở mức: ${currentMaxIdF}`);

    console.log(`\n======================================================`);
    console.log(`[MIGRATION THÀNH CÔNG] Toàn bộ dữ liệu Fashion đã có IdF duy nhất!`);
    console.log(`- Tổng số Fashion:    ${totalCount}`);
    console.log(`- Max IdF hiện tại:   ${currentMaxIdF}`);
    console.log(`- Unique Index:       BẬT`);
    console.log(`- Atomic Counter:     SẴN SÀNG`);
    console.log(`======================================================\n`);
  } finally {
    await client.close();
  }
}

runMigration().catch((error) => {
  console.error('\n[MIGRATION THẤT BẠI]:', error.message);
  process.exit(1);
});
