import User from "../model/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { envObj } from "../config/env.js";
import { OAuth2Client } from "google-auth-library";


export const registerUser = async (req, res) => {
    try {
        const { name, email, password, turnstileToken } = req.body;
        // Cloudflare Turnstile verification
        const verification = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    secret: envObj.turnstileSecretKey,
                    response: turnstileToken
                })
            }
        );

        const result = await verification.json();

        if (!result.success) {
            console.log("Turnstile verification failed:", result);

            return res.status(400).json({
                status: false,
                message: "Human Verification Failed",
                errors: result["error-codes"]
            });
        }
        console.log(result);
        console.log("Registration password received:", typeof password === "string");
        console.log("Registration password length:", password.length);

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("New hash generated:", hashedPassword.startsWith("$2"));

        console.log("Registering email:", email);


        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });


        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Registration failed",
            error: error.message,
        });
    }
};


export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("Login request received");
        console.log("Password provided:", typeof password === "string" && password.length > 0);
        console.log("Password length:", typeof password === "string" ? password.length : "not a string");
        console.log("Login email:", email);


        const user = await User.findOne({ email });
        console.log("User found:", Boolean(user));
        console.log("Stored password hash exists:", Boolean(user?.password));

        if (!user) {    
            return res.status(404).json({
                message: "User not found",
            });
        };

        const passwordMatch = await bcrypt.compare(password, user.password);

        console.log("Hash prefix:", user.password.slice(0, 4));
        console.log("Hash length:", user.password.length);
        console.log("Password comparison:", passwordMatch);
        console.log("Password matches hash:", passwordMatch);
        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid password",
            });
        };

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            token
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message,
        });


    }
}

export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        const googleClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID
        )

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        const { sub, name, email } = payload;
        console.log("Google user:", {
            googleId: sub,
            name,
            email
        });

        const user = await User.findOne({ email });
        if (user) {

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                message: "Google Login Successful",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                },
                token
            })

        }

        const newUser = await User.create({
            name,
            email,
            googleId: sub
        });


        const token = jwt.sign(
            { userId: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );


        return res.status(201).json({
            message: "Google Registration Successful",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            },
            token
        });




    } catch (error) {
        console.log("Google login error:", error);

        res.status(500).json({
            message: "Google login failed",
            error: error.message
        })


    }
}


export const authMe = async (req, res) => {
    try {
        console.log(req.user);
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(400).json({ status: false, message: "Invalid Credentials" });
        }

        const userObj = {
            name: user.name,
            email: user.email,
        };

        return res.status(200).json({ status: true, message: "Successfully", user: userObj })

    } catch (error) {
        console.log(error);

        res.status(400).json({
            status: false,
            message: error.message
        });


    }
}