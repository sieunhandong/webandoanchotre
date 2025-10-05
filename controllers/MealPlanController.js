const UserProfile = require("../models/UserProfile");
const Product = require("../models/Product");

const getMealSuggestions = async (req, res) => {
    try {
        const { profile } = req.body;
        // profile sẽ chứa: monthAge, height, weight, gender, method, allergies, dislikes, selectedProducts

        if (!profile) {
            return res.status(400).json({ error: "Vui lòng cung cấp thông tin hồ sơ trẻ." });
        }

        // Lấy danh sách sản phẩm (nếu có selectedProducts)
        let selectedList = [];
        if (profile.selectedProducts?.length) {
            const products = await Product.find({ _id: { $in: profile.selectedProducts } });
            selectedList = products.map(p => `- ${p.name} (${p.category?.name || "Không rõ danh mục"})`);
        }

        // Tạo prompt AI
        const prompt = `
Thông tin trẻ:
- Giới tính: ${profile.gender === "male" ? "Bé trai" : "Bé gái"}
- Tháng tuổi: ${profile.monthAge}
- Chiều cao: ${profile.height} cm
- Cân nặng: ${profile.weight} kg
- Phương pháp ăn dặm: ${profile.method}
- Dị ứng: ${profile.allergies?.length ? profile.allergies.join(", ") : "Không có"}
- Không thích: ${profile.dislikes?.length ? profile.dislikes.join(", ") : "Không có"}
- Nguyên liệu sẵn có: ${selectedList.length ? selectedList.join(", ") : "Chưa chọn"}

Yêu cầu:
- Hãy gợi ý thực đơn ăn dặm cho 7 ngày dựa trên thông tin trên.
- Mỗi ngày 1 bữa chính, mô tả món và lý do tại sao phù hợp.
- Loại bỏ nguyên liệu có trong danh sách dị ứng hoặc không thích.
- Kết quả trả về phải là JSON hợp lệ, dạng:
[
  { "day": 1, "menu": "Cháo bí đỏ nấu thịt gà", "reason": "Giúp bổ sung vitamin A, dễ tiêu hóa" },
  ...
]
        `;

        console.log("⚙️ Prompt gửi AI:\n", prompt);

        let aiText = "";
        let suggestions = [];

        // --- Gọi Gemini API ---
        try {
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

            const result = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            });

            aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (err) {
            console.warn("⚠️ Không thể gọi Gemini, fallback dữ liệu mẫu:", err.message);
            aiText = JSON.stringify([
                { day: 1, menu: "Cháo bí đỏ thịt gà", reason: "Dễ tiêu, giàu vitamin A" },
                { day: 2, menu: "Cháo cà rốt cá hồi", reason: "Giàu omega-3, phát triển não" },
                { day: 3, menu: "Súp khoai lang nghiền", reason: "Giúp bé dễ tiêu hoá" },
                { day: 4, menu: "Cháo yến mạch chuối", reason: "Ngủ ngon và nhiều năng lượng" },
                { day: 5, menu: "Cháo rau củ thịt bò", reason: "Cung cấp sắt và chất xơ" },
                { day: 6, menu: "Bánh khoai tây hấp trứng", reason: "Giàu protein và xơ" },
                { day: 7, menu: "Cháo bí xanh tôm", reason: "Giúp mát gan, dễ ăn" }
            ]);
        }

        // --- Xử lý dữ liệu trả về ---
        try {
            suggestions = JSON.parse(aiText);
        } catch (e) {
            console.warn("⚠️ AI không trả về JSON hợp lệ, fallback sang text parse");
            suggestions = aiText.split("\n").map((line, i) => ({
                day: i + 1,
                menu: line,
                reason: "Không rõ lý do",
            }));
        }

        // --- Lưu xuống DB ---
        if (req.user?._id) {
            await UserProfile.findOneAndUpdate(
                { accountId: req.user._id },
                { mealSuggestions: suggestions },
                { new: true }
            );
        }

        return res.json({
            reply: "Gợi ý thực đơn ăn dặm 7 ngày đã được tạo thành công!",
            meals: suggestions,
        });
    } catch (error) {
        console.error("❌ Lỗi khi gọi AI gợi ý thực đơn:", error);
        res.status(500).json({ error: "Đã có lỗi xảy ra, vui lòng thử lại sau!" });
    }
};

module.exports = { getMealSuggestions };
