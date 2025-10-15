const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String },

    userInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'UserProfile' },
    phone: { type: String },
    googleId: String,
    facebookId: String,
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    isActivated: { type: Boolean, default: true },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
