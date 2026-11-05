import express from "express";
import { jwtVallidator } from "../middleware/authMiddleware.js";
import Workout from "../model/workout.js";
import Conversation from "../model/conversation.js";
import User from "../model/user.js";
import Groq from "groq-sdk"
import { envObj } from "../config/env.js";
const groq = new Groq({
    apiKey: envObj.apiCoachKey,
});

const router = express.Router();


router.get("/history", jwtVallidator, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            user: req.user.userId,
        }).lean();

        return res.status(200).json({
            status: true,
            messages: conversation?.messages || [],
        });
    } catch (error) {
        console.error("Conversation history error:", error);

        return res.status(500).json({
            status: false,
            message: "Failed to load conversation history",
        });
    }
});


router.patch("/history/save-workout", jwtVallidator, async (req, res) => {
    try {
        const { messageIndex } = req.body;

        if (
            !Number.isInteger(messageIndex) ||
            messageIndex < 0
        ) {
            return res.status(400).json({
                status: false,
                message: "A valid message index is required.",
            });
        }

        const conversation = await Conversation.findOne({
            user: req.user.userId,
        });

        if (!conversation || !conversation.messages[messageIndex]) {
            return res.status(404).json({
                status: false,
                message: "Workout message not found.",
            });
        }

        const selectedMessage = conversation.messages[messageIndex];

        if (
            selectedMessage.role !== "assistant" ||
            !selectedMessage.workout
        ) {
            return res.status(400).json({
                status: false,
                message: "This message does not contain a workout.",
            });
        }

        selectedMessage.saved = true;

        await conversation.save();

        return res.status(200).json({
            status: true,
            message: "Workout save status updated.",
        });

    } catch (error) {
        console.error("Update workout status error:", error);

        return res.status(500).json({
            status: false,
            message: "Failed to update workout save status.",
        });
    }
});



router.delete("/history", jwtVallidator, async (req, res) => {
    try {
        const conversation = await Conversation.findOneAndUpdate(
            { user: req.user.userId },
            { $set: { messages: [] } },
            { new: true }
        );

        if (!conversation) {
            return res.status(404).json({
                status: false,
                message: "No conversation found to clear.",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Chat history cleared successfully.",
        });
    } catch (error) {
        console.error("Clear conversation error:", error);

        return res.status(500).json({
            status: false,
            message: "Failed to clear conversation history.",
        });
    }
});



router.post("/", jwtVallidator, async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                status: false,
                message: "Please enter a message",
            });
        }

        if (!Array.isArray(history)) {
            return res.status(400).json({
                status: false,
                message: "Conversation history must be an array",
            });
        }


        const user = await User.findById(req.user.userId)
            .select("name fitnessProfile")
            .lean();

        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found.",
            });
        }


        const fitnessProfile = user.fitnessProfile || {};

        const goal = fitnessProfile.goal || "Stay Healthy";

        const experienceLevel =
            fitnessProfile.experienceLevel || "Beginner";

        const equipment =
            fitnessProfile.equipment && fitnessProfile.equipment.length > 0
                ? fitnessProfile.equipment
                : ["Bodyweight"];

        const workoutDaysPerWeek =
            fitnessProfile.workoutDaysPerWeek || 3;

        const userFitnessData = {
            goal,
            experienceLevel,
            equipment,
            workoutDaysPerWeek,
        };



        const userWorkouts = await Workout.find({
            user: req.user.userId
        })

            .select("name category difficulty duration isCompleted completedAt caloriesBurned createdAt")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();



        const completedWorkouts = userWorkouts.filter(
            (workout) => workout.isCompleted && workout.completedAt
        );

        const totalActiveMinutes = completedWorkouts.reduce(
            (total, workout) => total + workout.duration,
            0
        );

        const totalEstimatedCalories = completedWorkouts.reduce(
            (total, workout) => total + (workout.caloriesBurned || 0),
            0
        );

        const workoutSummary = {
            totalWorkouts: userWorkouts.length,
            completedWorkouts: completedWorkouts.length,
            totalActiveMinutes,
            totalEstimatedCalories,
            recentCompletedWorkouts: completedWorkouts.slice(0, 10).map(
                (workout) => ({
                    name: workout.name,
                    category: workout.category,
                    difficulty: workout.difficulty,
                    duration: workout.duration,
                    completedAt: workout.completedAt,
                    caloriesBurned: workout.caloriesBurned,
                })
            ),
        };


        const validHistory = history
            .filter(
                (item) =>
                    item &&
                    ["user", "assistant"].includes(item.role) &&
                    typeof item.content === "string"
            )
            .slice(-20)
            .map((item) => ({
                role: item.role,
                content: item.content,
            }));




        const latestMessage = message.trim().toLowerCase();

        const workoutRequestPattern =
            /\b(create|make|design|generate|plan|build)\b.*\b(workout|exercise routine|training plan)\b|\b(workout|exercise routine|training plan)\b.*\b(for me|create|make|design|plan)\b/;

        const targetPattern =
            /\b(chest|back|arms?|shoulders?|legs?|abs|abdominals|core|full[- ]body|whole body|upper body|lower body)\b/;

        const isNewWorkoutRequest =
            workoutRequestPattern.test(latestMessage);

        const previousAssistantAskedForTarget = validHistory.some(
            (item) =>
                item.role === "assistant" &&
                /which body part|training focus|full-body workout/i.test(
                    item.content
                )
        );

        const lastHistoryMessage = validHistory[validHistory.length - 1];

        const lastAssistantAskedForTarget =
            lastHistoryMessage?.role === "assistant" &&
            /which body part|training focus|full-body workout/i.test(
                lastHistoryMessage.content
            );

        const hasDuration =
            /\b\d+\s*(minutes?|mins?|hours?|hrs?)\b/i.test(message);

        const hasEquipment =
            /\b(no equipment|bodyweight|dumbbells?|barbells?|resistance bands?|gym|machines?|kettlebells?)\b/i.test(
                message
            );

        const targetProvided = targetPattern.test(latestMessage);

        // STEP 1: Ask for missing time or equipment
        if (
            lastAssistantAskedForTarget &&
            targetProvided &&
            (!hasDuration || !hasEquipment)
        ) {
            let reply;

            if (!hasDuration && !hasEquipment) {
                reply =
                    "Great choice! 💪 How much time do you have for this workout, and what equipment can you use? For example, 30 minutes with dumbbells or 20 minutes with no equipment.";
            } else if (!hasDuration) {
                reply =
                    "Great choice! 💪 How much time do you have for this workout? For example, 20, 30, or 45 minutes.";
            } else {
                reply =
                    "Great choice! 💪 What equipment can you use? For example, dumbbells, resistance bands, or no equipment.";
            }

            await Conversation.findOneAndUpdate(
                { user: req.user.userId },
                {
                    $push: {
                        messages: {
                            $each: [
                                { role: "user", content: message.trim() },
                                { role: "assistant", content: reply }
                            ]
                        }
                    }
                },
                {
                    returnDocument: "after",
                    upsert: true
                }
            );

            return res.status(200).json({
                status: true,
                reply
            });
        }

        // STEP 2: Ask for a body part when one is missing
        if (
            isNewWorkoutRequest &&
            !targetPattern.test(latestMessage) &&
            !previousAssistantAskedForTarget
        ) {
            const reply =
                "Absolutely! 💪 Which body part would you like to focus on: chest, back, arms, shoulders, legs, abs, or full body?";

            await Conversation.findOneAndUpdate(
                { user: req.user.userId },
                {
                    $push: {
                        messages: {
                            $each: [
                                { role: "user", content: message.trim() },
                                { role: "assistant", content: reply }
                            ]
                        }
                    }
                },
                {
                    returnDocument: "after",
                    upsert: true
                }
            );

            return res.status(200).json({
                status: true,
                reply
            });
        }




        const groqResponse = await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: [

                {
                    role: "system",
                    content: `
                        You are C-FIT Coach, a knowledgeable, friendly, and practical AI fitness coach.

                        YOUR RESPONSIBILITIES:
                        - Help users improve strength, endurance, flexibility, fitness habits, and general physical fitness.
                        - Explain exercises in beginner-friendly language.
                        - Recommend realistic workout routines based on the user's stated goals, experience, available equipment, and schedule.
                        - Explain proper exercise technique, warm-ups, cool-downs, rest, and recovery.
                        - Help users understand their workout history and progress when actual data is provided.
                        - Give specific, actionable next steps instead of vague motivational advice.

                        PERSONALIZATION:
                        - Use the conversation history to understand follow-up questions.
                        - Use the user's actual fitness information when it is supplied.
                        - Never invent workout history, statistics, personal details, or achievements.
                        - If important information is missing, ask a short, relevant follow-up question.
                        - Organize workout plans with exercise names, sets, repetitions or duration, rest periods, and weekly schedules when appropriate.

                        COMMUNICATION:
                        - Be encouraging, respectful, clear, and concise.
                        - Explain unfamiliar fitness terms in simple language.
                        - Use headings and lists when they make an answer easier to follow.
                        - Avoid repeating the same generic advice in every response.

                        SAFETY:
                        - Encourage gradual progression and appropriate rest.
                        - Do not diagnose injuries or medical conditions.
                        - Do not encourage users to exercise through severe pain, chest pain, faintness, or unusual shortness of breath.
                        - For concerning symptoms, recommend stopping exercise and seeking appropriate medical attention.
                        - Do not promise guaranteed weight-loss or muscle-growth results.


                        EXERCISE ACCURACY AND EQUIPMENT RULES:

                        - Recommend real, established exercises that meaningfully train the intended muscles.
                        - Never invent an exercise name or describe an exercise as effective for a muscle group without a reasonable basis.
                        - Match every exercise to the equipment the user actually has available.
                        - If the user has no equipment, recommend suitable bodyweight exercises and explain their limitations honestly.
                        - Do not prescribe weighted exercises, such as dumbbell curls, when the user has no weights.
                        - Do not pretend that moving the arms without resistance is equivalent to performing a loaded biceps curl.
                        - Explain when a muscle group is difficult to train effectively with the user's available equipment. For example, training the biceps progressively can be difficult with bodyweight alone.
                        - Offer realistic alternatives when possible, such as safe resistance-band exercises when the user owns a resistance band, or suitable pulling variations when an appropriate, secure setup is available.
                        - Never assume that a chair, table, door, or other household object is strong or stable enough to support body weight.
                        - Distinguish exercise variations correctly. For example, incline push-ups are performed with the hands elevated; decline push-ups are performed with the feet elevated.
                        - Give clear technique instructions, appropriate beginner-friendly sets and repetitions, and rest periods.
                        - Scale difficulty to the user's experience. Do not prescribe challenging repetition targets without considering the user's ability.
                        - Make the workout duration realistic, including warm-up, working sets, rest periods, and cooldown.
                        - If the requested muscle group cannot be trained effectively with the available equipment, explain the limitation and ask whether the user would prefer a practical alternative rather than inventing an ineffective exercise.





                        MUSCLE-TARGETING ACCURACY:

                        - Identify the primary muscles trained by each exercise correctly.
                        - Do not label push-ups, wall push-ups, close-grip push-ups, or planks as biceps-isolation exercises.
                        - Explain the difference between primary muscle activation and secondary or indirect activation.
                        - For a chest and biceps workout, select exercises that genuinely train the chest and, where possible, the biceps.
                        - If no suitable biceps exercise is available with the user's equipment, say so clearly instead of filling the workout with exercises that do not target the biceps effectively.
                        - Do not claim that an exercise isolates a muscle unless that description is accurate.
                        - For every workout, allocate realistic time to each exercise, rest periods, warm-up, and cooldown so the total matches the requested duration.
                        - Avoid recommending harder exercise variations as progressions unless they are appropriate for the user's stated experience level.





                        STRICT MUSCLE-TARGETING RULES:

                        - Push-ups primarily train the chest, shoulders, and triceps. Never describe them as an effective biceps exercise.
                        - Wall push-ups and close-grip push-ups are not biceps-isolation exercises.
                        - Planks, plank arm extensions, and mountain climbers must not be presented as exercises for building biceps.
                        - Arm circles and stretching are warm-up or mobility movements, not strength-building biceps exercises.
                        - Superman holds primarily train the back muscles and posterior chain. Do not include them as a primary chest or biceps exercise.
                        - Never tell users to squeeze their biceps during push-ups as a substitute for a genuine biceps exercise.
                        - When equipment is unavailable, explain honestly that effective progressive biceps training is difficult with bodyweight alone.
                        - Never invent an exercise to fill a requested muscle group.
                        - If an effective exercise cannot be recommended for the requested muscle group and equipment, explain the limitation and ask whether the user would like to adjust the equipment or training focus.
                        - Before presenting a workout, check that each exercise matches its stated primary muscle group.





                      
                        STRICT WORKOUT CREATION GATE — HIGHEST PRIORITY:

                        When the user requests a new workout, workout plan, or exercise routine, you MUST first determine whether you have enough information to create a personalized workout.

                        If the target body part or training focus is not explicitly known from the current conversation, ask the user which body part they want to train or whether they prefer a full-body workout.

                        For example, respond:
                        "Absolutely! 💪 Which body part would you like to focus on: chest, back, arms, shoulders, legs, abs, or full body?"

                        IMPORTANT RULES:
                        - Do not generate any workout exercises, sets, repetitions, workout circuits, warm-ups, or cooldowns before the required information has been gathered.
                        - Do not generate a generic full-body workout as a fallback.
                        - Do not assume that the user wants a full-body workout.
                        - Do not treat an offer to customize a completed workout afterward as a substitute for asking questions first.
                        - Ask only for information that is still missing. Remember the user's answers from the conversation history.
                        - After the target is known, gather any other essential missing details, such as available time and equipment, before generating the plan.
                        - If the user has already provided sufficient details, do not ask unnecessary questions.
                        - If the user is asking to modify an existing workout rather than create a new one, handle that request directly.



                        Your goal is to help every C-FIT user make realistic, informed, and consistent progress toward their fitness goals.

                        EQUIPMENT RULES:
                        - Strictly respect the equipment specified by the user.
                        - If the user says no equipment, generate exercises requiring only body weight.
                        - Do not require chairs, benches, tables, walls, dumbbells, or other external equipment.
                        - Never suggest incline or decline exercises that require raised surfaces when no equipment is available.



                        RESPONSE FORMAT — VERY IMPORTANT:

                        - Always return a valid JSON object.
                        - The object must contain two properties: "reply" and "workout".
                        - "reply" must contain the natural-language response displayed in the chat.
                        - "workout" must be null when asking follow-up questions, answering general questions, or when no complete workout has been generated.
                        - When a complete workout has been generated, "workout" must contain:

                        {
                            "name": "Workout name",
                            "description": "Workout description",
                            "category": "Strength", 
                            "difficulty": "Beginner",
                            "duration": 30,
                            "exercises": [
                                {
                                    "name": "Push-ups",
                                    "sets": 3,
                                    "reps": 12,
                                    "duration": null,
                                    "rest": 60,
                                    "instructions": "Keep your body straight while lowering your chest."
                                }
                            ]
                        }

                        - Category must be Strength, Cardio, Flexibility, Balance, or Yoga.
                        - Difficulty must be Beginner, Intermediate, or Advanced.
                        - Workout duration must be in minutes.
                        - Exercise duration must be in seconds.
                        - For repetition-based exercises, provide reps and set duration to null.
                        - For timed exercises, provide duration and set reps to null.
                        - Never generate a workout object when essential information is missing.
                        - Never invent exercises or disregard the user's equipment.
                        `,
                },

                {
                    role: "system",
                    content: `Here is the authenticated user's fitness data from the C-FIT database.

                            Fitness profile:
                            ${JSON.stringify(userFitnessData, null, 2)}

                            Workout summary:
                            ${JSON.stringify(workoutSummary, null, 2)}

                            Instructions:
                            - Personalize recommendations using the user's fitness profile and recorded workouts.
                            - Respect the user's experience level, available equipment, and weekly workout schedule.
                            - Use the fitness goal to guide relevant workout recommendations.
                            - Use database statistics when answering questions about workout history.
                            - Never invent workout statistics, achievements, or personal details.
                            - If there are no completed workouts, say that none are recorded yet.
                            - Calories burned are estimates, not exact measurements.
                            - This workout summary covers at most the 100 most recently created workouts.
                            - Use recorded workouts to personalize recommendations when relevant.`,
                },


                ...validHistory,
                {
                    role: "user",
                    content: message.trim(),
                },
            ],
            response_format: {
                type: "json_object"
            },



        });

        const aiResult = JSON.parse(
            groqResponse.choices[0]?.message?.content
        );

        const aiReply = aiResult.reply;
        const workoutPlan = aiResult.workout || null;
        console.log("Generated workout plan:", workoutPlan);


        if (!aiReply) {
            throw new Error("Groq returned an empty response");
        }


        await Conversation.findOneAndUpdate(
            { user: req.user.userId },
            {
                $push: {
                    messages: {
                        $each: [
                            {
                                role: "user",
                                content: message.trim(),
                            },
                            {
                                role: "assistant",
                                content: aiReply,
                                workout: workoutPlan || null,
                                saved: false,
                            },
                        ],
                    },
                },
            },
            {
                returnDocument: "after",
                upsert: true,
            }
        );

        return res.status(200).json({
            status: true,
            reply: aiReply,
            workout: workoutPlan
        });

    } catch (error) {
        console.error("Coach error:", error);

        return res.status(500).json({
            status: false,
            message: "Something went wrong with the AI Coach",
        });
    }
});

export default router;
