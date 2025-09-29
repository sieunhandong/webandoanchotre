const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema(
  {
    address: { type: String }, // số nhà, đường
    provinceId: { type: Number },
    provinceName: { type: String },
    districtId: { type: Number },
    districtName: { type: String },
    wardCode: { type: String },
    wardName: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, select: false },
    phone: String,
    address: [AddressSchema],
    point: { type: Number, default: 0 },
    googleId: String,
    facebookId: String,
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActivated: { type: Boolean, default: true },
    accessToken: { type: String, default: null, select: true },
    refreshToken: { type: String, default: null, select: true },
  },
  { timestamps: true }
);

// ✅ Chỉ cho phép 1 địa chỉ mặc định
userSchema.index(
  { _id: 1, "address.isDefault": 1 },
  { unique: true, partialFilterExpression: { "address.isDefault": true } }
);

// ✅ Đặt lại địa chỉ mặc định duy nhất
userSchema.statics.setDefaultAddress = async function (userId, addrId) {
  const objectId = new mongoose.Types.ObjectId(addrId); // ✅ fix lỗi "without 'new'"
  await this.updateOne({ _id: userId }, [
    {
      $set: {
        address: {
          $map: {
            input: "$address",
            as: "a",
            in: {
              $mergeObjects: [
                "$$a",
                {
                  isDefault: {
                    $eq: ["$$a._id", objectId],
                  },
                },
              ],
            },
          },
        },
      },
    },
  ]);
};

module.exports = mongoose.model("User", userSchema);
