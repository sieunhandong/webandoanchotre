const { Resend } = require("resend");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);

const otpTemplate = fs.readFileSync(path.join(process.cwd(), "utils", "otpTemplate.html"), "utf8");
const orderTemplate = fs.readFileSync(path.join(process.cwd(), "utils", "orderTemplate.html"), "utf8");

const sendEmail = async (email, data, type) => {
    try {
        let html, subject;

        if (type === "register") {
            html = otpTemplate.replace("{{OTP}}", data).replace("{{TITLE}}", "Xác nhận đăng ký tài khoản");
            subject = "Xác nhận đăng ký - Mã OTP của bạn";
        } else if (type === "reset-password") {
            html = otpTemplate.replace("{{OTP}}", data).replace("{{TITLE}}", "Xác nhận đặt lại mật khẩu");
            subject = "Đặt lại mật khẩu - Mã OTP của bạn";
        } else if (type === "orderConfirmation") {
            html = orderTemplate
                .replace("{{ORDER_ID}}", data.orderId)
                .replace("{{PAYMENT_METHOD}}", data.paymentMethod)
                .replace("{{TOTAL_AMOUNT}}", data.totalAmount.toLocaleString("vi-VN"))
                .replace("{{ITEMS}}", data.itemsHtml)
                .replace("{{SHIPPING_INFO}}", data.shippingInfo);
            subject = "Xác nhận đơn hàng thành công";
        }

        const response = await resend.emails.send({
            from: "TinyYummy <noreply@tinyyummy.com>", // đổi thành domain riêng nếu muốn
            to: email,
            subject,
            html,
            text: type === "orderConfirmation"
                ? `Chào bạn,\n\nCảm ơn bạn đã đặt hàng tại TinyYummy!\n\nMã đơn hàng: ${data.orderId}\nPhương thức thanh toán: ${data.paymentMethod}\nTổng tiền: ${data.totalAmount.toLocaleString("vi-VN")} VND\n\nThông tin giao hàng: ${data.shippingInfo}\n\nChúng tôi sẽ thông báo khi đơn hàng được xử lý.\n\nTrân trọng,\nTinnyYummy`
                : `Chào bạn,\n\nMã OTP của bạn là: ${data.otp}\nMã này sẽ hết hạn sau 5 phút.\n\nVui lòng không chia sẻ mã này với bất kỳ ai.\nNếu bạn không yêu cầu mã này, vui lòng thay đổi mật khẩu ngay lập tức.\n\nTrân trọng,\nTinnyYummy`,
        });

        // console.log("✅ Email sent:", response);
    } catch (error) {
        console.error("❌ Lỗi gửi email:", error);
    }
};

module.exports = sendEmail;
