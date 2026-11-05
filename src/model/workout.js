import mongoose from "mongoose";

const workoutSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: [3, "Name must be at least 3 characters long"],
    },

    description: {
        type: String,
        required: true,
        minlength: [10, "Description must be at least 10 characters long"],
    },

    category: {
        type: String,
        required: true,
        enum: ["Strength", "Cardio", "Flexibility", "Balance", "Yoga"],
    },

    difficulty: {
        type: String,
        required: true,
        enum: ["Beginner", "Intermediate", "Advanced"],
    },

    duration: {
        type: Number,
        required: true,
        min: [1, "Duration must be at least 1 minute"],
    },

    exercises: [
        {
            name: {
                type: String,
                required: true,
            },

            sets: {
                type: Number,
                default: null,
                min: 1,
            },

            reps: {
                type: Number,
                default: null,
            },

            duration: {
                type: Number,
                default: null,
            },

            rest: {
                type: Number,
                default: 60,
            },

            instructions: {
                type: String,
                default: "",
            },
        },
    ],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,

    },
    isCompleted: {
        type: Boolean,
        default: false,
    },
    completedAt: {
        type: Date,
        default: null,
    },

    caloriesBurned: {
        type: Number,
        default: 0,
        min: 0,
    },

}, { timestamps: true });

const Workout = mongoose.model("Workout", workoutSchema);

export default Workout;