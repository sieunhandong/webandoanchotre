const Discount = require("../models/Discount");

const getDiscountSuitable = async (req, res) => {
  try {
    const { amount, productId } = req.query;

    if (!amount || isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: "Số tiền không hợp lệ" });
    }

    const today = new Date();

    const query = {
      isActive: true,
      minPurchase: { $lte: amount },
      startDate: { $lte: today },
      endDate: { $gte: today },
      $expr: { $lt: ["$usedCount", "$usageLimit"] },
    };

    if (productId) {
      query.$or = [
        { productIds: { $exists: false } },
        { productIds: { $size: 0 } },
        { productIds: productId },
      ];
    }

    const discounts = await Discount.find(query);
    res.json({ discounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDiscountSuitable,
};
