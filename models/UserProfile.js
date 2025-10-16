const mongoose = require("mongoose");

const UserProfileSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true }, // ai sở hữu profile này
    babyInfo: {
        age: { type: String },
        weight: { type: String },
        allergies: [{ type: String }],
        feedingMethod: {
            type: String,
            enum: ["traditional", "blw", "japanese"],
            required: true
        },
    },
    address: {
        address: { type: String }, // số nhà, đường
        provinceId: { type: Number },
        provinceName: { type: String },
        districtId: { type: Number },
        districtName: { type: String },
        wardCode: { type: String },
        wardName: { type: String },
        isDefault: { type: Boolean, default: false }, // Đánh dấu địa chỉ mặc định
    },
    selectedProducts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
        },
    ],
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("UserProfile", UserProfileSchema);