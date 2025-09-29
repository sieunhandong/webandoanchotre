const Cart = require("../models/Cart");
const Book = require("../models/Book");
const { applyDiscountCampaignsToBooks } = require("../utils/applyDiscount");
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "cartItems.book"
    );

    if (!cart) {
      return res
        .status(200)
        .json({ message: "Giỏ hàng trống!", cartItems: [] });
    }

    const books = cart.cartItems.map((item) => item.book);
    const discountedBooks = await applyDiscountCampaignsToBooks(books);

    const updatedCartItems = cart.cartItems.map((item, index) => ({
      ...item.toObject(),
      book: discountedBooks[index],
    }));

    res.status(200).json({ cartItems: updatedCartItems });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};
const addBookToCart = async (req, res) => {
    try {
        const { bookId, quantity } = req.body;
        if (!bookId || quantity <= 0) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ!" });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Sách không tồn tại!" });
        }

        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = new Cart({ user: req.user._id, cartItems: [] });
        }

        const existingItem = cart.cartItems.find(
            (item) => item.book.toString() === bookId
        );

        if (existingItem) {
            if (existingItem.quantity + quantity > book.stock) {
                return res.status(400).json({ message: "Sách không đủ hàng!" });
            }
            existingItem.quantity += quantity;
        } else {
            if (quantity > book.stock) {
                return res.status(400).json({ message: "Sách không đủ hàng!" });
            }
            cart.cartItems.push({ book: bookId, quantity });
        }

        await cart.save();
        res.status(200).json({ message: "Đã cập nhật giỏ hàng!", cart });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

const updateCart = async (req, res) => {
    try {
        const { bookId, quantity } = req.body;
        if (!bookId || quantity < 1) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ!" });
        }

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ message: "Giỏ hàng trống!" });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Sách không tồn tại!" });
        }

        const itemIndex = cart.cartItems.findIndex(
            (item) => item.book.toString() === bookId
        );
        if (itemIndex === -1) {
            return res.status(404).json({ message: "Sách không có trong giỏ hàng!" });
        }
        if (quantity > book.stock) {
            return res.status(400).json({ message: "Sách không đủ hàng!" });
        }
        cart.cartItems[itemIndex].quantity = quantity;
        await cart.save();
        res.status(200).json({ message: "Đã cập nhật số lượng!", cart });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

const deleteBookFromCart = async (req, res) => {
    try {
        const { bookId } = req.params;

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ message: "Giỏ hàng trống!" });
        }

        cart.cartItems = cart.cartItems.filter(
            (item) => item.book.toString() !== bookId
        );

        await cart.save();
        res.status(200).json({ message: "Đã xóa sách khỏi giỏ hàng!", cart });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

module.exports = {
    getCart,
    addBookToCart,
    updateCart,
    deleteBookFromCart,
};