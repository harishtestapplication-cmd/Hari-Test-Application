import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type AttemptStatus = "in_progress" | "submitted" | "time_expired" | "test_expired";
export type SubmissionType = "manual" | "duration_expired" | "test_window_expired";

export interface IAnswer {
  questionNumber: number;
  selectedOption: 1 | 2 | 3 | 4;
}

export interface IAttempt extends Document {
  testId: Types.ObjectId;
  studentName?: string;
  studentEmail: string;
  normalizedStudentEmail: string;
  startedAt: Date;
  actualEndTime: Date;
  submittedAt?: Date;
  answers: IAnswer[];
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  unanswered?: number;
  percentage?: number;
  status: AttemptStatus;
  submissionType?: SubmissionType;
  resultEmailSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionNumber: { type: Number, required: true },
    selectedOption: { type: Number, required: true, enum: [1, 2, 3, 4] },
  },
  { _id: false }
);

const AttemptSchema = new Schema<IAttempt>(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true },
    studentName: { type: String, trim: true },
    studentEmail: { type: String, required: true, trim: true },
    normalizedStudentEmail: { type: String, required: true, lowercase: true, trim: true },
    startedAt: { type: Date, required: true },
    actualEndTime: { type: Date, required: true },
    submittedAt: { type: Date },
    answers: { type: [AnswerSchema], default: [] },
    score: { type: Number },
    totalQuestions: { type: Number },
    correctAnswers: { type: Number },
    wrongAnswers: { type: Number },
    unanswered: { type: Number },
    percentage: { type: Number },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "time_expired", "test_expired"],
      default: "in_progress",
    },
    submissionType: {
      type: String,
      enum: ["manual", "duration_expired", "test_window_expired"],
    },
    resultEmailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// THE critical index: one attempt per email per test, ever.
AttemptSchema.index({ testId: 1, normalizedStudentEmail: 1 }, { unique: true });

const Attempt: Model<IAttempt> =
  mongoose.models.Attempt || mongoose.model<IAttempt>("Attempt", AttemptSchema);

export default Attempt;