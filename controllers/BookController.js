const Book = require("../models/Book");
const Category = require("../models/Category");
const Order = require("../models/Order");
const { applyDiscountCampaignsToBooks } = require("../utils/applyDiscount");

const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find({ isActivated: true });
    const booksWithDiscount = await applyDiscountCampaignsToBooks(books);
    res.status(200).json(booksWithDiscount);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Không tìm thấy sách" });
    const booksWithDiscount = await applyDiscountCampaignsToBooks([book]);
    res.status(200).json(booksWithDiscount[0]);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy sách", error: error.message });
  }
};

const getBookByCategory = async (req, res) => {
  try {
    const books = await Book.find({ categories: req.params.id });
    if (books.length === 0)
      return res.status(404).json({ message: "Không tìm thấy sách" });
    const booksWithDiscount = await applyDiscountCampaignsToBooks(books);
    res.status(200).json(booksWithDiscount);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

const getDiscountedBooks = async (req, res) => {
  try {
    const books = await Book.find({
      isActivated: true,
      $expr: { $lt: ["$price", "$originalPrice"] },
    });
    if (books.length === 0)
      return res
        .status(404)
        .json({ message: "Không tìm thấy sách đang giảm giá" });
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

const getNewBooks = async (req, res) => {
  try {
    const books = await Book.find({ isActivated: true, isNewRelease: true });
    if (books.length === 0)
      return res.status(404).json({ message: "Không tìm thấy sách mới" });
    const booksWithDiscount = await applyDiscountCampaignsToBooks(books);
    res.status(200).json(booksWithDiscount);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};
const getBookByAuthor = async (req, res) => {
  try {
    const { author } = req.params;
    const books = await Book.find({ author: author });
    if (books.length === 0)
      return res
        .status(404)
        .json({ message: "Không tìm thấy sách của tác giả này" });
    const booksWithDiscount = await applyDiscountCampaignsToBooks(books);
    res.status(200).json(booksWithDiscount);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

const getBookByPublisher = async (req, res) => {
  try {
    const { publisher } = req.params;
    const books = await Book.find({ publisher });
    if (books.length === 0)
      return res
        .status(404)
        .json({ message: "Không tìm thấy sách của nhà xuất bản này" });
    const booksWithDiscount = await applyDiscountCampaignsToBooks(books);
    res.status(200).json(booksWithDiscount);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};
const getBestSellers = async (req, res) => {
  try {
    const topSellingBooks = await Order.aggregate([
      { $match: { paymentStatus: "Completed", orderStatus: { $ne: "Cancelled" } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.book", totalQuantity: { $sum: "$items.quantity" } } },
      { $sort: { totalQuantity: -1 } },
      { 
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "bookDetails",
        }
      },
      { $unwind: "$bookDetails" },
      { 
        $replaceRoot: {
          newRoot: { $mergeObjects: ["$bookDetails", { totalQuantity: "$totalQuantity" }] }
        }
      },
      { $limit: 10 },
    ]);

    res.status(200).json(topSellingBooks);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy sách", error: error.message });
  }
};


module.exports = {
  getAllBooks,
  getBookById,
  getBookByCategory,
  getDiscountedBooks,
  getNewBooks,
  getBookByAuthor,
  getBookByPublisher,
  getBestSellers,
};
