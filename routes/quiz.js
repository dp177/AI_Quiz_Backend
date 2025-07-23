import { Router } from 'express';
import auth from '../middleware/authMiddleware.js';
import axios from 'axios';
import dotenv from 'dotenv';
import Quiz from '../models/Quiz.js'; // Add this line at the top
import {  filterUserAttempts, generateQuiz,getAllUserAttempts,retryQuiz,submitQuiz } from '../Controller/quizController.js';
dotenv.config();
const router = Router();

router.post('/generate', auth,generateQuiz);
router.post('/retry', auth,retryQuiz);
router.post('/filter', auth,filterUserAttempts);
router.post('/submit', auth,submitQuiz); 
router.get('/attempts', auth,getAllUserAttempts);
router.get("/:quizId", auth, async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findOne({ quizId });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Deep clone the quiz to avoid modifying DB object
    const quizToSend = JSON.parse(JSON.stringify(quiz));

    // Remove correctAnswer from each question
    quizToSend.questions.forEach(q => delete q.correctAnswer);

    res.status(200).json(quizToSend);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


export default router;
