import jwt from "jsonwebtoken";
import { envObj } from "../config/env.js";

export const jwtVallidator = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            status : false,
            message: "Token not found",
        });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    console.log(token);


    try {
        const decoded =  jwt.verify(token, envObj.jwtSecretKey);
        req.user = decoded;
        next();
        
    } catch (error) {
        return res.status(400).json({
            status : false,
            message : error.message
        })
        
    }
    
}