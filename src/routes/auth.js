import express from 'express';
import { authMe, googleLogin, loginUser, registerUser } from '../controller/userController.js';
import { jwtVallidator } from '../middleware/authMiddleware.js';

const router = express.Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", jwtVallidator, authMe);
router.post("/google", googleLogin)




export default router