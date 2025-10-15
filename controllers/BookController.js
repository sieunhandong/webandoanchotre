const Book = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");

const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find({ isActivated: true });
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Không tìm thấy sách" });
    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy sách", error: error.message });
  }
};

const getBookByCategory = async (req, res) => {
  try {
    const books = await Book.find({ category: req.params.id });
    if (books.length === 0)
      return res.status(404).json({ message: "Không tìm thấy sách" });
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};




module.exports = {
  getAllBooks,
  getBookById,
  getBookByCategory,
};
