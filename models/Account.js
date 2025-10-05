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
        enum: ["customer", "admin"],
        default: "customer",
    },
    isActivated: { type: Boolean, default: true },

    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
