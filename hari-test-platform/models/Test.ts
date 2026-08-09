import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IQuestion {
  questionNumber: number;
  question: string;
  options: string[];
  correctOption: 1 | 2 | 3 | 4;
}

export interface ITest extends Document {
  title: string;
  description?: string;
  testCode: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  questions: IQuestion[];
  createdBy: Types.ObjectId;
  reportSent: boolean;
  createdAt: Date;
  updatedAt: Date;
  derivedStatus: "UPCOMING" | "LIVE" | "ENDED";
}

const QuestionSchema = new Schema<IQuestion>(
  {
    questionNumber: { type: Number, required: true },
    question: { type: String, required: true, trim: true },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: string[]) => arr.length === 4 && arr.every((o) => o.trim().length > 0),
        message: "Each question must have exactly 4 non-empty options",
      },
    },
    correctOption: { type: Number, required: true, enum: [1, 2, 3, 4] },
  },
  { _id: false }
);

const TestSchema = new Schema<ITest>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    testCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    questions: {
      type: [QuestionSchema],
      required: true,
      validate: {
        validator: (arr: IQuestion[]) => arr.length > 0,
        message: "A test must have at least one question",
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    reportSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Derived status — never persisted, always computed from current server time
TestSchema.virtual("derivedStatus").get(function (this: ITest) {
  const now = new Date();
  if (now < this.startTime) return "UPCOMING";
  if (now < this.endTime) return "LIVE";
  return "ENDED";
});

TestSchema.index({ testCode: 1 }, { unique: true });

const Test: Model<ITest> = mongoose.models.Test || mongoose.model<ITest>("Test", TestSchema);

export default Test;