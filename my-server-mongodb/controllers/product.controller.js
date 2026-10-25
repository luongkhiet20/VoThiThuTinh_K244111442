const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');

/**
 * Chuẩn hóa document sản phẩm từ MongoDB để tương thích với Angular frontend
 * Đọc ưu tiên từ trường 'vi' nếu có, đồng thời giữ nguyên các trường gốc của document
 */
function formatProduct(doc) {
  if (!doc) return null;

  const viData = doc.vi || {};

  return {
    ...doc,
    _id: String(doc._id),
    IdF: typeof doc.IdF === 'number' ? doc.IdF : (Number(doc.IdF) || undefined),
    title: viData.title || doc.title || 'Sản phẩm thời trang',
    titleUrl: doc.titleUrl || '',
    salePrice: Number(viData.salePrice !== undefined ? viData.salePrice : doc.salePrice) || 0,
    regularPrice: Number(viData.regularPrice !== undefined ? viData.regularPrice : doc.regularPrice) || 0,
    onSale: Boolean(viData.onSale !== undefined ? viData.onSale : doc.onSale),
    quantity: Number(viData.quantity !== undefined ? viData.quantity : (doc.quantity !== undefined ? doc.quantity : doc.stock)) || 0,
    stock: Number(viData.stock !== undefined ? viData.stock : (doc.stock !== undefined ? doc.stock : doc.quantity)) || 0,
    description: viData.description || doc.description || '',
    descriptionFull: Array.isArray(viData.descriptionFull) && viData.descriptionFull.length > 0
      ? viData.descriptionFull
      : (Array.isArray(doc.descriptionFull) ? doc.descriptionFull : []),
    category: viData.categoryLevel1 || doc.category || '',
    categoryTitle: viData.categoryLevel1 || doc.categoryTitle || doc.category || '',
    mainImage: doc.mainImage && doc.mainImage.url ? doc.mainImage : (doc.images && doc.images[0] ? { url: doc.images[0] } : { url: 'assets/h1.png' }),
    images: Array.isArray(doc.images) && doc.images.length > 0
      ? doc.images.map((img) => (typeof img === 'string' ? img : (img && img.url ? img.url : 'assets/h1.png')))
      : (doc.mainImage && doc.mainImage.url ? [doc.mainImage.url] : ['assets/h1.png']),
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    variants: Array.isArray(doc.variants) ? doc.variants : [],
  };
}

/**
 * API: GET /api/health
 */
async function getHealth(req, res) {
  try {
    const db = getDb();
    const productCount = await db.collection('products').countDocuments({});
    res.json({
      status: 'ok',
      server: 'running',
      database: 'connected',
      readOnly: true,
      totalProductsInDb: productCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Lỗi kiểm tra kết nối cơ sở dữ liệu: ' + error.message,
    });
  }
}

/**
 * API: GET /api/products
 * Truy vấn danh sách sản phẩm (READ-ONLY) từ collection 'products'
 */
async function getProducts(req, res) {
  try {
    const db = getDb();
    const collection = db.collection('products');

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const category = req.query.category;
    const search = req.query.search ? String(req.query.search).trim() : '';
    const sort = req.query.sort || 'newest';
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;

    // Xây dựng bộ lọc READ-ONLY: Luôn loại bỏ các sản phẩm có trạng thái ẩn (visibility: false)
    const andConditions = [
      { visibility: { $ne: false } },
    ];

    // 1. Lọc theo danh mục
    if (category && category !== 'all') {
      const escapedCat = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      andConditions.push({
        $or: [
          { 'vi.categoryLevel1': { $regex: escapedCat, $options: 'i' } },
          { 'vi.categoryLevel2': { $regex: escapedCat, $options: 'i' } },
          { category: { $regex: escapedCat, $options: 'i' } },
          { titleUrl: { $regex: escapedCat, $options: 'i' } },
        ],
      });
    }

    // 2. Tìm kiếm theo từ khóa
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      andConditions.push({
        $or: [
          { 'vi.title': { $regex: escapedSearch, $options: 'i' } },
          { title: { $regex: escapedSearch, $options: 'i' } },
          { titleUrl: { $regex: escapedSearch, $options: 'i' } },
          { tags: { $regex: escapedSearch, $options: 'i' } },
        ],
      });
    }

    // 3. Lọc theo khoảng giá
    if (minPrice !== null || maxPrice !== null) {
      const priceFilter = {};
      if (minPrice !== null && !isNaN(minPrice)) priceFilter.$gte = minPrice;
      if (maxPrice !== null && !isNaN(maxPrice)) priceFilter.$lte = maxPrice;

      const priceFields = [
        { 'vi.salePrice': priceFilter },
        { 'vi.regularPrice': priceFilter },
        { salePrice: priceFilter },
        { regularPrice: priceFilter },
      ];

      andConditions.push({ $or: priceFields });
    }

    const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    // Xác định thứ tự sắp xếp
    let sortOption = { _id: -1 };
    if (sort === 'price-asc') {
      sortOption = { 'vi.salePrice': 1, salePrice: 1 };
    } else if (sort === 'price-desc') {
      sortOption = { 'vi.salePrice': -1, salePrice: -1 };
    } else if (sort === 'name-asc') {
      sortOption = { 'vi.title': 1, title: 1 };
    } else if (sort === 'newest') {
      sortOption = { _id: -1 };
    }

    // Thực thi truy vấn chỉ đọc
    const total = await collection.countDocuments(query);
    const rawDocs = await collection
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .toArray();

    const formattedProducts = rawDocs.map(formatProduct);

    res.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('[API ERROR] Lỗi getProducts:', error.message);
    res.status(500).json({
      message: 'Lỗi truy vấn danh sách sản phẩm từ MongoDB: ' + error.message,
    });
  }
}

/**
 * API: GET /api/products/categories
 * Lấy danh mục sản phẩm từ collection 'categories' (READ-ONLY)
 */
async function getCategories(req, res) {
  try {
    const db = getDb();
    const categoriesCol = db.collection('categories');

    const rawCategories = await categoriesCol.find({}).toArray();

    const formattedCategories = rawCategories.map((c) => ({
      _id: String(c._id),
      title: c.vi?.title || c.title || c.name || 'Danh mục',
      titleUrl: c.titleUrl || String(c._id),
      description: c.vi?.description || c.description || '',
      image: c.image || '',
    }));

    res.json(formattedCategories);
  } catch (error) {
    console.error('[API ERROR] Lỗi getCategories:', error.message);
    res.status(500).json({
      message: 'Lỗi truy vấn danh mục từ MongoDB: ' + error.message,
    });
  }
}

/**
 * API: GET /api/products/:slug
 * Lấy chi tiết sản phẩm theo Slug (titleUrl) hoặc ID từ MongoDB (READ-ONLY)
 */
async function getProductBySlug(req, res) {
  try {
    const slug = req.params.slug ? String(req.params.slug).trim() : '';

    if (!slug) {
      return res.status(400).json({ message: 'Slug sản phẩm không được để trống' });
    }

    const db = getDb();
    const collection = db.collection('products');

    // 1. Thử tìm kiếm chính xác theo trường slug 'titleUrl'
    let doc = await collection.findOne({ titleUrl: slug });

    // 2. Nếu không tìm thấy và slug là ObjectId hợp lệ, thử tìm theo _id
    if (!doc && ObjectId.isValid(slug) && String(new ObjectId(slug)) === slug) {
      doc = await collection.findOne({ _id: new ObjectId(slug) });
    }

    // 3. Nếu vẫn không thấy, thử tìm theo id chuỗi
    if (!doc) {
      doc = await collection.findOne({ id: slug });
    }

    // 4. Nếu không thấy, thử tìm kiếm gần đúng theo titleUrl
    if (!doc) {
      const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      doc = await collection.findOne({ titleUrl: { $regex: escaped, $options: 'i' } });
    }

    if (!doc || doc.visibility === false || doc.vi?.visibility === false) {
      return res.status(404).json({
        message: `Sản phẩm này hiện đang tạm ẩn hoặc không tồn tại trong cơ sở dữ liệu MongoDB.`,
      });
    }

    const formatted = formatProduct(doc);
    res.json(formatted);
  } catch (error) {
    console.error('[API ERROR] Lỗi getProductBySlug:', error.message);
    res.status(500).json({
      message: 'Lỗi truy vấn chi tiết sản phẩm từ MongoDB: ' + error.message,
    });
  }
}

module.exports = {
  getHealth,
  getProducts,
  getCategories,
  getProductBySlug,
};
