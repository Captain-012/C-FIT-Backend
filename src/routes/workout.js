import express from "express";
import { createWorkout, deleteWorkout, getWorkoutById, getWorkouts, updateWorkout } from "../controller/workoutController.js";
import { jwtVallidator } from "../middleware/authMiddleware.js";
import Workout from "../model/workout.js";

const router = express.Router();

router.post("/", jwtVallidator, createWorkout);
router.get("/", jwtVallidator, getWorkouts);
router.get("/:id", jwtVallidator, getWorkoutById);
router.put("/:id", jwtVallidator, updateWorkout);
router.delete("/:id", jwtVallidator, deleteWorkout);

router.patch("/:id/complete", jwtVallidator, async (req, res) => {
    try {
        const workout = await Workout.findOne({
            _id: req.params.id,
            user: req.user.userId,
        });

        if (!workout) {
            return res.status(404).json({
                status: false,
                message: "Workout not found",
            });
        }


        const calorieRates = {
            Strength: 6,
            Cardio: 8,
            Flexibility: 3,
            Balance: 3,
            Yoga: 3,
        };

        if (!workout.isCompleted) {
            const caloriesPerMinute = calorieRates[workout.category] || 4;

            workout.caloriesBurned = Math.round(
                workout.duration * caloriesPerMinute
            );
            console.log("Workout completed:", workout.name);
            console.log("Estimated calories:", workout.caloriesBurned);

            workout.isCompleted = true;
            workout.completedAt = new Date();

            await workout.save();
        }


        return res.status(200).json({
            status: true,
            message: "Workout completed successfully",
            workout,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                status: false,
                message: "Invalid workout ID",
            });
        }

        return res.status(500).json({
            status: false,
            message: "Failed to complete workout",
        });
    }
});



export default router
