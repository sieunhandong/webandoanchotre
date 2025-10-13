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
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Step 1: Nhập tháng tuổi, cân nặng, dị ứng
exports.step1 = async (req, res) => {
    try {
        const { sessionId } = req.body;
        console.log(req.body);
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
            path: 'data.selectedProducts',
            populate: { path: 'category' },
        });
        // if (!session || session.step !== 4) return res.status(400).json({ message: 'Bước không hợp lệ' });

        // Lấy thông tin từ session
        const { age, weight, allergies, feedingMethod, selectedProducts } = session.data;
        let selectedList = [];
        if (selectedProducts?.length) {
            const products = await Product.find({ _id: { $in: selectedProducts } });
            selectedList = products.map(p => `- ${p.name} (${p.category?.name || "Không rõ danh mục"})`);
        }

        // Tạo prompt AI với yêu cầu rõ ràng hơn
        const prompt = `
Thông tin trẻ:
- Tháng tuổi: ${age || 0}
- Cân nặng: ${weight || 0} kg
- Phương pháp ăn dặm: ${feedingMethod || 'traditional'}
- Dị ứng: ${allergies?.length ? allergies.join(", ") : "Không có"}
- Nguyên liệu sẵn có: ${selectedList.length ? selectedList.join(", ") : "Chưa chọn"}

Yêu cầu:
- Hãy gợi ý thực đơn ăn dặm cho CHÍNH XÁC 7 ngày dựa trên thông tin trên.
- Mỗi ngày 1 bữa chính, mô tả món và lý do tại sao phù hợp.
- Loại bỏ nguyên liệu có trong danh sách dị ứng.
- ƯU TIÊN SỬ DỤNG CÁC NGUYÊN LIỆU TRONG 'NGUYÊN LIỆU SẴN CÓ'. Nếu không đủ, có thể bổ sung các nguyên liệu an toàn khác phù hợp với phương pháp ăn dặm và thông tin trẻ.
- Kết quả PHẢI là một chuỗi JSON hợp lệ TRONG MỘT DÒNG DUY NHẤT, KHÔNG CÓ VĂN BẢN THỪA, KHÔNG XUỐNG DÒNG.
- Định dạng: 
[
  { "day": 1, "menu": "Cháo bí đỏ nấu thịt gà", "reason": "Giúp bổ sung vitamin A, dễ tiêu hóa" },
  { "day": 2, "menu": "Cháo cà rốt cá hồi", "reason": "Giàu omega-3, phát triển não" },
  { "day": 3, "menu": "Súp khoai lang nghiền", "reason": "Giúp bé dễ tiêu hóa" },
  { "day": 4, "menu": "Cháo yến mạch chuối", "reason": "Ngủ ngon và nhiều năng lượng" },
  { "day": 5, "menu": "Cháo rau củ thịt bò", "reason": "Cung cấp sắt và chất xơ" },
  { "day": 6, "menu": "Bánh khoai tây hấp trứng", "reason": "Giàu protein và xơ" },
  { "day": 7, "menu": "Cháo bí xanh tôm", "reason": "Giúp mát gan, dễ ăn" }
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
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }],
            });

            aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
            console.log("✅ AI Response:\n", aiText);
        } catch (err) {
            console.warn("⚠️ Không thể gọi Gemini, fallback dữ liệu mẫu:", err.message);
            aiText = JSON.stringify([
                { day: 1, menu: "Cháo bí đỏ thịt bò", reason: "Dễ tiêu, giàu vitamin A (fallback)" },
                { day: 2, menu: "Cháo khoai lang cá thu", reason: "Giàu omega-3, phát triển não (fallback)" },
                { day: 3, menu: "Súp bí xanh nghiền", reason: "Giúp bé dễ tiêu hóa (fallback)" },
                { day: 4, menu: "Cháo yến mạch táo", reason: "Ngủ ngon và nhiều năng lượng (fallback)" },
                { day: 5, menu: "Cháo rau bina thịt lợn", reason: "Cung cấp sắt và chất xơ (fallback)" },
                { day: 6, menu: "Bánh khoai tây hấp", reason: "Giàu xơ (fallback)" },
                { day: 7, menu: "Cháo mồng tơi tôm", reason: "Giúp mát gan, dễ ăn (fallback)" },
            ]);
        }

        // --- Xử lý dữ liệu trả về ---
        try {
            // Sử dụng regex để trích xuất JSON hợp lệ
            const jsonMatch = aiText.match(/\[[\s\S]*?\]/); // Lấy toàn bộ nội dung trong dấu []
            if (jsonMatch) {
                const jsonText = jsonMatch[0].replace(/\s+/g, ' ').trim(); // Loại bỏ khoảng trắng thừa
                suggestions = JSON.parse(jsonText);
                // Đảm bảo chỉ lấy 7 ngày
                if (suggestions.length > 7) suggestions = suggestions.slice(0, 7);
            } else {
                throw new Error("Không tìm thấy JSON hợp lệ");
            }
        } catch (e) {
            console.warn("⚠️ AI không trả về JSON hợp lệ, fallback sang text parse:", e.message);
            suggestions = aiText.split("\n").map((line, i) => ({
                day: i + 1,
                menu: line.trim() || `Món ăn ngày ${i + 1} (fallback)`,
                reason: "Không rõ lý do",
            })).slice(0, 7); // Chỉ lấy 7 ngày
        }
        console.log("✅ Suggested menu before save:\n", suggestions);

        // --- Lưu vào QuizSession ---
        session.data.mealSuggestions = suggestions; // Gán dữ liệu
        session.markModified('data.mealSuggestions'); // Đánh dấu thay đổi trong nested object
        session.step = 5;
        const savedSession = await session.save(); // Lưu và lấy lại session
        console.log("✅ Session saved successfully. Saved mealSuggestions:", savedSession.data.mealSuggestions);

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
        console.log(req.body, selectedSet);
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
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        console.error('sortObject: Input is not a valid object', obj);
        return {};
    }

    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
    }
    return sorted;
};
exports.step7 = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const { deliveryTime, address } = req.body;

        let session = await QuizSession.findOne({ sessionId });
        // if (!session || session.step !== 7) return res.status(400).json({ message: 'Bước không hợp lệ' });

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để thanh toán', redirect: '/login?redirect=/quiz/step7&sessionId=' + sessionId });
        }

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

        // Tính tổng tiền chỉ dựa trên giá của selectedSet
        let amount = session.data.selectedSet.price || 0;

        const orderData = {
            userId: session.userId,
            quizSessionId: session._id,
            items: [{
                setId: session.data.selectedSet.setId,
                duration: session.data.selectedSet.duration,
                price: session.data.selectedSet.price,
                quantity: 1,
            }],
            total: amount,
            delivery: session.data.delivery,
            status: 'pending',
        };

        const order = new Order(orderData);
        await order.save();

        const account = await Account.findById(req.user.userId);
        if (account && !account.userInfo) {
            const userProfile = await UserProfile.findOne({ accountId: req.user.userId }) || new UserProfile({ accountId: req.user.userId });
            if (!userProfile.address.address) {
                userProfile.address = {
                    address: address.address,
                    provinceId: address.provinceId,
                    provinceName: address.provinceName,
                    districtId: address.districtId,
                    districtName: address.districtName,
                    wardCode: address.wardCode,
                    wardName: address.wardName,
                };
            }
            if (session.data.mealSuggestions) {
                userProfile.mealSuggestions = session.data.mealSuggestions;
            }
            await userProfile.save();
            account.userInfo = userProfile._id;
            await account.save();
        }

        // Tạo URL thanh toán VNPAY
        let ipAddr = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || '127.0.0.1';
        let vnp_Params = {
            vnp_Version: "2.1.0",
            vnp_Command: "pay",
            vnp_TmnCode: process.env.VNP_TMNCODE,
            vnp_Locale: "vn",
            vnp_CurrCode: "VND",
            vnp_TxnRef: moment().format("YYYYMMDDHHmmss") + "_" + order._id, // Mã giao dịch duy nhất
            vnp_OrderInfo: `Thanh toan don hang ${order._id}`,
            vnp_OrderType: "other",
            vnp_Amount: Math.round(amount) * 100, // Convert VND to VNPAY format
            vnp_ReturnUrl: process.env.VNP_RETURNURL,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: moment().format("YYYYMMDDHHmmss"),
        };

        vnp_Params = sortObject(vnp_Params);

        // Tạo chữ ký bảo mật
        const signData = qs.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", process.env.VNP_HASHSECRET);
        const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
        vnp_Params["vnp_SecureHash"] = signed;

        // Tạo link thanh toán
        const paymentUrl = `${process.env.VNP_URL}?${qs.stringify(vnp_Params, { encode: false })}`;

        // Lưu URL thanh toán vào Order
        order.vnpayPaymentUrl = paymentUrl;
        await order.save();

        await session.deleteOne();

        res.json({
            success: true,
            data: {
                paymentUrl: paymentUrl, // URL để redirect đến VNPAY (hiển thị QR)
                orderId: order._id
            },
        });
    } catch (error) {
        console.error("❌ Lỗi khi xử lý thanh toán VNPAY:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

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

exports.getPaymentReturn = async (req, res) => {
    try {
        let vnp_Params = req.query;
        const secureHash = vnp_Params["vnp_SecureHash"];
        const txnRef = vnp_Params["vnp_TxnRef"]; // Lấy vnp_TxnRef

        // Trích xuất orderId từ vnp_TxnRef (phần sau dấu "_")
        const orderId = txnRef.split("_")[1];

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: `Order ${orderId} không tồn tại` });
        }

        delete vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHashType"];

        vnp_Params = sortObject(vnp_Params);

        // Kiểm tra chữ ký
        const signData = qs.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", process.env.VNP_HASHSECRET);
        const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

        if (secureHash === signed) {
            if (vnp_Params["vnp_ResponseCode"] === "00") {
                order.status = "completed";
                await order.save();

                return res.status(200).json({ message: "Thanh toán thành công!", status: "success" });
            } else {
                return res.status(400).json({ message: "Thanh toán thất bại!", status: "fail" });
            }
        } else {
            return res.status(400).json({ message: "Sai chữ ký bảo mật!" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server!", error: error.message });
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

        console.log("⚙️ Prompt gửi AI:\n", prompt);

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