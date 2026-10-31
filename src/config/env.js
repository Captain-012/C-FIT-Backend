import dotenv from "dotenv";
dotenv.config();

export const envObj = {
    port: process.env.PORT,
    origin: process.env.ORIGIN,
    mongoUrl: process.env.MONGO_URL,
    jwtSecretKey: process.env.JWT_SECRET,
    turnstileSecretKey : process.env.TURNSTILE_SECRET_KEY,
    googleClientId : process.env.GOOGLE_CLIENT_ID,
    apiCoachKey : process.env.API_COACH_KEY
}