const Order = require("../models/Order");
const UserProfile = require("../models/UserProfile");
const Account = require("../models/Account");
const Product = require("../models/Product");
const moment = require("moment");


// 🧾 Lấy danh sách tất cả user (kèm hồ sơ)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await Account.find()
      .select("-password -accessToken -refreshToken")
      .populate("userInfo", "babyInfo address isActive");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách user", error });
  }
};
exports.getUserById = async (req, res) => {
  try {
    const user = await Account.findById(req.params.id)
      .select("-password -accessToken -refreshToken")
      .populate("userInfo", "babyInfo address selectedProducts isActive");

    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thông tin user", error });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { accountData, profileData } = req.body;
    // Cho phép gửi hai phần dữ liệu riêng biệt:
    // accountData → { name, email, phone, role, isActivated }
    // profileData → { babyInfo, address, selectedProducts }

    const accountId = req.params.id;

    // Cập nhật Account
    const updatedAccount = await Account.findByIdAndUpdate(accountId, accountData, {
      new: true,
    }).select("-password -accessToken -refreshToken");

    if (!updatedAccount) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    // Nếu có hồ sơ (profileData)
    if (profileData) {
      await UserProfile.findOneAndUpdate(
        { accountId: accountId },
        profileData,
        { new: true, upsert: true } // nếu chưa có profile thì tạo mới
      );
    }

    // Lấy lại dữ liệu đầy đủ sau cập nhật
    const fullUser = await Account.findById(accountId)
      .select("-password -accessToken -refreshToken")
      .populate("userInfo", "babyInfo address selectedProducts isActive");

    res.status(200).json(fullUser);
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật user", error });
  }
};


// 🗑️ Xóa user (và profile liên quan)
exports.deleteUser = async (req, res) => {
  try {
    const accountId = req.params.id;

    const deletedAccount = await Account.findByIdAndDelete(accountId);
    if (!deletedAccount) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    // Xóa luôn hồ sơ nếu có
    await UserProfile.findOneAndDelete({ accountId });

    res.status(200).json({ message: "Xóa user thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa user", error });
  }
};

exports.changeStatusUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await Account.findById(userId).select("isActivated");

    if (!user) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy user với id ${userId}` });
    }

    user.isActivated = !user.isActivated;
    await user.save();

    res.status(200).json({ message: "Thay đổi trạng thái thành công", data: user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "userId",
        select: "name email phone userInfo",
        populate: {
          path: "userInfo",
          select: "babyInfo address selectedProducts",
          populate: {
            path: "selectedProducts",
            select: "name", // 👈 chỉ lấy name sản phẩm
          },
        },
      })
      .populate("items.setId", "title price duration");

    const enrichedOrders = orders.map((order) => {
      if (!order.delivery?.time || !order.items?.length) return order;

      const startDate = moment(order.delivery.time).startOf("day");
      const today = moment().startOf("day");
      const duration = order.items[0].duration || 0;

      const diffDays = today.diff(startDate, "days") + 1;
      let currentDay = diffDays;

      if (currentDay < 1) currentDay = 0;
      if (currentDay > duration) currentDay = duration;

      let todayMenu = null;
      if (order.mealSuggestions?.length) {
        const found = order.mealSuggestions.find(
          (m) => Number(m.day) === Number(currentDay)
        );
        if (found) todayMenu = found.menu;
      }

      return {
        ...order.toObject(),
        progress: {
          startDate: startDate.format("YYYY-MM-DD"),
          duration,
          currentDay,
          isStarted: currentDay > 0,
          isCompleted: currentDay >= duration,
          todayMenu,
        },
      };
    });

    return res.status(200).json(enrichedOrders);
  } catch (error) {
    console.error("❌ getAllOrders error:", error);
    return res
      .status(500)
      .json({ message: "Lỗi lấy danh sách đơn hàng", error });
  }
};
// POST /admin/orders/:orderId/ai-suggest
exports.suggestMealByAI = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate({
        path: "userId",
        populate: { path: "userInfo" },
      })
      .populate("items.setId");

    if (!order) return res.status(404).json({ message: "Không tìm thấy order" });

    const baby = order.userId?.userInfo?.babyInfo || {};
    const feedingMap = {
      traditional: "truyền thống",
      blw: "tự chỉ huy",
      japanese: "kiểu Nhật",
    };

    // Xác định số ngày theo set
    const duration =
      order.items?.[0]?.duration || 7; // nếu không có thì mặc định 7

    const prompt = `
Thông tin bé:
- Tháng tuổi: ${baby.age || 4 - 6} tháng
- Cân nặng: ${baby.weight || 4 - 6} kg
- Phương pháp ăn dặm: ${feedingMap[baby.feedingMethod] || "truyền thống"}
- Dị ứng: ${baby.allergies?.length ? baby.allergies.join(", ") : "Không có"}

Yêu cầu:
- Hãy gợi ý thực đơn ăn dặm cho CHÍNH XÁC ${duration} ngày, mỗi ngày 2 bữa (sáng và tối).
- Mỗi bữa chỉ cần tên món ăn, KHÔNG cần giải thích.
- Không dùng nguyên liệu có trong danh sách dị ứng.
- Phù hợp với phương pháp ăn dặm kiểu ${feedingMap[baby.feedingMethod] || "truyền thống"}.
- Trả về KẾT QUẢ LÀ JSON HỢP LỆ TRONG MỘT DÒNG DUY NHẤT.
- Trong mảng "menu", mỗi phần tử có dạng:
  "Bữa sáng ăn: <tên món>", "Bữa tối ăn: <tên món>"
`;

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let suggestions = [];
    try {
      const cleaned = aiText
        .replace(/```json|```/g, "")
        .replace(/\n/g, " ")
        .trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      suggestions = JSON.parse(match[0]);
    } catch (e) {
      console.error("⚠️ Parse lỗi, fallback:", e);
      suggestions = Array.from({ length: duration }).map((_, i) => ({
        day: i + 1,
        menu: [`Bữa sáng ăn Cháo sáng ${i + 1}`, `Bữa tối ăn Cháo tối ${i + 1}`],
      }));
    }

    return res.json({
      success: true,
      data: suggestions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};



// PUT /admin/orders/:orderId/update-meals
exports.updateMealMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { menus } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy order" });

    order.mealSuggestions = menus;
    await order.save();

    res.json({ success: true, message: "Đã cập nhật thực đơn thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMealDone = async (req, res) => {
  try {
    const { orderId, day, isDone } = req.body;

    if (!orderId || typeof day === "undefined") {
      return res.status(400).json({ message: "Thiếu orderId hoặc day" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    const meal = order.mealSuggestions.find((m) => Number(m.day) === Number(day));
    if (!meal) return res.status(404).json({ message: "Không tìm thấy ngày ăn tương ứng" });

    meal.isDone = Boolean(isDone);
    await order.save();

    return res.status(200).json({ message: "Cập nhật thành công", meal });
  } catch (error) {
    console.error("❌ updateMealDone error:", error);
    return res.status(500).json({ message: "Lỗi khi cập nhật trạng thái món", error });
  }
};

