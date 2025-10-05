const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: String,
    nutrition: { type: String },
    suitableAge: { type: Number },
    allergicRisk: { type: Boolean, default: false },
    description: { type: String },
    image: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
