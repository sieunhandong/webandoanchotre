const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const templatePath = path.join(process.cwd(), "utils", "otpTemplate.html");
const emailTemplate = fs.readFileSync(templatePath, "utf8");

const orderTemplatePath = path.join(process.cwd(), "utils", "orderTemplate.html");
const orderTemplate = fs.readFileSync(orderTemplatePath, "utf8");
const sendEmail = async (email, data, type) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

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
      from: `"TinyYummy " <${process.env.EMAIL_USER}>`, // Hiển thị tên thương hiệu
      to: email,
      subject,
      html: emailHtml,
      text: type === "orderConfirmation"
        ? `Chào bạn,\n\nCảm ơn bạn đã đặt hàng tại TinnyYummy!\n\nMã đơn hàng: ${data.orderId}\nPhương thức thanh toán: ${data.paymentMethod}\nTổng tiền: ${data.totalAmount.toLocaleString("vi-VN")} VND\n\nThông tin giao hàng: ${data.shippingInfo}\n\nChúng tôi sẽ thông báo khi đơn hàng được xử lý.\n\nTrân trọng,\nMinh Hương`
        : `Chào bạn,\n\nMã OTP của bạn là: ${data.otp}\nMã này sẽ hết hạn sau 5 phút.\n\nVui lòng không chia sẻ mã này với bất kỳ ai.\nNếu bạn không yêu cầu mã này, vui lòng thay đổi mật khẩu ngay lập tức.\n\nTrân trọng,\nTinnyYummy`,
    };


    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return info; // 👈 thêm dòng này để getPaymentReturn log được
  } catch (error) {
    console.error("❌ Lỗi khi gửi email:", {
      message: error.message,
      code: error.code,
      response: error.response,
    });
    throw error; // 👈 ném lỗi ra ngoài để webhook biết
  }
};

module.exports = sendEmail;