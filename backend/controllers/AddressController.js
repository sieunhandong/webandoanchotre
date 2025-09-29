// controllers/addressController.js
const mongoose = require("mongoose");
const User = require("../models/User");
const isId = (v) => mongoose.Types.ObjectId.isValid(v);

/* -------------------------------------------------- *
 * 1. LẤY DANH SÁCH ĐỊA CHỈ
 * -------------------------------------------------- */
exports.getAll = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!isId(userId))
      return res.status(400).json({ message: "userId invalid" });

    // chỉ trả về mảng address
    const user = await User.findById(userId, "address");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.address);
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------- *
 * 2. TẠO ĐỊA CHỈ MỚI
 *    – Luôn push với isDefault = false,
 *      rồi, nếu client chọn mặc định, gọi setDefaultAddress().
 *    – Như vậy không bao giờ vướng duplicate-key.
 * -------------------------------------------------- */
exports.create = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!isId(userId))
      return res.status(400).json({ message: "userId invalid" });

    const {
      address,
      provinceId,
      provinceName,
      districtId,
      districtName,
      wardCode,
      wardName,
      isDefault = false,
    } = req.body;

    if (![address, provinceId, districtId, wardCode].every(Boolean))
      return res.status(400).json({ message: "Thiếu trường bắt buộc" });

    // 1. push với isDefault = false
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.address.push({
      address,
      provinceId,
      provinceName,
      districtId,
      districtName,
      wardCode,
      wardName,
      isDefault: false,
    });
    await user.save();

    // 2. nếu cần mặc định → chuyển cờ
    if (isDefault) {
      const newAddrId = user.address.at(-1)._id;
      await User.setDefaultAddress(userId, newAddrId);
    }

    res.status(201).json(user.address);
  } catch (err) {
    // Bắt lỗi duplicate key (hiếm khi xảy ra, nhưng trả message đẹp)
    if (err.code === 11000)
      return res.status(409).json({ message: "Đã có địa chỉ mặc định khác" });
    next(err);
  }
};

/* -------------------------------------------------- *
 * 3. CẬP NHẬT ĐỊA CHỈ
 *    – Không đụng tới isDefault trong $set.
 *    – Sau khi cập nhật xong, nếu client truyền isDefault = true
 *      thì mới gọi setDefaultAddress().
 * -------------------------------------------------- */
exports.update = async (req, res, next) => {
  try {
    const { userId, addrId } = req.params;
    if (![isId(userId), isId(addrId)].every(Boolean))
      return res.status(400).json({ message: "invalid id" });

    const payload = (({
      address,
      provinceId,
      provinceName,
      districtId,
      districtName,
      wardCode,
      wardName,
    }) => ({
      "address.$.address": address,
      "address.$.provinceId": provinceId,
      "address.$.provinceName": provinceName,
      "address.$.districtId": districtId,
      "address.$.districtName": districtName,
      "address.$.wardCode": wardCode,
      "address.$.wardName": wardName,
    }))(req.body);

    const user = await User.findOneAndUpdate(
      { _id: userId, "address._id": addrId },
      { $set: payload },
      { new: true, projection: { address: 1 }, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: "Address not found" });

    if (req.body.isDefault === true)
      await User.setDefaultAddress(userId, addrId);

    res.json(user.address);
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------- *
 * 4. ĐẶT MẶC ĐỊNH (endpoint riêng)
 * -------------------------------------------------- */
exports.setDefault = async (req, res, next) => {
  try {
    const { userId, addrId } = req.params;
    if (![isId(userId), isId(addrId)].every(Boolean))
      return res.status(400).json({ message: "invalid id" });

    const ok = await User.exists({ _id: userId, "address._id": addrId });
    if (!ok) return res.status(404).json({ message: "Address not found" });

    await User.setDefaultAddress(userId, addrId);
    res.json({ message: "Đã đặt địa chỉ mặc định" });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------- *
 * 5. XOÁ ĐỊA CHỈ
 *    – Lấy trạng thái mặc định của địa chỉ cần xoá (projection).
 *    – $pull ra khỏi mảng.
 *    – Nếu nó từng là mặc định và vẫn còn địa chỉ khác,
 *      setDefaultAddress() cho phần tử đầu.
 * -------------------------------------------------- */
exports.remove = async (req, res, next) => {
  try {
    const { userId, addrId } = req.params;
    if (![isId(userId), isId(addrId)].every(Boolean))
      return res.status(400).json({ message: "invalid id" });

    // 1. Lấy địa chỉ để biết có phải default không
    const doc = await User.findOne(
      { _id: userId, "address._id": addrId },
      { "address.$": 1 }
    );
    if (!doc) return res.status(404).json({ message: "Address not found" });

    const wasDefault = doc.address[0].isDefault;

    // 2. Xoá
    const afterPull = await User.findOneAndUpdate(
      { _id: userId },
      { $pull: { address: { _id: addrId } } },
      { new: true, projection: { address: 1 } }
    );

    // 3. Nếu xoá default và còn địa chỉ khác → gán default mới
    if (wasDefault && afterPull.address.length) {
      await User.setDefaultAddress(userId, afterPull.address[0]._id);
    }

    res.json({ message: "Đã xoá địa chỉ" });
  } catch (err) {
    next(err);
  }
};
