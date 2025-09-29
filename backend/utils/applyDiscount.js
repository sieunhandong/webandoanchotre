const DiscountCampaign = require("../models/DiscountCampaign");

const applyDiscountCampaignsToBooks = async (books) => {
  const now = new Date();
  const campaigns = await DiscountCampaign.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });

  const booksWithDiscount = books.map((book) => {
    const campaign = campaigns.find((c) =>
      c.books.some((b) => b.toString() === book._id.toString())
    );

    if (campaign) {
      const discountPercentage = campaign.percentage;
      const discountedPrice = Math.round(
        book.originalPrice * (1 - discountPercentage / 100)
      );
      return {
        ...book.toObject(),
        discountPercentage,
        price: discountedPrice,
      };
    }

    return book.toObject();
  });

  return booksWithDiscount;
};

module.exports = { applyDiscountCampaignsToBooks };
