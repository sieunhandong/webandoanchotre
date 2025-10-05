const Account = require("../models/Account");
const UserProfile = require("../models/UserProfile");

exports.createOrUpdateProfile = async (req, res) => {
    try {
        const { monthAge, height, weight, gender, method, likes, dislikes, allergies, selectedProducts } = req.body;
        const accountId = req.user._id;

        // ✅ Validate cơ bản
        if (!monthAge || !height || !weight || !gender || !method) {
            console.log(monthAge, height, weight, gender, method);
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
        }

        let profile = await UserProfile.findOne({ accountId });

        if (!profile) {
            profile = await UserProfile.create({
                accountId,
                monthAge,
                height,
                weight,
                gender,
                method,
                likes,
                dislikes,
                allergies,
                selectedProducts
            });
            await Account.findByIdAndUpdate(accountId, { userInfo: profile._id });
        } else {
            Object.assign(profile, { monthAge, height, weight, gender, method, likes, dislikes, allergies, selectedProducts });
            await profile.save();
        }

        return res.status(200).json({ success: true, data: profile });
    } catch (err) {
        console.error("❌ Lỗi khi tạo/cập nhật profile:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.getUserProfile = async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ accountId: req.user._id });
        if (!profile) return res.status(404).json({ message: "Chưa có hồ sơ" });
        res.status(200).json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};