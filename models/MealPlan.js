const mongoose = require("mongoose");

const MealPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile", required: true },
    days: [
        {
            day: Number,
            meals: [
                {
                    name: String,       // tên món
                    ingredients: [String], // thành phần
                    notes: String       // lưu ý (nhuyễn, miếng nhỏ,...)
                }
            ]
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("MealPlan", MealPlanSchema);
