const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: String,
    description: String,
}, { timestamps: false });

module.exports = mongoose.model('Category', categorySchema);