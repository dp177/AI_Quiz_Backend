
import { Schema, model } from 'mongoose';

const responseSchema = new Schema({
  questionId: String,
  userResponse: String,
  correctAnswer: String,
  isCorrect: Boolean
});

const attemptSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true }, // ✅ fixed
  quizId: String, // ✅ Accepts your custom UUID string
  responses: [responseSchema],
  score: Number,
  createdAt: { type: Date, default: Date.now }
});

export default model('Attempt', attemptSchema);
