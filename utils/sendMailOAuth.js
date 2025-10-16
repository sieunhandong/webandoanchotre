const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Đọc file HTML template
const templatePath = path.join(process.cwd(), "utils", "otpTemplate.html");
const emailTemplate = fs.readFileSync(templatePath, "utf8");

const orderTemplatePath = path.join(process.cwd(), "utils", "orderTemplate.html");
const orderTemplate = fs.readFileSync(orderTemplatePath, "utf8");

// Thông tin OAuth2
const CLIENT_ID = process.env.GG_CLIENT_ID;
const CLIENT_SECRET = process.env.GG_CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const USER_EMAIL = process.env.EMAIL_USER;

// Cấu hình OAuth2 client
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const sendEmailOAuth = async (email, data, type) => {
    try {
        // Lấy access token mới mỗi khi gửi email
        const accessToken = await oAuth2Client.getAccessToken();

        // Tạo transporter dùng OAuth2
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: USER_EMAIL,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken?.token,
            },
        });

        // Chọn nội dung email
        let emailHtml, subject;
        if (type === "register") {
            emailHtml = emailTemplate
                .replace("{{OTP}}", data)
                .replace("{{TITLE}}", "Xác nhận đăng ký tài khoản");
            subject = "Xác nhận đăng ký - Mã OTP của bạn";
        } else if (type === "reset-password") {
            emailHtml = emailTemplate
                .replace("{{OTP}}", data)
                .replace("{{TITLE}}", "Xác nhận đặt lại mật khẩu");
            subject = "Xác nhận đặt lại mật khẩu - Mã OTP của bạn";
        } else if (type === "orderConfirmation") {
            emailHtml = orderTemplate
                .replace("{{ORDER_ID}}", data.orderId)
                .replace("{{PAYMENT_METHOD}}", data.paymentMethod)
                .replace("{{TOTAL_AMOUNT}}", data.totalAmount.toLocaleString("vi-VN"))
                .replace("{{ITEMS}}", data.itemsHtml)
                .replace("{{SHIPPING_INFO}}", data.shippingInfo);
            subject = "Xác nhận đơn hàng thành công";
        }

        const mailOptions = {
            from: `"TinyYummy" <${USER_EMAIL}>`,
            to: email,
            subject,
            html: emailHtml,
            text:
                type === "orderConfirmation"
                    ? `Cảm ơn bạn đã đặt hàng tại TinyYummy!\nMã đơn hàng: ${data.orderId}\nPhương thức thanh toán: ${data.paymentMethod}\nTổng tiền: ${data.totalAmount.toLocaleString("vi-VN")} VND`
                    : `Mã OTP của bạn là: ${data}\nMã này sẽ hết hạn sau 5 phút.`,
        };

        // Gửi email
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully:", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Lỗi khi gửi email:", {
            message: error.message,
            code: error.code,
            response: error.response,
        });
        throw error;
    }
};

module.exports = sendEmailOAuth;
