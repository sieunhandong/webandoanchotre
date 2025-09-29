const mongoose = require('mongoose');
const { use } = require('../routes/authRoute');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cartItems: [
        {
            book: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Book',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ]
}, {timestamps: false});

module.exports = mongoose.model('Cart', cartSchema);