import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import quizRoutes from "./routes/quiz.js";

dotenv.config();

const app = express();

// ✅ Correct frontend URL handling
const frontendurl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://your-frontend-url.com";

// ✅ CORS setup
app.use(cors({
  origin: frontendurl,
  credentials: true,
}));

app.use(express.json());

// ✅ Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);

// ✅ Dynamic PORT for deployment
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
