require('dotenv').config();
const Book = require('../models/Book');

const getSuggestions = async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: "Vui lòng cung cấp từ khóa tìm kiếm" });
    }

    const lowerMsg = query.toLowerCase();

    // Xử lý xã giao
    if (["cảm ơn", "thank", "thanks"].some(word => lowerMsg.includes(word))) {
        return res.json({ reply: "Không có gì, rất vui được giúp bạn!" });
    }

    if (["chào", "hi", "hello", "xin chào"].some(word => lowerMsg.includes(word))) {
        return res.json({ reply: "Chào bạn! Bạn muốn tìm sách gì hôm nay?" });
    }

    try {
        // Danh sách từ khóa cho câu hỏi chung chung
        const genericKeywords = ["sách hay", "gợi ý sách", "có sách nào", "sách gì", "sách nổi bật", "sách phổ biến"];
        const isGenericQuery = genericKeywords.some(keyword => lowerMsg.includes(keyword));

        let searchTerm = lowerMsg;
        let books = [];

        // Lấy danh sách sách từ DB
        const allBooks = await Book.find({ isActivated: true }).populate('categories');

        if (!allBooks.length) {
            return res.json({ reply: "Hiện chưa có sách nào để gợi ý." });
        }

        // Tạo danh sách sách đầy đủ
        const bookList = allBooks.map(book => ({
            _id: book._id,
            title: book.title,
            author: book.author,
            genre: book.genre,
            price: book.price,
            cover: book.cover || 'Không rõ',
            language: book.language || 'Không rõ',
            description: book.description,
            minAge: book.minAge || 'Không giới hạn',
            totalPage: book.totalPage || 'Không rõ',
            dimensions: book.dimensions || 'Không rõ',
            images: book.images[0] || null
        }));

        // Xử lý câu hỏi chung chung
        if (isGenericQuery) {
            const prompt = `
Danh sách sách hiện có:
${bookList.map(book => `- Tiêu đề: ${book.title}, Tác giả: ${book.author}, Thể loại: ${book.genre}, Giá: ${book.price}₫, Mô tả: ${book.description}`).join('\n')}

Khách hàng hỏi: "${query}"

Đây là một câu hỏi chung chung. Hãy gợi ý 1-3 cuốn sách phổ biến hoặc nổi bật nhất từ danh sách. 
Chỉ trả về tiêu đề của các sách phù hợp (mỗi tiêu đề trên một dòng).
Cung cấp lý do tại sao bạn chọn các sách này trong một đoạn văn bản riêng, bắt đầu bằng "Lý do:".
Nếu không có sách nào phù hợp, trả về: "Không tìm thấy sách phù hợp."
Hãy hỏi lại khách hàng về sở thích cụ thể (thể loại, tác giả, v.v.) trong phần lý do nếu phù hợp.
            `;

            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

            const result = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            });

            const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "Không tìm thấy sách phù hợp.";

            // Phân tích phản hồi từ AI
            const lines = aiResponse.split('\n').filter(line => line.trim());
            let suggestedTitles = [];
            let reason = '';

            if (lines[0].startsWith('Không tìm thấy')) {
                return res.json({ reply: aiResponse, books: [] });
            }

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('Lý do:')) {
                    reason = lines.slice(i).join('\n') + '\nBạn có thể cho tôi biết thêm về thể loại hoặc tác giả bạn thích không?';
                    break;
                }
                suggestedTitles.push(lines[i].trim());
            }

            // Lọc danh sách sách chỉ giữ lại các sách có tiêu đề khớp với gợi ý
            const filteredBooks = bookList.filter(book => suggestedTitles.includes(book.title));

            return res.json({
                reply: reason || "Đây là các sách phổ biến được gợi ý cho bạn.",
                books: filteredBooks
            });
        }

        // Xử lý câu hỏi cụ thể
        if (lowerMsg.includes("tìm") || lowerMsg.includes("sách")) {
            const genreMatch = lowerMsg.match(/thể loại\s*([\w\s]+)/i) || lowerMsg.match(/genre\s*([\w\s]+)/i);
            if (genreMatch) {
                searchTerm = genreMatch[1].trim();
            }
            const authorMatch = lowerMsg.match(/tác giả là\s*([\w\s]+)/i) || lowerMsg.match(/của\s*([\w\s]+)/i);
            if (authorMatch) {
                searchTerm = authorMatch[1].trim();
            } else {
                const lastPart = lowerMsg.split(/tìm|sách/).pop()?.trim();
                if (lastPart && lastPart.length > 0) {
                    searchTerm = lastPart;
                }
            }
        }

        // Tìm kiếm sách dựa trên title, author, genre, hoặc description
        books = await Book.find({
            $and: [
                { isActivated: true },
                {
                    $or: [
                        { title: { $regex: searchTerm, $options: 'i' } },
                        { author: { $regex: searchTerm, $options: 'i' } },
                        { genre: { $regex: searchTerm, $options: 'i' } },
                        { description: { $regex: searchTerm, $options: 'i' } }
                    ]
                }
            ]
        }).populate('categories');

        if (books.length === 0) {
            return res.json({ reply: `Xin lỗi, hiện tại không tìm thấy sách phù hợp với "${searchTerm}". Bạn có thể thử từ khóa khác hoặc cho tôi biết thể loại bạn thích!` });
        }

        // Cập nhật bookList chỉ với sách từ truy vấn
        const filteredBookList = books.map(book => ({
            _id: book._id,
            title: book.title,
            author: book.author,
            genre: book.genre,
            price: book.price,
            cover: book.cover || 'Không rõ',
            language: book.language || 'Không rõ',
            description: book.description,
            minAge: book.minAge || 'Không giới hạn',
            totalPage: book.totalPage || 'Không rõ',
            dimensions: book.dimensions || 'Không rõ',
            images: book.images[0] || null
        }));

        const prompt = `
Danh sách sách hiện có:
${filteredBookList.map(book => `- Tiêu đề: ${book.title}, Tác giả: ${book.author}, Thể loại: ${book.genre}, Giá: ${book.price}₫, Mô tả: ${book.description}`).join('\n')}

Khách hàng hỏi: "${query}"

Dựa trên danh sách, hãy gợi ý 1-3 cuốn sách phù hợp nhất với yêu cầu của khách hàng (thể loại hoặc tác giả). 
Chỉ trả về tiêu đề của các sách phù hợp (mỗi tiêu đề trên một dòng).
Cung cấp lý do tại sao bạn chọn các sách này trong một đoạn văn bản riêng, bắt đầu bằng "Lý do:".
Nếu không có sách nào phù hợp, trả về: "Không tìm thấy sách phù hợp."
        `;

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

        const result = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        });

        const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "Không tìm thấy sách phù hợp.";

        // Phân tích phản hồi từ AI
        const lines = aiResponse.split('\n').filter(line => line.trim());
        let suggestedTitles = [];
        let reason = '';

        if (lines[0].startsWith('Không tìm thấy')) {
            return res.json({ reply: aiResponse, books: [] });
        }

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('Lý do:')) {
                reason = lines.slice(i).join('\n');
                break;
            }
            suggestedTitles.push(lines[i].trim());
        }

        // Lọc danh sách sách chỉ giữ lại các sách có tiêu đề khớp với gợi ý
        const filteredBooks = filteredBookList.filter(book => suggestedTitles.includes(book.title));

        return res.json({
            reply: reason || "Đây là các sách phù hợp với yêu cầu của bạn.",
            books: filteredBooks
        });
    } catch (error) {
        console.error("Lỗi khi gọi Gemini API:", error);
        res.status(500).json({ error: "Đã có lỗi xảy ra, vui lòng thử lại sau!" });
    }
};

const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Vui lòng cung cấp hình ảnh" });
        }

        const imageBuffer = req.file.buffer;

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

        const visionResult = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{
                role: "user",
                parts: [
                    {
                        text: "Mô tả nội dung ảnh này, tập trung vào sản phẩm (sách), màu sắc, kiểu dáng, và bất kỳ chi tiết nào có thể liên quan đến sách (ví dụ: bìa cứng/mềm, tiêu đề, tác giả nếu nhìn thấy):"
                    },
                    { inlineData: { mimeType: req.file.mimetype, data: imageBuffer.toString("base64") } }
                ]
            }]
        });

        const imageDescription = visionResult.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Không thể phân tích được nội dung ảnh.";

        const books = await Book.find({
            isActivated: true
        }).populate('categories');

        if (!books.length) {
            return res.json({ reply: "Hiện chưa có sách nào để gợi ý." });
        }

        const bookList = books.map(book => ({
            _id: book._id,
            title: book.title,
            author: book.author,
            genre: book.genre,
            price: book.price,
            cover: book.cover || 'Không rõ',
            language: book.language || 'Không rõ',
            description: book.description,
            minAge: book.minAge || 'Không giới hạn',
            totalPage: book.totalPage || 'Không rõ',
            dimensions: book.dimensions || 'Không rõ',
            images: book.images[0] || null
        }));

        const matchPrompt = `
Danh sách sách hiện có:
${bookList.map(book => `- Tiêu đề: ${book.title}, Tác giả: ${book.author}, Thể loại: ${book.genre}, Giá: ${book.price}₫, Loại bìa: ${book.cover || 'Không rõ'}, Ngôn ngữ: ${book.language || 'Không rõ'}, Mô tả: ${book.description}, Độ tuổi tối thiểu: ${book.minAge || 'Không giới hạn'}, Số trang: ${book.totalPage || 'Không rõ'}, Kích thước: ${book.dimensions || 'Không rõ'}`).join('\n')}

Mô tả sản phẩm từ hình ảnh: "${imageDescription}"

Hãy gợi ý 1-3 cuốn sách phù hợp nhất với mô tả từ hình ảnh. 
Chỉ trả về tiêu đề của các sách phù hợp (mỗi tiêu đề trên một dòng).
Cung cấp lý do tại sao bạn chọn các sách này trong một đoạn văn bản riêng, bắt đầu bằng "Lý do:".
Nếu không có sách nào phù hợp, trả về: "Không tìm thấy sách phù hợp."
        `;

        const result = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: "user", parts: [{ text: matchPrompt }] }]
        });

        const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Không tìm thấy sách phù hợp.";

        const lines = aiResponse.split('\n').filter(line => line.trim());
        let suggestedTitles = [];
        let reason = '';

        if (lines[0].startsWith('Không tìm thấy')) {
            return res.json({ reply: aiResponse, books: [] });
        }

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('Lý do:')) {
                reason = lines.slice(i).join('\n');
                break;
            }
            suggestedTitles.push(lines[i].trim());
        }

        const filteredBooks = bookList.filter(book => suggestedTitles.includes(book.title));

        return res.json({
            reply: reason || "Đây là các sách phù hợp với mô tả hình ảnh.",
            books: filteredBooks
        });
    } catch (err) {
        console.error("Lỗi khi xử lý ảnh:", err);
        res.status(500).json({ error: "Đã có lỗi xảy ra khi xử lý ảnh, vui lòng thử lại sau!" });
    }
};

module.exports = {
    getSuggestions,
    uploadImage
};