const Blog = require("../models/Blog");
const BlogCategory = require("../models/BlogCategory");

// Tạo blog
const createBlog = async (req, res) => {
  try {
    const { title, content, blogCategoryId } = req.body;
    if (!title || !content || !blogCategoryId)
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết." });

    const imageUrls = req.files?.map(file => file.path) || [];

    const newBlog = new Blog({
      title,
      content,
      blogCategoryId,
      adminId: req.user._id,
      images: imageUrls,
    });

    await newBlog.save();
    res.status(201).json({ message: "Tạo blog thành công", blog: newBlog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy tất cả blog (có filter category + phân trang)
const getAllBlogsByAdmin = async (req, res) => {
  try {
    let { page = 1, limit = 5, blogCategoryId } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    if (blogCategoryId) filter.blogCategoryId = blogCategoryId;

    const total = await Blog.countDocuments(filter);

    const blogs = await Blog.find(filter)
      .populate("adminId", "name email")
      .populate("blogCategoryId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ blogs, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xem chi tiết
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate("adminId", "name email")
      .populate("blogCategoryId", "name");
    if (!blog) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật blog
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, blogCategoryId } = req.body;

    const updated = await Blog.findByIdAndUpdate(
      id,
      { title, content, blogCategoryId },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    res.status(200).json({ message: "Cập nhật thành công", blog: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa blog
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Blog.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    res.status(200).json({ message: "Xoá blog thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy 3 blog mới nhất cho Home
const getHomeBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("blogCategoryId", "name")
      .populate("adminId", "name email");

    res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getBlogsByMainCategories = async (req, res) => {
  try {
    // 3 category chính theo tên
    const mainCategoryNames = [
      "Ăn dặm truyền thống",
      "Ăn dặm BLW",
      "Ăn dặm kiểu Nhật"
    ];

    // Lấy query params từ client
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    // Lấy thông tin category từ DB
    const mainCategories = await BlogCategory.find({
      name: { $in: mainCategoryNames }
    });

    const result = [];

    for (let category of mainCategories) {
      // Đếm tổng số blog trong category
      const totalBlogs = await Blog.countDocuments({ blogCategoryId: category._id });

      // Lấy blog có phân trang
      const blogs = await Blog.find({ blogCategoryId: category._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("adminId", "name email")
        .populate("blogCategoryId", "name");

      result.push({
        category: { _id: category._id, name: category.name },
        blogs,
        pagination: {
          page,
          limit,
          totalBlogs,
          totalPages: Math.ceil(totalBlogs / limit),
        },
      });
    }

    // Sắp xếp kết quả theo thứ tự mainCategoryNames
    result.sort(
      (a, b) =>
        mainCategoryNames.indexOf(a.category.name) -
        mainCategoryNames.indexOf(b.category.name)
    );

    res.status(200).json({ categories: result });
  } catch (error) {
    console.error("❌ Lỗi getBlogsByMainCategories:", error);
    res.status(500).json({ message: error.message });
  }
};

// Lấy tất cả blog (cho trang Blog chính) với phân trang + filter category
const getAllBlogs = async (req, res) => {
  try {
    let { page = 1, limit = 9, blogCategoryId, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};

    if (blogCategoryId) filter.blogCategoryId = blogCategoryId;
    if (search) filter.title = { $regex: search, $options: "i" }; // tìm kiếm theo title

    const total = await Blog.countDocuments(filter);

    const blogs = await Blog.find(filter)
      .populate("adminId", "name email")
      .populate("blogCategoryId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      blogs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Lấy blog theo chủ đề (category)
const getBlogsByCategory = async (req, res) => {
  try {
    const { blogCategoryId } = req.query; // có thể filter bằng query
    if (!blogCategoryId) return res.status(400).json({ message: "Thiếu blogCategoryId" });

    const blogs = await Blog.find({ blogCategoryId })
      .populate("adminId", "name email")
      .populate("blogCategoryId", "name")

    res.status(200).json({
      blogs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const blogCategory = await BlogCategory.find();
    res.status(200).json(blogCategory);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
}

module.exports = {
  createBlog,
  getAllBlogsByAdmin,
  getBlogById,
  updateBlog,
  deleteBlog,
  getHomeBlogs,
  getBlogsByMainCategories,
  getAllBlogs,
  getBlogsByCategory,
  getAllCategories
};
