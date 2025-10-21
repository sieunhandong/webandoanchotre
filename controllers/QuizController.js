const QuizSession = require('../models/QuizSession');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Set = require('../models/MealSet');
const Order = require('../models/Order');
const UserProfile = require('../models/UserProfile');
const Account = require('../models/Account');
const { v4: uuidv4 } = require('uuid');
const dotenv = require("dotenv");
const moment = require("moment");
const MealSet = require('../models/MealSet');
const sendEmailOAuth = require('../utils/sendMailOAuth');
dotenv.config();

const SEPAY_API_KEY = process.env.SEPAY_API_KEY
// Bắt đầu quiz
exports.startQuiz = async (req, res) => {
    try {
        const sessionId = uuidv4();
        const session = new QuizSession({ sessionId });
        await session.save();
        res.json({ success: true, data: { sessionId, step: 1 } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Step 1: Nhập tháng tuổi, cân nặng, dị ứng
exports.step1 = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const { age, weight, allergies } = req.body;
        if (!sessionId || !age || !weight || !allergies) return res.status(400).json({ message: 'Thiếu dữ liệu' });

        const session = await QuizSession.findOne({ sessionId });
        if (!session) return res.status(404).json({ message: 'Session không tồn tại' });

        session.data.age = age;
        session.data.weight = weight;
        session.data.allergies = allergies;
        session.step = 2;
        await session.save();

        if (req.user) {
            const userProfile = await UserProfile.findOne({ accountId: req.user.userId });
            if (userProfile) {
                userProfile.babyInfo = { age, weight, allergies, feedingMethod: userProfile.babyInfo.feedingMethod };
                await userProfile.save();
            }
        }

        res.json({ success: true, data: { step: 2 } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Step 2: Chọn phương pháp ăn dặm
exports.step2 = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const { feedingMethod } = req.body;
        if (!sessionId || !feedingMethod || !["traditional", "blw", "japanese"].includes(feedingMethod)) {
            return res.status(400).json({ message: 'Thiếu dữ liệu hoặc phương pháp không hợp lệ' });
        }

        const session = await QuizSession.findOne({ sessionId });
        // if (!session || session.step !== 2) return res.status(400).json({ message: 'Bước không hợp lệ' });

        session.data.feedingMethod = feedingMethod;
        session.step = 3;
        await session.save();

        if (req.user) {
            const userProfile = await UserProfile.findOne({ accountId: req.user.userId });
            if (userProfile) {
                userProfile.babyInfo.feedingMethod = feedingMethod;
                await userProfile.save();
            }
        }

        res.json({ success: true, data: { step: 3 } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Step 3: Chọn sản phẩm theo danh mục
exports.step3 = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const { selectedProducts } = req.body; // Nhận mảng selectedProducts từ frontend
        if (!sessionId || !selectedProducts) return res.status(400).json({ message: 'Thiếu dữ liệu' });

        const session = await QuizSession.findOne({ sessionId });
        // if (!session || session.step !== 3) return res.status(400).json({ message: 'Bước không hợp lệ' });

        // Xác thực productId
        const validProducts = await Product.find({ _id: { $in: selectedProducts }, isActive: true });
        if (validProducts.length !== selectedProducts.length) {
            return res.status(400).json({ message: 'Một số sản phẩm không hợp lệ hoặc không khả dụng' });
        }

        // Lưu danh sách sản phẩm đã chọn
        session.data.selectedProducts = selectedProducts;
        session.step = 4;
        await session.save();

        if (req.user) {
            const userProfile = await UserProfile.findOne({ accountId: req.user.userId });
            if (userProfile) {
                userProfile.selectedProducts = selectedProducts; // Cập nhật sản phẩm đã chọn
                await userProfile.save();
            }
        }

        res.json({ success: true, data: { step: 4 } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Step 4: Gợi ý thực đơn
exports.step4 = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await QuizSession.findOne({ sessionId }).populate({
            path: "data.selectedProducts",
            populate: { path: "category" },
        });

        if (!session) return res.status(404).json({ message: "Không tìm thấy session" });

        // Lấy thông tin từ session
        const { age, weight, allergies, feedingMethod, selectedProducts } = session.data;
        let selectedList = [];
        if (selectedProducts?.length) {
            const products = await Product.find({ _id: { $in: selectedProducts } });
            selectedList = products.map(
                (p) => `- ${p.name}`
            );
        }
        // --- Mapping phương pháp ăn dặm chi tiết ---
        let feedingMethodText = "Ăn dặm truyền thống (xay nhuyễn, cho ăn bằng thìa)";
        let feedingGuideline = `
- Thức ăn được nấu chín mềm, nghiền hoặc xay nhuyễn.
- Ưu tiên món cháo, súp, bột, dễ nuốt.
- Phù hợp cho bé mới bắt đầu ăn dặm, cần thức ăn mịn.
`;

        switch (feedingMethod) {
            case "blw":
                feedingMethodText = "Ăn dặm tự chỉ huy (Baby-Led Weaning - bé tự bốc ăn)";
                feedingGuideline = `
- Bé tự cầm ăn, không cần đút thìa.
- Món ăn cần mềm, dễ cầm, cắt dạng que hoặc khối.
- Tránh món quá nhuyễn hoặc quá nhỏ dễ hóc.
- Thức ăn hấp, luộc, hoặc nướng mềm, không chiên.
`;
                break;

            case "japanese":
                feedingMethodText = "Ăn dặm kiểu Nhật (ăn riêng từng món, vị nhẹ, trình bày đẹp mắt)";
                feedingGuideline = `
- Mỗi bữa gồm nhiều món nhỏ, mỗi món vị riêng nhẹ.
- Không trộn nhiều nguyên liệu, chú trọng trình bày và cân bằng màu sắc.
- Hạn chế nêm mặn, tránh dầu mỡ, cay.
`;
                break;

            default:
                break;
        }

        // --- Hàm parse giá trị dạng "6-8" hoặc "6–8 kg" hoặc chỉ "8" ---
        function parseRange(value, defaultValue = 6) {
            if (!value) return defaultValue;

            // Loại bỏ chữ kg, tháng, dấu cách,...
            const clean = String(value).toLowerCase().replace(/[^\d\.\-\–]/g, "").trim();

            // Nếu là số đơn giản
            if (!isNaN(Number(clean))) return Number(clean);

            // Nếu là khoảng: "6-8", "6–8", "6 - 8"
            const match = clean.match(/(\d+(?:\.\d+)?)[\-\–]+(\d+(?:\.\d+)?)/);
            if (match) {
                const min = parseFloat(match[1]);
                const max = parseFloat(match[2]);
                return (min + max) / 2; // lấy trung bình
            }

            // Không parse được → trả mặc định
            return defaultValue;
        }

        // --- Gọi hàm parse ---
        const parsedAge = parseRange(age, 6);
        const parsedWeight = parseRange(weight, 6);

        // --- Tính năng lượng ước tính ---
        const estimatedCalories = Math.round(parsedWeight * 80);

        // --- Phân tích tình trạng dinh dưỡng ---
        let nutritionComment = "";
        if (parsedWeight < parsedAge - 1) {
            nutritionComment = "→ Bé hơi nhẹ cân, nên bổ sung thực phẩm giàu năng lượng và chất béo tốt.";
        } else if (parsedWeight > parsedAge + 1) {
            nutritionComment = "→ Bé có xu hướng nặng cân, nên ưu tiên món dễ tiêu, ít dầu mỡ.";
        } else {
            nutritionComment = "→ Cân nặng phù hợp với lứa tuổi, duy trì chế độ ăn cân đối.";
        }

        // --- Gợi ý cách mô tả để AI hiểu ---
        let nutritionGuideline = `
Dựa vào thông tin của bé:
- Tháng tuổi: ${age || "6"} → Giai đoạn này nên ${parsedAge < 8
                ? "ăn đồ mềm, nghiền mịn và dễ nuốt"
                : parsedAge < 12
                    ? "bắt đầu làm quen với đồ cắt nhỏ, mềm, dễ nhai"
                    : "ăn được cơm nát và món đa dạng hơn"
            }.
- Cân nặng: ${weight || "6"}→ Ước tính cần khoảng ${estimatedCalories} kcal/ngày. ${nutritionComment}
- Dị ứng: ${allergies?.length ? allergies.join(", ") : "Không có"} → Loại bỏ toàn bộ nguyên liệu này khỏi món ăn.
`;


        if (selectedList?.length) {
            nutritionGuideline += `
- Nguyên liệu sẵn có trong nhà: ${selectedList.join(", ")} → Ưu tiên sử dụng các nguyên liệu này khi tạo thực đơn.
`;
        }

        // --- Prompt AI mở rộng ---
        const prompt = `
Thông tin chi tiết của bé:
${nutritionGuideline}

Phương pháp ăn dặm: ${feedingMethodText}
Hướng dẫn thực đơn theo phương pháp:
${feedingGuideline}

Yêu cầu AI:
- Gợi ý thực đơn ăn dặm cho CHÍNH XÁC 7 ngày, mỗi ngày 2 bữa (sáng và tối).
- Mỗi bữa chỉ cần TÊN MÓN ĂN (và có thể thêm mô tả ngắn về lợi ích hoặc lý do gợi ý).
- Các món ăn phải PHÙ HỢP với:
  1. Tháng tuổi và cân nặng của bé.
  2. Phương pháp ăn dặm.
  3. Dị ứng (tuyệt đối loại trừ các nguyên liệu dị ứng).
  4. Nguyên liệu sẵn có nếu có thể.
- Không lặp lại món trong 7 ngày.
- Không cay, không mặn, không chiên giòn.
- Kết quả PHẢI là JSON hợp lệ TRONG MỘT DÒNG DUY NHẤT.
- Mỗi phần tử có dạng:
  {
    "day": <số ngày>,
    "meals": [
      "Bữa sáng ăn: <tên món> - <mô tả lợi ích ngắn>",
      "Bữa tối ăn: <tên món> - <mô tả lợi ích ngắn>"
    ]
  }
Ví dụ mẫu:
[
  { "day": 1, "meals": ["Bữa sáng ăn: Cháo bí đỏ thịt gà - Giàu vitamin A, dễ tiêu", "Bữa tối ăn: Súp cà rốt thịt bò - Cung cấp sắt và protein"] },
  { "day": 2, "meals": ["Bữa sáng ăn: Cháo cá hồi rau củ - Giàu omega-3 giúp phát triển não", "Bữa tối ăn: Bánh khoai tây hấp - Giúp bé tập nhai"] },
  ...
  { "day": 7, "meals": ["Bữa sáng ăn: Cháo yến mạch táo - Tăng chất xơ", "Bữa tối ăn: Cháo rau dền tôm - Cung cấp canxi và sắt"] }
]
`;

        console.log(prompt);

        let aiText = "";
        let suggestions = [];

        // --- Gọi Gemini API ---
        try {
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }],
            });

            aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (err) {
            console.warn("⚠️ Không thể gọi Gemini, fallback dữ liệu mẫu:", err.message);
            aiText = JSON.stringify([
                { day: 1, meals: ["Bữa sáng ăn Cháo bí đỏ thịt bò", "Bữa tối ăn Súp khoai lang cá hồi"] },
                { day: 2, meals: ["Bữa sáng ăn Cháo cà rốt thịt gà", "Bữa tối ăn Cháo yến mạch chuối"] },
                { day: 3, meals: ["Bữa sáng ăn Cháo rau củ cá thu", "Bữa tối ăn Cháo khoai tây trứng"] },
                { day: 4, meals: ["Bữa sáng ăn Cháo tôm rau dền", "Bữa tối ăn Súp bí xanh"] },
                { day: 5, meals: ["Bữa sáng ăn Cháo cá lóc cà rốt", "Bữa tối ăn Cháo bí đỏ thịt heo"] },
                { day: 6, meals: ["Bữa sáng ăn Cháo yến mạch táo", "Bữa tối ăn Cháo rau bina trứng"] },
                { day: 7, meals: ["Bữa sáng ăn Cháo tôm khoai lang", "Bữa tối ăn Súp rau củ nghiền"] },
            ]);
        }

        // --- Làm sạch và parse dữ liệu ---
        try {
            let cleanedText = aiText
                .replace(/```json|```/gi, "")
                .replace(/[\u200B-\u200D\uFEFF]/g, "")
                .replace(/\r?\n|\r/g, " ")
                .trim();

            const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error("Không tìm thấy JSON trong phản hồi");

            // --- Làm sạch và parse dữ liệu ---
            try {
                let cleanedText = aiText
                    .replace(/```json|```/gi, "")
                    .replace(/[\u200B-\u200D\uFEFF]/g, "")
                    .replace(/\r?\n|\r/g, " ")
                    .replace(/\\n/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                // Xóa các ký tự không hợp lệ trước dấu [ hoặc sau dấu ]
                const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
                if (!jsonMatch) throw new Error("Không tìm thấy JSON trong phản hồi");

                let jsonText = jsonMatch[0];

                // 🧹 Thử làm sạch JSON trước khi parse
                jsonText = jsonText
                    .replace(/,\s*([}\]])/g, "$1") // xóa dấu , thừa trước } hoặc ]
                    .replace(/“|”/g, '"') // thay ngoặc kép kiểu word
                    .replace(/‘|’/g, "'") // thay ngoặc đơn kiểu word
                    .replace(/\s+([}\]])/g, "$1") // xóa khoảng trắng thừa

                try {
                    suggestions = JSON.parse(jsonText);
                } catch (parseErr) {
                    console.warn("⚠️ Parse lần 1 thất bại, thử lần 2 với JSON5-like fix");
                    // Cố gắng "cứu" JSON nếu chỉ sai nhẹ
                    jsonText = jsonText.replace(/(\w+):/g, '"$1":');
                    suggestions = JSON.parse(jsonText);
                }

                if (!Array.isArray(suggestions) || !suggestions.length)
                    throw new Error("Dữ liệu JSON không hợp lệ");

                suggestions = suggestions.slice(0, 7);
            } catch (err) {
                console.warn("⚠️ AI không trả về JSON hợp lệ, fallback sang text parse:", err.message);
                suggestions = Array.from({ length: 7 }).map((_, i) => ({
                    day: i + 1,
                    meals: [
                        `Bữa sáng ăn Món sáng ${i + 1}`,
                        `Bữa tối ăn Món tối ${i + 1}`,
                    ],
                }));
            }


            if (!Array.isArray(suggestions) || !suggestions.length)
                throw new Error("Dữ liệu JSON không hợp lệ");

            suggestions = suggestions.slice(0, 7);
        } catch (err) {
            console.warn("⚠️ AI không trả về JSON hợp lệ, fallback sang text parse:", err.message);
            suggestions = Array.from({ length: 7 }).map((_, i) => ({
                day: i + 1,
                meals: [
                    `Bữa sáng ăn Món sáng ${i + 1}`,
                    `Bữa tối ăn Món tối ${i + 1}`,
                ],
            }));
        }


        // --- Lưu vào QuizSession ---
        // --- Lưu vào QuizSession (sửa lỗi VersionError) ---
        await QuizSession.findByIdAndUpdate(
            session._id,
            {
                $set: {
                    "data.mealSuggestions": suggestions,
                    step: 5,
                },
            },
            { new: true }
        );

        res.json({
            success: true,
            data: {
                menu: suggestions,
                step: 5,
            },
        });
    } catch (error) {
        console.error("❌ Lỗi khi gọi AI gợi ý thực đơn:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// Step 5: Chọn set ăn
exports.step5 = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const { selectedSet } = req.body;
        const set = await Set.findById(selectedSet);
        if (!set) return res.status(404).json({ message: 'Set không tồn tại' });

        const session = await QuizSession.findOne({ sessionId });
        // if (!session || session.step !== 5) return res.status(400).json({ message: 'Bước không hợp lệ' });

        session.data.selectedSet = {
            setId: set._id,
            duration: set.duration,
            price: set.price,
        };
        session.step = 6;
        await session.save();

        res.json({ success: true, data: { step: 6 } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Step 6: Xem tóm tắt
exports.step6 = async (req, res) => {
    try {
        const { sessionId } = req.query;
        if (!sessionId) return res.status(400).json({ message: 'Thiếu sessionId' });

        const session = await QuizSession.findOne({ sessionId }).populate({
            path: 'data.selectedSet.setId',
            model: 'MealSet',
        }).populate({
            path: 'data.selectedProducts',
            populate: { path: 'category' },
        });
        if (!session) return res.status(404).json({ message: 'Session không tồn tại' });

        const { selectedSet, mealSuggestions, age, weight, allergies, feedingMethod, selectedProducts } = session.data;

        if (!selectedSet || !selectedSet.setId) {
            return res.status(400).json({ message: 'Chưa chọn set ăn dặm' });
        }

        if (!mealSuggestions || mealSuggestions.length === 0) {
            return res.status(400).json({ message: 'Chưa có thực đơn gợi ý' });
        }

        // Cập nhật step thành 7 sau khi xác nhận
        session.step = 7;
        await session.save();

        const responseData = {
            childInfo: {
                age: age || 0,
                weight: weight || 0,
                allergies: allergies || [],
                feedingMethod: feedingMethod || 'traditional',
            },
            selectedProducts: selectedProducts?.map(product => ({
                productId: product._id,
                name: product.name,
                category: product.category?.name || 'Không rõ danh mục',
            })) || [],
            selectedSet: {
                setId: selectedSet.setId._id,
                name: selectedSet.setId.title || 'Set không xác định',
                duration: selectedSet.duration || 0,
                price: selectedSet.price || 0,
            },
            suggestedMenu: mealSuggestions,
        };

        res.json({
            success: true,
            data: responseData,
        });
    } catch (error) {
        console.error("❌ Lỗi khi lấy thông tin bước 6:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Step 7: Thanh toán
exports.step7 = async (req, res) => {
    try {
        const { sessionId, deliveryTime, address, phone } = req.body;
        // ==================== ======
        // 1️⃣ Tìm phiên quiz
        // ==========================
        const session = await QuizSession.findOne({ sessionId });
        if (!session)
            return res
                .status(404)
                .json({ success: false, message: "Không tìm thấy phiên quiz" });

        // ==========================
        // 2️⃣ Yêu cầu đăng nhập
        // ==========================
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập để thanh toán",
                redirect:
                    "/login?redirect=/quiz/step7&sessionId=" + sessionId,
            });
        }

        // ==========================
        // 3️⃣ Cập nhật thông tin session
        // ==========================
        session.userId = req.user.id;
        session.data.delivery = {
            time: deliveryTime,
            phone: phone,
            address: {
                address: address.address,
                provinceId: address.provinceId,
                provinceName: address.provinceName,
                districtId: address.districtId,
                districtName: address.districtName,
                wardCode: address.wardCode,
                wardName: address.wardName,
            },
        };
        await session.save();

        // ==========================
        // 4️⃣ Cập nhật hoặc tạo UserProfile cơ bản
        // (chỉ lưu thông tin em bé + địa chỉ, KHÔNG lưu mealSuggestions nữa)
        // ==========================
        let userProfile = await UserProfile.findOne({ accountId: req.user.id });
        if (!userProfile) {
            userProfile = new UserProfile({ accountId: req.user.id });
        }

        userProfile.babyInfo = {
            age: session.data.age || null,
            weight: session.data.weight || null,
            allergies: session.data.allergies || [],
            feedingMethod: session.data.feedingMethod || null,
        };

        if (session.data.delivery?.address) {
            userProfile.address = {
                ...session.data.delivery.address,
                isDefault: true,
            };
        }

        if (session.data.selectedProducts?.length) {
            userProfile.selectedProducts = session.data.selectedProducts;
        }

        await userProfile.save();
        const account = await Account.findById(req.user.id);
        if (account && !account.userInfo) {
            account.userInfo = userProfile._id;
            await account.save();
        }
        // ==========================
        // 5️⃣ Chuẩn bị mealSuggestions cho đơn hàng
        // ==========================
        let mealSuggestions = [];
        if (session.data.mealSuggestions?.length) {
            mealSuggestions = session.data.mealSuggestions.map((m) => ({
                day: m.day,
                menu: m.meals.join(", "),
            }));
        }

        // ==========================
        // 6️⃣ Tạo Order
        // ==========================
        const amount = session.data.selectedSet?.price || 0;

        const order = new Order({
            userId: req.user.id,
            items: [
                {
                    setId: session.data.selectedSet?.setId,
                    duration: session.data.selectedSet?.duration,
                    price: session.data.selectedSet?.price,
                    quantity: 1,
                },
            ],
            total: amount,
            delivery: session.data.delivery,
            mealSuggestions, // ✅ Lưu thực đơn riêng cho đơn hàng này
            paymentStatus: "pending",
        });

        await order.save();

        // ==========================
        // 7️⃣ Tạo link QR Sepay
        // ==========================
        // Ví dụ link: https://qr.sepay.vn/img?acc=VQRQAEQNT2617&bank=MBBank&amount=100000&des=DH102969
        const sepayAccount = process.env.SEPAY_ACC;
        const sepayBank = process.env.SEPAY_BANK;
        const orderCode = "DH" + moment().format("MMDD") + order._id.toString().slice(-6);

        const paymentUrl = `https://qr.sepay.vn/img?acc=${sepayAccount}&bank=${sepayBank}&amount=${amount}&des=${orderCode}`;

        // lưu URL QR để hiển thị sau này (nếu cần)
        order.paymentUrl = paymentUrl;
        order.orderCode = orderCode;
        await order.save();

        // ==========================
        // 8️⃣ Xoá session tạm
        // ==========================
        await session.deleteOne();

        // ==========================
        // ✅ Phản hồi client
        // ==========================
        res.json({
            success: true,
            data: {
                paymentUrl,
                orderId: order._id,
                orderCode,
            },
        });
    } catch (error) {
        console.error("❌ Lỗi khi xử lý thanh toán VNPAY:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getPaymentReturn = async (req, res) => {
    try {
        // ✅ 1. Xác thực API key
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Apikey ')) {
            return res.status(401).json({ message: 'Unauthorized: Missing API key' });
        }

        const apiKey = authHeader.split(' ')[1];
        if (apiKey !== process.env.SEPAY_API_KEY) {
            return res.status(403).json({ message: 'Forbidden: Invalid API key' });
        }

        const data = req.body;

        // ✅ 2. Chỉ xử lý giao dịch tiền vào
        if (data.transferType !== "in") {
            return res.status(200).json({ message: "Bỏ qua giao dịch không hợp lệ." });
        }

        // ✅ 3. Trích xuất mã đơn hàng (orderCode) từ content hoặc description
        const rawText = `${data.content || ""} ${data.description || ""}`;
        const match = rawText.match(/DH\d{4}[a-z0-9]{6}/i); // Tìm mã kiểu DH1018cb85cd
        if (!match) {
            console.warn("⚠️ Không tìm thấy mã đơn hàng trong nội dung:", rawText);
            return res.status(200).json({ message: "Không tìm thấy mã đơn hàng phù hợp trong nội dung chuyển khoản." });
        }

        const orderCode = match[0];
        console.log("✅ Trích xuất orderCode:", orderCode);

        // ✅ 4. Tìm đơn hàng theo orderCode
        const order = await Order.findOne({ orderCode });
        if (!order) {
            console.warn("⚠️ Không tìm thấy đơn hàng với mã:", orderCode);
            return res.status(200).json({ message: "Không tìm thấy đơn hàng phù hợp abc.", orderCode });
        }

        // ✅ 5. Nếu đã thanh toán rồi thì bỏ qua
        if (order.paymentStatus === "completed") {
            return res.status(200).json({ message: "Đơn hàng đã được thanh toán trước đó." });
        }

        // ✅ 6. Kiểm tra số tiền có khớp không
        if (Number(data.transferAmount) < order.total) {
            console.warn("⚠️ Số tiền không khớp:", data.transferAmount, "vs", order.total);
            return res.status(200).json({ message: "Số tiền thanh toán không đủ." });
        }

        // ✅ 7. Cập nhật trạng thái thanh toán
        order.paymentStatus = "completed";
        order.paymentIntentId = data.referenceCode || data.id?.toString();
        await order.save();

        // ✅ 8. Gửi email xác nhận thanh toán
        try {
            const user = await Account.findById(order.userId);
            const item = order.items[0]; // giả sử 1 sản phẩm
            const mealSet = await MealSet.findById(item.setId);

            const itemsHtml = `
        <tr>
          <td style="padding:10px;">${mealSet.title}</td>
          <td style="padding:10px;text-align:center;">${item.quantity}</td>
          <td style="padding:10px;text-align:right;">${(item.price * item.quantity).toLocaleString("vi-VN")} VND</td>
        </tr>`;

            const address = order.delivery?.address || {};
            const shippingInfoStr = `${address.address || ""}, ${address.provinceName || ""}, ${address.districtName || ""}, ${address.wardName || ""}`;

            const info = await sendEmailOAuth(
                user.email,
                {
                    orderId: order._id.toString(),
                    paymentMethod: "Thanh toán trực tuyến",
                    totalAmount: order.total,
                    itemsHtml,
                    shippingInfo: shippingInfoStr,
                },
                "orderConfirmation"
            );
            console.log("📧 Mail sent:", info.messageId);
            console.log(`📧 Email xác nhận thanh toán đã gửi tới ${user.email}`);
        } catch (mailError) {
            console.error("❌ Lỗi gửi email:", mailError);
        }

        // ✅ 9. Phản hồi SEPAY thành công
        res.status(200).json({
            success: true,
            data: {
                message: "Thanh toán thành công",
                orderId: order._id,
                orderCode: order.orderCode
            }
        });
    } catch (error) {
        console.error("❌ Lỗi xử lý webhook SePay:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};
// exports.getPaymentReturn = async (req, res) => {
//     try {
//         let vnp_Params = req.query;
//         const secureHash = vnp_Params["vnp_SecureHash"];
//         const orderId = vnp_Params["vnp_OrderInfo"];

//         // Add await here
//         const order = await Order.findById(orderId)
//         if (!order) {
//             return res.status(404).json({ message: `Order ${orderId} không tồn tại` });
//         }

//         delete vnp_Params["vnp_SecureHash"];
//         delete vnp_Params["vnp_SecureHashType"];

//         vnp_Params = sortObject(vnp_Params);

//         // Kiểm tra chữ ký
//         const signData = qs.stringify(vnp_Params, { encode: false });
//         const hmac = crypto.createHmac("sha512", process.env.VNP_HASHSECRET);

//         const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

//         if (secureHash === signed) {
//             if (vnp_Params["vnp_ResponseCode"] === "00") {
//                 // Update order first
//                 order.paymentStatus = "completed";
//                 await order.save()

//                 // Then send response
//                 return res.status(200).json({ message: "Thanh toán thành công!", status: "success" });

//             } else {
//                 return res.status(400).json({ message: "Thanh toán thất bại!", status: "fail" });
//             }
//         } else {
//             return res.status(400).json({ message: "Sai chữ ký bảo mật!" });
//         }
//     } catch (error) {
//         return res.status(500).json({ message: "Lỗi server!", error: error.message });
//     }
// };


// Thêm vào cuối QuizController.js
exports.getStepData = async (req, res) => {
    try {
        const { step } = req.params;
        const { sessionId } = req.query;

        const session = await QuizSession.findOne({ sessionId });
        if (!session) return res.status(404).json({ message: 'Session không tồn tại' });

        let data = {};
        switch (parseInt(step)) {
            case 1:
                data = { age: session.data.age, weight: session.data.weight, allergies: session.data.allergies };
                break;
            case 2:
                data = { feedingMethod: session.data.feedingMethod };
                break;
            case 3:
                data = { selectedProducts: session.data.selectedProducts };
                break;
            case 4:
                data = { mealSuggestions: session.data.mealSuggestions };
                break;
            case 5:
                data = { selectedSet: session.data.selectedSet };
                break;
            case 6:
                data = { selectedSet: session.data.selectedSet, mealSuggestions: session.data.mealSuggestions };
                break;
            default:
                return res.status(400).json({ message: 'Bước không hợp lệ' });
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error('Lỗi lấy dữ liệu bước:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getQuizSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu sessionId trong yêu cầu.",
            });
        }

        // 🔍 Tìm session trong DB
        const session = await QuizSession.findOne({ sessionId });

        // ❌ Không tìm thấy session (MongoDB có thể đã tự xóa nếu hết hạn)
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Quiz session không tồn tại hoặc đã hết hạn.",
            });
        }

        // ✅ Trả về dữ liệu hợp lệ
        return res.status(200).json({
            success: true,
            data: {
                sessionId: session.sessionId,
                step: session.step,
                userId: session.userId,
                data: session.data,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt,
            },
        });
    } catch (error) {
        console.error("❌ Lỗi khi lấy quiz session:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi lấy quiz session.",
            error: error.message,
        });
    }
};
exports.getMealSuggestions = async (req, res) => {
    try {
        const { profile } = req.body;
        const sessionId = req.body.sessionId || req.query.sessionId; // Lấy sessionId từ body hoặc query

        if (!profile || !sessionId) {
            return res.status(400).json({ error: "Vui lòng cung cấp thông tin hồ sơ trẻ và sessionId." });
        }

        const session = await QuizSession.findOne({ sessionId });
        if (!session) return res.status(404).json({ error: "Session không tồn tại." });

        // Lấy danh sách sản phẩm (nếu có selectedProducts)
        let selectedList = [];
        if (profile.selectedProducts?.length) {
            const products = await Product.find({ _id: { $in: profile.selectedProducts } });
            selectedList = products.map(p => `- ${p.name} (${p.category?.name || "Không rõ danh mục"})`);
        }

        // Tạo prompt AI
        const prompt = `
Thông tin trẻ:
- Tháng tuổi: ${profile.monthAge || session.data.age}
- Cân nặng: ${profile.weight || session.data.weight} kg
- Phương pháp ăn dặm: ${profile.method || session.data.feedingMethod}
- Dị ứng: ${profile.allergies?.length ? profile.allergies.join(", ") : session.data.allergies?.length ? session.data.allergies.join(", ") : "Không có"}
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


        let aiText = "";
        let suggestions = [];

        // --- Gọi Gemini API ---
        try {
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

            const result = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }],
            });

            aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (err) {
            console.warn("⚠️ Không thể gọi Gemini, fallback dữ liệu mẫu:", err.message);
            aiText = JSON.stringify([
                { day: 1, menu: "Cháo bí đỏ thịt gà", reason: "Dễ tiêu, giàu vitamin A" },
                { day: 2, menu: "Cháo cà rốt cá hồi", reason: "Giàu omega-3, phát triển não" },
                { day: 3, menu: "Súp khoai lang nghiền", reason: "Giúp bé dễ tiêu hóa" },
                { day: 4, menu: "Cháo yến mạch chuối", reason: "Ngủ ngon và nhiều năng lượng" },
                { day: 5, menu: "Cháo rau củ thịt bò", reason: "Cung cấp sắt và chất xơ" },
                { day: 6, menu: "Bánh khoai tây hấp trứng", reason: "Giàu protein và xơ" },
                { day: 7, menu: "Cháo bí xanh tôm", reason: "Giúp mát gan, dễ ăn" },
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

        // --- Lưu vào QuizSession (nếu chưa có userId) ---
        session.data.mealSuggestions = suggestions;
        await session.save();

        // --- Nếu đã đăng nhập, cập nhật UserProfile ---
        if (req.user?._id) {
            await UserProfile.findOneAndUpdate(
                { accountId: req.user._id },
                { mealSuggestions: suggestions },
                { new: true, upsert: true }
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

// Lấy danh sách category và product
exports.getCategoriesAndProducts = async (req, res) => {
    try {
        const categories = await Category.find();
        const products = await Product.find({ isActive: true }).populate('category');
        res.json({ success: true, data: { categories, products } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy danh sách set
exports.getSets = async (req, res) => {
    try {
        const sets = await Set.find();
        res.json({ success: true, data: sets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy danh sách order
exports.getOrders = async (req, res) => {
    try {
        const { userId } = req.user;
        const orders = await Order.find({ userId }).populate('items.setId');
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
