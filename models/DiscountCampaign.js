// models/DiscountCampaign.js
const mongoose = require("mongoose");

const discountCampaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    books: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
      },
    ],
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DiscountCampaign", discountCampaignSchema, "salecampaigns");
