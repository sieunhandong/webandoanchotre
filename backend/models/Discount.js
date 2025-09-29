const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^[A-Z0-9]{6}$/,
        "Mã giảm giá phải có đúng 6 ký tự, chỉ bao gồm chữ in hoa và số",
      ],
    },
    type: {
      type: String,
      required: true,
      enum: ["fixed", "percentage"],
    },
    value: {
      type: Number,
      required: true,
      validate: {
        validator(v) {
          return this.type === "percentage"
            ? Number.isInteger(v) && v > 0 && v <= 100
            : v > 0;
        },
        message: (props) => `Giá trị giảm giá không hợp lệ: ${props.value}`,
      },
    },
    minPurchase: {
      type: Number,
      required: true,
      min: [0, "Giá trị đơn hàng tối thiểu không thể nhỏ hơn 0"],
    },
    usageLimit: {
      type: Number,
      required: true,
      min: [1, "Số lần sử dụng tối đa phải ≥ 1"],
      validate: {
        validator: Number.isInteger,
        message: (props) => `${props.value} phải là số nguyên`,
      },
    },
    usedCount: {
      type: Number,
      default: 0,
      validate: [
        {
          validator: Number.isInteger,
          message: (props) => `${props.value} phải là số nguyên`,
        },
        {
          validator(v) {
            return v <= this.usageLimit;
          },
          message: (props) =>
            `Số lần sử dụng (${props.value}) vượt quá giới hạn`,
        },
      ],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book", 
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Discount", discountSchema);
