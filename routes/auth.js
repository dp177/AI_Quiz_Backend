import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Register
router.post("/register", async (req, res) => {
    const { username, password } = req.body;

    try {
        const exists = await User.findOne({ username });
        if (exists) return res.status(400).json({ message: "User already registered" });

        const hash = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hash });
        await newUser.save();

        res.status(201).json({ message: "Registered successfully" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed",err: err.message });
    }
});

// Login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: "Invalid username or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.status(200).json({ token });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

export default router;
