
import mongoose  from "mongoose";

const nutritionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        type: {
            type: String,
            enum: ["Breakfast", "Lunch", "Dinner", "Snack"],
            required: true,
        },

        calories: {
            type: Number,
            required: true,
            min: 0,
        },

        protein: {
            type: Number,
            default: 0,
            min: 0,
        },

        carbs: {
            type: Number,
            default: 0,
            min: 0,
        },

        fats: {
            type: Number,
            default: 0,
            min: 0,
        },

        consumedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Nutrition = mongoose.model("Nutrition", nutritionSchema);
export default Nutrition;
