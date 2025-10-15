const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  quizSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizSession' },
  items: [{
    setId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealSet', required: true },
    duration: { type: Number, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
  }],
  total: { type: Number, required: true },
  delivery: {
    time: { type: String },
    address: {
      address: { type: String },
      provinceId: { type: Number },
      provinceName: { type: String },
      districtId: { type: Number },
      districtName: { type: String },
      wardCode: { type: String },
      wardName: { type: String },
    },
  },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  paymentIntentId: { type: String },
  mealSuggestions: [
    {
      day: { type: Number, required: true },
      menu: [{ type: String, required: true }],
      isDone: { type: Boolean, default: false }, // Admin tick khi hoàn thành
    },
  ],
}, { timestamps: true });


module.exports = mongoose.model('Order', orderSchema);