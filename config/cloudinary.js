require("dotenv").config();

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// 1. Cấu hình cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Cấu hình Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "books",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, crop: "scale" }],
  },
});

// 3. Cấu hình Multer + giới hạn text field
const uploadMultiple = multer({
  storage,
  limits: {
    fieldSize: 10 * 1024 * 1024, // Cho phép text (content) tối đa 10MB
  },
}).array("images", 5);

const uploadSingle = multer({
  storage,
  limits: {
    fieldSize: 10 * 1024 * 1024,
  },
}).single("image");

module.exports = {
  cloudinary,
  uploadMultiple,
  uploadSingle,
};
