const axios = require("axios");

const verifyEmail = async (email) => {
    try {
        const apiKey = process.env.ABSTRACT_API_KEY;
        if (!apiKey) {
            console.error("❌ ABSTRACT_API_KEY chưa được cấu hình trong .env");
            return false;
        }

        const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${email}`;
        const response = await axios.get(url);

        return response.data.deliverability === "DELIVERABLE";
    } catch (error) {
        console.error("❌ Lỗi verifyEmail:", error.response?.data || error.message);
        return false; // fallback: coi như email không hợp lệ
    }
};

module.exports = verifyEmail;
