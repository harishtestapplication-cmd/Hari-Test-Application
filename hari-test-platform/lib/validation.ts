import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const createTestFieldsSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    durationMinutes: z.coerce.number().int().positive("Duration must be greater than 0"),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "Start time must be before end time",
    path: ["startTime"],
  })
  .refine(
    (d) => d.durationMinutes * 60000 <= d.endTime.getTime() - d.startTime.getTime(),
    { message: "Duration cannot exceed the test window", path: ["durationMinutes"] }
  );

export type CreateTestFieldsInput = z.infer<typeof createTestFieldsSchema>;

export const patchAnswerSchema = z.object({
  questionNumber: z.coerce.number().int().positive(),
  selectedOption: z.coerce.number().int().min(1).max(4),
});

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionNumber: z.coerce.number().int().positive(),
        selectedOption: z.coerce.number().int().min(1).max(4),
      })
    )
    .optional()
    .default([]),
  // Accepted but never trusted blindly — the server always recomputes the
  // authoritative type from actualEndTime. See resultService.finalizeAttempt.
  submissionType: z.enum(["manual", "duration_expired", "test_window_expired"]).optional(),
});