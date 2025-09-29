// controllers/discountCampaignController.js
const DiscountCampaign = require("../models/DiscountCampaign");
const Book = require("../models/Book");

// Tạo campaign mới
exports.createCampaign = async (req, res) => {
  try {
    const { name, description, books, percentage, startDate, endDate } =
      req.body;

    const campaign = await DiscountCampaign.create({
      name,
      description,
      books,
      percentage,
      startDate,
      endDate,
      isActive: true,
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cập nhật campaign
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await DiscountCampaign.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Xoá campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    await DiscountCampaign.findByIdAndDelete(id);
    res.json({ success: true, message: "Campaign deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách campaign
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await DiscountCampaign.find().populate("books");
    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Check active campaigns
exports.checkBookConflicts = async (req, res) => {
  try {
    const { books, startDate, endDate, campaignId } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const campaigns = await DiscountCampaign.find({
      _id: { $ne: campaignId }, // exclude current campaign if editing
      books: { $in: books },
      isActive: true,
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    const conflictedBooks = campaigns.flatMap((c) =>
      c.books.filter((b) => books.includes(b.toString()))
    );

    res.json({
      conflictedBooks: [...new Set(conflictedBooks.map((id) => id.toString()))],
    });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi kiểm tra sách trùng campaign",
      error: err.message,
    });
  }
};
exports.checkBookConflictsPreview = async (req, res) => {
  try {
    const { books, startDate, endDate, campaignId } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const campaigns = await DiscountCampaign.find({
      _id: { $ne: campaignId }, // Loại trừ chính campaign đang edit
      books: { $in: books },
      isActive: true,
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    const conflictedBooks = campaigns.flatMap((c) =>
      c.books.map((b) => b.toString())
    );

    res.json({
      conflictedBooks: [...new Set(conflictedBooks)],
    });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi khi preview sách bị trùng campaign",
      error: err.message,
    });
  }
};

// Cron job kiểm tra và vô hiệu hóa campaign đã hết hạn
exports.autoDeactivateExpiredCampaigns = async () => {
  const now = new Date();
  await DiscountCampaign.updateMany(
    { endDate: { $lt: now }, isActive: true },
    { isActive: false }
  );
};
