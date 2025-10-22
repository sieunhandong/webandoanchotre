const Order = require("../models/Order");
const UserProfile = require("../models/UserProfile");
const Account = require("../models/Account");
const Product = require("../models/Product");
const moment = require("moment");


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
// 🧩 Cập nhật role của user (admin / user)
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Kiểm tra role hợp lệ
    const allowedRoles = ["user", "admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Role không hợp lệ (chỉ chấp nhận: user, admin)" });
    }

    const updatedUser = await Account.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select("-password -accessToken -refreshToken");

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.status(200).json({
      message: `Cập nhật quyền thành công: ${updatedUser.name} → ${updatedUser.role}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("❌ updateUserRole error:", error);
    res.status(500).json({ message: "Lỗi cập nhật role người dùng", error });
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
        populate: {
          path: "userInfo",
          populate: { path: "selectedProducts" },
        },
      })
      .populate("items.setId");

    if (!order) return res.status(404).json({ message: "Không tìm thấy order" });

    const baby = order.userId?.userInfo?.babyInfo || {};
    const selectedProducts = order.userId?.userInfo?.selectedProducts || [];
    const likedProductNames = selectedProducts.map(p => p.name).filter(Boolean);

    // --- Parse dữ liệu ---
    function parseRange(value, defaultValue = 6) {
      if (!value) return defaultValue;
      const clean = String(value).toLowerCase().replace(/[^\d\.\-\–]/g, "").trim();
      if (!isNaN(Number(clean))) return Number(clean);
      const match = clean.match(/(\d+(?:\.\d+)?)[\-\–]+(\d+(?:\.\d+)?)/);
      if (match) {
        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        return (min + max) / 2;
      }
      return defaultValue;
    }

    const parsedAge = parseRange(baby.age, 6);
    const parsedWeight = parseRange(baby.weight, 6);
    const estimatedCalories = Math.round(parsedWeight * 80);

    // --- Dinh dưỡng & phương pháp ---
    let nutritionComment = "";
    if (parsedWeight < parsedAge - 1)
      nutritionComment = "→ Bé hơi nhẹ cân, nên bổ sung thực phẩm giàu năng lượng và chất béo tốt.";
    else if (parsedWeight > parsedAge + 1)
      nutritionComment = "→ Bé có xu hướng nặng cân, nên ưu tiên món dễ tiêu, ít dầu mỡ.";
    else nutritionComment = "→ Cân nặng phù hợp với lứa tuổi, duy trì chế độ ăn cân đối.";

    const feedingMap = {
      traditional: "truyền thống",
      blw: "tự chỉ huy",
      japanese: "kiểu Nhật",
    };

    let feedingMethodText = "Ăn dặm truyền thống (xay nhuyễn, cho ăn bằng thìa)";
    let feedingGuideline = `
- Thức ăn được nấu chín mềm, nghiền hoặc xay nhuyễn.
- Ưu tiên món cháo, súp, bột, dễ nuốt.
- Phù hợp cho bé mới bắt đầu ăn dặm.
`;

    if (baby.feedingMethod === "blw") {
      feedingMethodText = "Ăn dặm tự chỉ huy (Baby-Led Weaning - bé tự bốc ăn)";
      feedingGuideline = `
- Bé tự cầm ăn, không đút thìa.
- Món ăn cần mềm, dễ cầm, cắt dạng que hoặc khối.
- Tránh món quá nhỏ dễ hóc.
- Không chiên giòn, không cay.
`;
    } else if (baby.feedingMethod === "japanese") {
      feedingMethodText = "Ăn dặm kiểu Nhật (ăn riêng từng món, vị nhẹ, trình bày đẹp mắt)";
      feedingGuideline = `
- Mỗi bữa gồm nhiều món nhỏ, vị riêng nhẹ.
- Không trộn nhiều nguyên liệu.
- Hạn chế nêm mặn, tránh dầu mỡ.
`;
    }

    // --- Hướng dẫn dinh dưỡng ---
    let nutritionGuideline = `
Dựa vào thông tin của bé:
- Tháng tuổi: ${baby.age || "6"} → Giai đoạn này nên ${parsedAge < 8
        ? "ăn đồ mềm, nghiền mịn và dễ nuốt"
        : parsedAge < 12
          ? "bắt đầu làm quen với đồ cắt nhỏ, mềm, dễ nhai"
          : "ăn được cơm nát và món đa dạng hơn"
      }.
- Cân nặng: ${baby.weight || "6"} → Ước tính cần khoảng ${estimatedCalories} kcal/ngày. ${nutritionComment}
- Dị ứng: ${baby.allergies?.length ? baby.allergies.join(", ") : "Không có"} → Loại bỏ các nguyên liệu này.
`;

    if (likedProductNames.length)
      nutritionGuideline += `
- Nguyên liệu bé thích: ${likedProductNames.join(", ")} → Ưu tiên sử dụng nếu phù hợp.
`;

    const duration = order.items?.[0]?.duration || 7;

    const prompt = `
Thông tin chi tiết của bé:
${nutritionGuideline}

Phương pháp ăn dặm: ${feedingMethodText}
Hướng dẫn thực đơn:
${feedingGuideline}

Yêu cầu:
- Gợi ý thực đơn ăn dặm CHÍNH XÁC ${duration} ngày, mỗi ngày 2 bữa (sáng & tối).
- Mỗi bữa chỉ cần tên món và mô tả lợi ích ngắn.
- Nếu trong một bữa có nhiều món (ví dụ cháo, rau, củ, hoặc trái cây), hãy liệt kê chúng trong cùng một chuỗi và NGĂN CÁCH bằng dấu phẩy (,).
- Không dùng nguyên liệu dị ứng.
- Ưu tiên món có nguyên liệu bé thích.
- Không lặp món, không cay, không chiên.
- Kết quả phải là JSON hợp lệ, mảng 7 phần tử như sau:
[
  { "day": 1, "menu": ["Bữa sáng: Cháo bí đỏ thịt gà - Giàu vitamin A", "Bữa tối: Súp cà rốt thịt bò - Cung cấp sắt"] },
  ...
]
`;
    // --- Gọi AI ---
    let aiText = "";
    let suggestions = [];
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
      console.warn("⚠️ Không thể gọi Gemini:", err.message);
    }

    // --- Parse kết quả AI ---
    try {
      let cleaned = aiText
        .replace(/```json|```/gi, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\r?\n|\r/g, " ")
        .trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Không tìm thấy JSON");
      suggestions = JSON.parse(jsonMatch[0]);
      // --- Chuẩn hóa key để đảm bảo luôn có "menu"
      suggestions = suggestions.map((item, i) => ({
        day: item.day || i + 1,
        menu: item.menu || item.meals || item.Menu || item.MEALS || [],
      }));

    } catch (e) {
      console.warn("⚠️ Parse lỗi, fallback mẫu:", e.message);
      suggestions = Array.from({ length: duration }).map((_, i) => ({
        day: i + 1,
        menu: [
          `Bữa sáng: Cháo sáng ${i + 1}`,
          `Bữa tối: Cháo tối ${i + 1}`,
        ],
      }));
    }

    return res.json({ success: true, data: suggestions });
  } catch (err) {
    console.error("❌ suggestMealByAI Error:", err);
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

