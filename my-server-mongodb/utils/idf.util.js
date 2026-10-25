/**
 * Tiện ích cấp phát mã IdF nguyên tử (Atomic Counter)
 * Đảm bảo IdF tự tăng, duy nhất và an toàn khi có nhiều yêu cầu đồng thời.
 */

/**
 * Cấp phát IdF tiếp theo cho Fashion
 * @param {import('mongodb').Db} db - Đối tượng kết nối MongoDB database
 * @returns {Promise<number>} - Mã IdF số nguyên dương duy nhất
 */
async function getNextIdF(db) {
  const counters = db.collection('counters');
  const products = db.collection('products');

  // 1. Tăng sequence nguyên tử trong collection counters
  const result = await counters.findOneAndUpdate(
    { _id: 'fashion_idf' },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date() } },
    { upsert: true, returnDocument: 'after' }
  );

  let nextId = result.seq;

  // 2. Double-check đối chiếu với collection products để phòng ngừa lệch sequence
  const conflict = await products.findOne({ IdF: nextId });
  if (conflict) {
    const maxDoc = await products.find({ IdF: { $exists: true } }).sort({ IdF: -1 }).limit(1).toArray();
    const currentMax = maxDoc.length > 0 && typeof maxDoc[0].IdF === 'number' ? maxDoc[0].IdF : nextId;
    const synced = await counters.findOneAndUpdate(
      { _id: 'fashion_idf' },
      { $set: { seq: currentMax + 1, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return synced.seq;
  }

  return nextId;
}

module.exports = {
  getNextIdF,
};
