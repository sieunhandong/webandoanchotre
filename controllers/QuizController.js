const QuizSession = require('../models/QuizSession');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Set = require('../models/MealSet');
const Order = require('../models/Order');
const UserProfile = require('../models/UserProfile');
const Account = require('../models/Account');
const { v4: uuidv4 } = require('uuid');
const dotenv = require("dotenv");
const crypto = require("crypto");
const qs = require("qs");
const moment = require("moment");
dotenv.config();


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
                (p) => `- ${p.name} (${p.category?.name || "Không rõ danh mục"})`
            );
        }

        // --- Prompt mới, thêm “Bữa sáng ăn...” và “Bữa tối ăn...” ---
        const prompt = `
Thông tin trẻ:
- Tháng tuổi: ${age || 0}
- Cân nặng: ${weight || 0} kg
- Phương pháp ăn dặm: ${feedingMethod || "traditional"}
- Dị ứng: ${allergies?.length ? allergies.join(", ") : "Không có"}
- Nguyên liệu sẵn có: ${selectedList.length ? selectedList.join(", ") : "Chưa chọn"}

Yêu cầu:
- Hãy gợi ý thực đơn ăn dặm cho CHÍNH XÁC 7 ngày, mỗi ngày 2 bữa (sáng và tối).
- Mỗi bữa chỉ cần tên món ăn, KHÔNG cần lý do.
- Loại bỏ nguyên liệu có trong danh sách dị ứng.
- ƯU TIÊN sử dụng các nguyên liệu trong “Nguyên liệu sẵn có”.
- Kết quả PHẢI là JSON hợp lệ TRONG MỘT DÒNG DUY NHẤT.
- Trong mảng "meals", mỗi phần tử phải có định dạng:
  "Bữa sáng ăn <tên món>", "Bữa tối ăn <tên món>"
- Ví dụ mẫu:
[
  { "day": 1, "meals": ["Bữa sáng ăn Cháo bí đỏ thịt gà", "Bữa tối ăn Súp cà rốt thịt bò"] },
  { "day": 2, "meals": ["Bữa sáng ăn Cháo cá hồi rau củ", "Bữa tối ăn Bánh khoai tây hấp"] },
  ...
  { "day": 7, "meals": ["Bữa sáng ăn Cháo yến mạch táo", "Bữa tối ăn Cháo rau dền tôm"] }
]
`;


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

            const jsonText = jsonMatch[0];
            suggestions = JSON.parse(jsonText);

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
        session.data.mealSuggestions = suggestions;
        session.markModified("data.mealSuggestions");
        session.step = 5;

        const savedSession = await session.save();

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

const sortObject = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
    }
    return sorted;
};
exports.step7 = async (req, res) => {
    try {
        const { sessionId, deliveryTime, address } = req.body;

        // ==========================
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
            age: Number(session.data.age) || null,
            weight: Number(session.data.weight) || null,
            allergies: session.data.allergies || [],
            feedingMethod: session.data.feedingMethod || "traditional",
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
        const sepayAccount = process.env.SEPAY_ACC || "VQRQAEQNT2617";
        const sepayBank = process.env.SEPAY_BANK || "MBBank";
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
        const data = req.body;

        console.log("📩 Webhook SePay nhận:", data);

        // ✅ 1. Chỉ xử lý giao dịch tiền vào
        if (data.transferType !== "in") {
            return res.status(200).json({ message: "Bỏ qua giao dịch không hợp lệ." });
        }

        // ✅ 2. Lấy nội dung chuyển khoản (VD: "DH102969")
        const transferContent = (data.content || "").trim().toUpperCase();

        if (!transferContent) {
            return res.status(400).json({ message: "Thiếu nội dung giao dịch." });
        }

        // ✅ 3. Tìm đơn hàng có mã tương ứng
        const order = await Order.findOne({ orderCode: transferContent });

        if (!order) {
            console.warn("⚠️ Không tìm thấy đơn hàng cho nội dung:", transferContent);
            return res.status(200).json({ message: "Không tìm thấy đơn hàng phù hợp." });
        }

        // ✅ 4. Nếu đã thanh toán thì bỏ qua
        if (order.paymentStatus === "completed") {
            return res.status(200).json({ message: "Đơn hàng đã được thanh toán trước đó." });
        }

        // ✅ 5. Kiểm tra số tiền có khớp không
        if (Number(data.transferAmount) < order.total) {
            console.warn("⚠️ Số tiền không khớp:", data.transferAmount, "vs", order.total);
            return res.status(200).json({ message: "Số tiền thanh toán không đủ." });
        }

        // ✅ 6. Cập nhật trạng thái thanh toán
        order.paymentStatus = "completed";
        order.status = "completed";
        order.paymentIntentId = data.referenceCode || data.id?.toString();
        await order.save();

        console.log(`✅ Đơn hàng ${order.orderCode} đã thanh toán thành công.`);

        // ✅ 7. Phản hồi cho SePay
        res.status(200).json({ message: "Cập nhật thanh toán thành công." });
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

exports.vnpayIpnCallback = async (req, res) => {
    try {
        const vnp_Params = req.body;
        const secureHash = vnp_Params["vnp_SecureHash"];
        const txnRef = vnp_Params["vnp_TxnRef"]; // Lấy vnp_TxnRef
        const orderId = txnRef.split("_")[1]; // Trích xuất orderId

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ RspCode: '01', Message: 'Order không tồn tại' });
        }

        delete vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHashType"];

        vnp_Params = sortObject(vnp_Params);

        const signData = qs.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", process.env.VNP_HASHSECRET);
        const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

        if (secureHash === signed) {
            if (vnp_Params["vnp_ResponseCode"] === "00") {
                order.status = 'completed';
                order.vnpayResponseCode = vnp_Params["vnp_ResponseCode"];
                order.vnpayTransactionNo = vnp_Params["vnp_TransactionNo"];
                await order.save();
                console.log("✅ Thanh toán thành công:", orderId);
            } else {
                order.status = 'cancelled';
                order.vnpayResponseCode = vnp_Params["vnp_ResponseCode"];
                await order.save();
                console.log("❌ Thanh toán thất bại:", orderId, "Mã lỗi:", vnp_Params["vnp_ResponseCode"]);
            }
            res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
        } else {
            console.error("❌ Chữ ký VNPAY không hợp lệ");
            res.status(400).json({ RspCode: '97', Message: 'Invalid signature' });
        }
    } catch (error) {
        console.error("❌ Lỗi IPN VNPAY:", error);
        res.status(500).json({ RspCode: '99', Message: 'System error' });
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

// Mua lại order
exports.rebuyOrder = async (req, res) => {
    try {
        const { userId } = req.user;
        const { orderId } = req.body;
        const order = await Order.findOne({ _id: orderId, userId }).populate('items.setId');
        if (!order) return res.status(404).json({ message: 'Order không tồn tại' });

        const newOrderData = {
            userId,
            items: order.items.map(item => ({
                setId: item.setId._id,
                duration: item.duration,
                price: item.price,
                quantity: 1,
            })),
            total: order.items.reduce((sum, item) => sum + item.price, 0),
            status: 'pending',
        };

        const newOrder = new Order(newOrderData);
        await newOrder.save();

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: newOrderData.total * 100,
            currency: 'vnd',
            metadata: { orderId: newOrder._id.toString() },
        });

        newOrder.paymentIntentId = paymentIntent.id;
        await newOrder.save();

        res.json({
            success: true,
            data: { clientSecret: paymentIntent.client_secret, orderId: newOrder._id },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};