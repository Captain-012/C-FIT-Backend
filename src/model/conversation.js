
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        messages: [
            {
                role: {
                    type: String,
                    enum: ["user", "assistant"],
                    required: true,
                },

                content: {
                    type: String,
                    required: true,
                },

                workout: {
                    type: mongoose.Schema.Types.Mixed,
                    default: null,
                },

                saved: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Conversation = mongoose.model(
    "Conversation",
    conversationSchema
);

export default Conversation;
