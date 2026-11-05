import Workout from "../model/workout.js";

export const createWorkout = async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            difficulty,
            duration,
            exercises
        } = req.body;

        // Validate exercise numeric fields before saving
        if (exercises && Array.isArray(exercises)) {
            for (const exercise of exercises) {
                const numericFields = ["sets", "reps", "duration", "rest"];

                for (const field of numericFields) {
                    const value = exercise[field];

                    if (
                        value !== null &&
                        value !== undefined &&
                        (typeof value !== "number" || !Number.isFinite(value))
                    ) {
                        return res.status(400).json({
                            status: false,
                            message: `Invalid exercise data: ${field} must be a number or null.`,
                        });
                    }
                }
            }
        }

        const workout = await Workout.create({
            name,
            description,
            category,
            difficulty,
            duration,
            exercises,
            user: req.user.userId
        });

        res.status(201).json({
            status: true,
            message: "Workout created successfully",
            workout
        });

    } catch (error) {
        console.log(error);


        if (error.name === "ValidationError") {
            const errors = {};
            for (const field in error.errors) {
                errors[field] = error.errors[field].message;
            }

            return res.status(400).json({
                status: false,
                message: "Validation error",
                errors
            });
        }

        res.status(500).json({
            status: false,
            message: error.message
        })

    }
};

export const getWorkouts = async (req, res) => {
    try {
        const { category, difficulty, search, page = 1, limit = 10 } = req.query;
        let pageNumber = Number(page) || 1;
        let limitNumber = Number(limit) || 10;

        if (pageNumber < 1) {
            pageNumber = 1;
        }

        if (limitNumber < 1) {
            limitNumber = 10;
        }

        const skip = (pageNumber - 1) * limitNumber;
        const filter = {
            user: req.user.userId,
            ...(category && { category }),
            ...(difficulty && { difficulty }),
            ...(search && { name: { $regex: search, $options: "i" } })
        };
        const workouts = await Workout.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber);

        const total = await Workout.countDocuments(filter);
        res.status(200).json({
            status: true,
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
            workouts
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            status: false,
            message: error.message
        });
    }

};


export const getWorkoutById = async (req, res) => {
    try {
        const { id } = req.params;

        const workout = await Workout.findOne({
            _id: id,
            user: req.user.userId
        })

        if (!workout) {
            return res.status(404).json({
                status: false,
                message: "Workout not found"
            });
        }

        res.status(200).json({
            status: true,
            workout
        });

    } catch (error) {
        console.log(error);

        if (error.name === "CastError") {
            return res.status(400).json({
                status: false,
                message: "Invalid workout ID"
            });
        }

        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};


export const updateWorkout = async (req, res) => {
    try {
        const { id } = req.params;

        const workout = await Workout.findOneAndUpdate(
            {
                _id: id,
                user: req.user.userId
            },
            req.body,
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        if (!workout) {
            return res.status(404).json({
                status: false,
                message: "Workout not found"
            });
        }

        res.status(200).json({
            status: true,
            message: "Workout updated successfully",
            workout
        });

    } catch (error) {
        console.log(error);
        if (error.name === "CastError") {
            return res.status(400).json({
                status: false,
                message: "Invalid workout ID"
            });
        }

        if (error.name === "ValidationError") {
            const errors = {};

            for (const field in error.errors) {
                errors[field] = error.errors[field].message;
            }

            return res.status(400).json({
                status: false,
                message: "Validation error",
                errors
            });
        }

        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};


export const deleteWorkout = async (req, res) => {
    try {
        const { id } = req.params;

        const workout = await Workout.findOneAndDelete({
            _id: id,
            user: req.user.userId
        });

        if (!workout) {
            return res.status(404).json({
                status: false,
                message: "Workout not found"
            });
        }

        res.status(200).json({
            status: true,
            message: "Workout deleted successfully"
        });

    } catch (error) {
        console.log(error);
        if (error.name === "CastError") {
            return res.status(400).json({
                status: false,
                message: "Invalid workout ID"
            });
        }
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};