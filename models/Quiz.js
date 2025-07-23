import mongoose from 'mongoose';


const questionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: {
    type: [String], // e.g., ["Option A", "Option B", "Option C", "Option D"]
    required: true,
    validate: [arr => arr.length === 4, 'Exactly 4 options are required']
  },
  correctAnswer: {
    type: String, // e.g., "A", "B", "C", "D"
    enum: ['A', 'B', 'C', 'D'],
    required: true
  },
  hint1: {
    type: String,
    default: ''
  },
  hint2: {
    type: String,
    default: ''
  }
});

const quizSchema = new mongoose.Schema({
  quizId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  grade: Number,
  subject: String,
  totalQuestions: Number,
  maxScore: Number,
  difficulty: String,
  questions: [questionSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Quiz', quizSchema);
