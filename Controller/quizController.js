import { Router } from 'express';
import auth from '../middleware/authMiddleware.js';
import axios from 'axios';
import dotenv from 'dotenv';
import Quiz from '../models/Quiz.js'; // Add this line at the top
import { v4 as uuidv4 } from 'uuid';
import Attempt from '../models/Attempt.js';

dotenv.config();
const router = Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
let x=0;
export const generateQuiz = async (req, res) => {
 const { grade, subject, totalQuestions, maxScore, difficulty } = req.body;
  //  console.log(req.user, req.user.userId, req.userId);
  const uniqueQuizId = uuidv4();

  try {
    const prompt = {
      model: "deepseek/deepseek-r1:free",
      messages: [
        {
          role: "user",
          content: `Generate a quiz in the following JSON format only otherwise dont:

{
  "quizId": ${uniqueQuizId},
  "questions": [
    {
      "questionId": "1",
      "question": "What is 2 + 2?",
      "options": ["3","4","5","6"],
      "correctAnswer": "actual correct answer here",
      "hint1": "generate a hint for the question",
      "hint2": "generate another hint for the question",
      
    }
  ]
}

Constraints:
- Total ${totalQuestions} questions
- Grade: ${grade}
- Subject: ${subject}
- MaxScore: ${maxScore}
- Difficulty: ${difficulty}
- Each question must have 4 options labeled A to D
- correctAnswer must be one of A, B, C, or D
- Return ONLY the JSON object. No explanation or extra text.`
        }
      ],
      temperature: 0.7
    };

    const openrouterResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      prompt,
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
let quizData = openrouterResponse.data.choices[0].message.content;

// Remove markdown-style backticks (```json ... ```)
quizData = quizData.replace(/```json\n?|```/g, '');

let parsed;
try {
  parsed = JSON.parse(quizData);
} catch (e) {
  return res.status(500).json({ error: 'AI returned non-JSON response', raw: quizData });
}
 
  //  console.log(parsed.quizId,req.userId,grade,subject,totalQuestions,maxScore,difficulty,parsed.questions);
  const saved = await Quiz.create({
    quizId: parsed.quizId,
    userId:req.user.userId // ✅ correct
, // Make sure this is set
    grade,
    subject: subject,
    totalQuestions: totalQuestions,
    maxScore: maxScore,
    difficulty: difficulty,
    questions: parsed.questions,
  });

  res.json({
    quizId: saved.quizId,
    questions: parsed.questions.map(q => ({
      ...q,
      correctAnswer: undefined
    }))
  });



  } catch (err) {
    console.error('Quiz generation failed:', err);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
};export const submitQuiz = async (req, res) => {
  console.log("Submitting quiz for user:", req.user.userId);
  try {
    const { quizId, responses } = req.body;

    if (!quizId || !Array.isArray(responses)) {
      return res.status(400).json({ message: 'Invalid submission format' });
    }

    const quiz = await Quiz.findOne({ quizId });  // using your custom quizId, not Mongo _id
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Validate submitted questionIds
    const validIds = quiz.questions.map(q => q.questionId);
    for (const r of responses) {
      if (!validIds.includes(r.questionId)) {
        return res.status(400).json({ message: `Invalid questionId: ${r.questionId}` });
      }
    }

    // Build evaluated result
    const result = quiz.questions.map(q => {
      const userResponseObj = responses.find(r => r.questionId === q.questionId);
      const userResponse = userResponseObj?.userResponse || null;
      const isCorrect = userResponse === q.correctAnswer;

      return {
        questionId: q.questionId,
        question: q.question,
        options: q.options,
        userResponse,
        correctAnswer: q.correctAnswer,
        isCorrect
      };
    });

    const correctCount = result.filter(r => r.isCorrect).length;
    const score = Math.round((correctCount / quiz.questions.length) * quiz.maxScore);

    // Save to Attempt collection
    await Attempt.create({
      userId: req.user.userId,               // from auth middleware
      quizId,                            // use your custom quizId
      responses: result.map(r => ({
        questionId: r.questionId,
        userResponse: r.userResponse,
        correctAnswer: r.correctAnswer,
        isCorrect: r.isCorrect
      })),
      score
    });

    res.status(200).json({ score, result });
  } catch (err) {
    console.error('Error in /submit:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



export const getAllUserAttempts = async (req, res) => {
  try {
    console.log("Fetching all attempts for user:", req.user.userId);

    // 1. Fetch attempts for the logged-in user
    const attempts = await Attempt.find({ userId: req.user.userId });

    // 2. Attach full quiz details for each attempt
    const enrichedAttempts = await Promise.all(
      attempts.map(async (attempt) => {
        const quiz = await Quiz.findOne({ quizId: attempt.quizId });

        return {
          ...attempt.toObject(),
          quiz, // full quiz document added
        };
      })
    );

    res.status(200).json(enrichedAttempts);
  } catch (err) {
    console.error("Error fetching all user attempts:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const retryQuiz = async (req, res) => {
  const { quizId } = req.body;
  const userId= req.user.userId;
  console.log("Retrying quiz for user:", userId, "Quiz ID:", quizId);
  try {
    const quiz = await Quiz.findOne({ quizId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    if (quiz.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized access to this quiz' });
    }

    const safeQuestions = quiz.questions.map(q => {
      const qObj = q.toObject ? q.toObject() : q;
      delete qObj.correctAnswer;
      return qObj;
    });

    res.json({ quizId: quiz.quizId, questions: safeQuestions }); // return custom quizId
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
export const filterUserAttempts = async (req, res) => {
  try {
    const { grade, subject, minScore, maxScore } = req.body;
    const userId = req.user.userId;

    const quizQuery = { userId };
    if (grade?.trim()) quizQuery.grade = grade;
    if (subject?.trim()) quizQuery.subject = subject;

    const quizzes = await Quiz.find(quizQuery);
    const quizMap = {};
    quizzes.forEach(q => {
      quizMap[q.quizId] = q.toObject(); // full quiz object
    });

    const quizIds = quizzes.map(q => q.quizId);

    const attemptQuery = { userId };
    if (grade || subject) {
      if (quizIds.length === 0) {
        return res.status(200).json([]);
      }
      attemptQuery.quizId = { $in: quizIds };
    }

    if (minScore !== undefined && minScore !== "") {
      attemptQuery.score = { ...attemptQuery.score, $gte: parseFloat(minScore) };
    }

    if (maxScore !== undefined && maxScore !== "") {
      attemptQuery.score = { ...attemptQuery.score, $lte: parseFloat(maxScore) };
    }

    const attempts = await Attempt.find(attemptQuery).sort({ createdAt: -1 });

    // ✅ Embed full quiz under each attempt
    const enrichedAttempts = attempts.map(attempt => {
      const quiz = quizMap[attempt.quizId] || null;
      return {
        ...attempt.toObject(),
        quiz
      };
    });

    res.json(enrichedAttempts);
  } catch (err) {
    console.error("Error filtering attempts:", err);
    res.status(500).json({ message: "Server error" });
  }
};
