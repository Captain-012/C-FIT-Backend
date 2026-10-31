
import express from "express";
import User from "../model/user.js";
import { jwtVallidator } from "../middleware/authMiddleware.js";

const router = express.Router();

router.patch("/fitness-profile", jwtVallidator, async (req, res) => {
    try {
        const {
            goal,
            experienceLevel,
            equipment,
            workoutDaysPerWeek,
        } = req.body;

        const allowedGoals = [
            "Build Muscle",
            "Lose Weight",
            "Improve Endurance",
            "Increase Flexibility",
            "Stay Healthy",
        ];

        const allowedLevels = [
            "Beginner",
            "Intermediate",
            "Advanced",
        ];

        if (goal !== undefined && !allowedGoals.includes(goal)) {
            return res.status(400).json({
                status: false,
                message: "Invalid fitness goal.",
            });
        }

        if (
            experienceLevel !== undefined &&
            !allowedLevels.includes(experienceLevel)
        ) {
            return res.status(400).json({
                status: false,
                message: "Invalid experience level.",
            });
        }

        if (
            equipment !== undefined &&
            (!Array.isArray(equipment) ||
                equipment.some(
                    (item) => typeof item !== "string" || !item.trim()
                ))
        ) {
            return res.status(400).json({
                status: false,
                message: "Equipment must be an array of valid names.",
            });
        }

        if (
            workoutDaysPerWeek !== undefined &&
            (!Number.isInteger(workoutDaysPerWeek) ||
                workoutDaysPerWeek < 1 ||
                workoutDaysPerWeek > 7)
        ) {
            return res.status(400).json({
                status: false,
                message: "Workout days must be a number between 1 and 7.",
            });
        }

        const fitnessProfile = {};

        if (goal !== undefined) {
            fitnessProfile["fitnessProfile.goal"] = goal;
        }

        if (experienceLevel !== undefined) {
            fitnessProfile["fitnessProfile.experienceLevel"] =
                experienceLevel;
        }

        if (equipment !== undefined) {
            fitnessProfile["fitnessProfile.equipment"] = equipment;
        }

        if (workoutDaysPerWeek !== undefined) {
            fitnessProfile["fitnessProfile.workoutDaysPerWeek"] =
                workoutDaysPerWeek;
        }

        if (Object.keys(fitnessProfile).length === 0) {
            return res.status(400).json({
                status: false,
                message: "Provide at least one fitness preference to update.",
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: fitnessProfile },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).select("name fitnessProfile");

        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Fitness profile updated successfully.",
            fitnessProfile: user.fitnessProfile,
        });
    } catch (error) {
        console.error("Fitness profile update error:", error);

        return res.status(500).json({
            status: false,
            message: "Failed to update fitness profile.",
        });
    }
});

export default router;
