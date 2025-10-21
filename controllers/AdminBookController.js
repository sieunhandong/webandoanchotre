const Product = require("../models/Product");
const Category = require("../models/Category");
// Lấy danh sách tất cả sách
exports.getAllProducts = async (req, res) => {
  try {
    const books = await Product.find().populate("category", "name");
    res.status(200).json(books);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi lấy danh sách sách", error: error.message });
  }
};

// Lấy thông tin một sách theo ID
exports.getProductById = async (req, res) => {
  try {
    const book = await Product.findById(req.params.id).populate("category");

    if (!book) return res.status(404).json({ message: "Không tìm thấy sách" });
    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy sách", error: error.message });
  }
};

// 🥦 Tạo sản phẩm mới
exports.createProduct = async (req, res) => {
  try {
    const { name, category, nutrition, description } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!name) {
      return res.status(400).json({ message: "Vui lòng nhập tên sản phẩm." });
    }

    // Kiểm tra danh mục tồn tại
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Danh mục không tồn tại!" });
    }

    // Xử lý upload ảnh (từ multer)
    const imageUrls = req.files?.map((file) => file.path) || [];

    // Tạo mới sản phẩm
    const newProduct = new Product({
      name,
      category,
      nutrition,
      description,
      image: imageUrls.length > 0 ? imageUrls[0] : null, // nếu có nhiều ảnh, bạn có thể lưu mảng
    });

    await newProduct.save();
    res.status(201).json({ message: "Thêm sản phẩm thành công!", product: newProduct });
  } catch (error) {
    console.error("❌ Lỗi khi tạo sản phẩm:", error);
    res.status(500).json({ message: "Lỗi khi tạo sản phẩm", error: error.message });
  }
};



// 🧩 Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy ảnh upload mới (nếu có)
    const imageUrls = req.files?.map((file) => file.path) || [];

    // Chuẩn bị dữ liệu cập nhật
    const updateData = {
      ...req.body,
    };

    // Nếu có ảnh mới thì cập nhật ảnh
    if (imageUrls.length > 0) {
      updateData.image = imageUrls[0];
    } else {
      delete updateData.image;
    }

    // Cập nhật sản phẩm
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }

    res.status(200).json({ message: "Cập nhật sản phẩm thành công!", product: updatedProduct });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật sản phẩm:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật sản phẩm", error: error.message });
  }
};



// 🗑️ Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }
    res.status(200).json({ message: "Xóa sản phẩm thành công!" });
  } catch (error) {
    console.error("❌ Lỗi khi xóa sản phẩm:", error);
    res.status(500).json({ message: "Lỗi khi xóa sản phẩm", error: error.message });
  }
};

// Quản lý danh mục
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi lấy danh mục", error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ message: "Tên danh mục là bắt buộc." });
    }

    const newCategory = new Category(req.body);
    await newCategory.save();
    res.status(201).json({ message: "Danh mục đã được tạo", newCategory });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi tạo danh mục", error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    if (!req.body.name) {
      return res
        .status(400)
        .json({ message: "Tên danh mục không được để trống." });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedCategory)
      return res.status(404).json({ message: "Không tìm thấy danh mục" });

    res
      .status(200)
      .json({ message: "Danh mục đã được cập nhật", updatedCategory });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi cập nhật danh mục", error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory)
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    res.status(200).json({ message: "Danh mục đã được xóa" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi xóa danh mục", error: error.message });
  }
};
