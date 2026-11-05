import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: false
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },

    fitnessProfile: {
        goal: {
            type: String,
            enum: [
                "Build Muscle",
                "Lose Weight",
                "Improve Endurance",
                "Increase Flexibility",
                "Stay Healthy",
            ],
            default: "Stay Healthy",
        },

        experienceLevel: {
            type: String,
            enum: ["Beginner", "Intermediate", "Advanced"],
            default: "Beginner",
        },

        equipment: {
            type: [String],
            default: ["Bodyweight"],
        },

        workoutDaysPerWeek: {
            type: Number,
            min: 1,
            max: 7,
            default: 3,
        },
    },

    exercises: [
        {
            name: {
                type: String,
                required: true,
            },
            sets: {
                type: Number,
                required: true,
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

}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;