import express from "express";
import cors from "cors";
import testRoutes from "./routes/testRoutes.js"
import { envObj } from "./config/env.js";
import connectDB from "./config/db.js";
import authRotes from "./routes/auth.js";
import workoutRoutes from "./routes/workout.js";
import coachRoutes from "./routes/coach.js";
import userRoutes from "./routes/user.js";


const server = express();
const allowedOrigins = [
    "http://localhost:5173",
    envObj.origin
];

server.use(cors({
    origin: allowedOrigins
}));

server.use(express.json());
server.use("/auth", authRotes)
server.use("/api", testRoutes);
server.get("/", (req, res) => {
    res.send("Welcome to C-FIT API");
});
server.use("/workouts", workoutRoutes);
server.use("/coach", coachRoutes);
server.use("/users", userRoutes)



connectDB();

const port = envObj.port;
server.listen(port, () => {
    console.log(`C-FIT Server is running on port ${port}`);
});