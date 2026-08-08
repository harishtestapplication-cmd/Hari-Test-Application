export function computeActualEndTime(
  startedAt: Date,
  durationMinutes: number,
  testEndTime: Date
): Date {
  const candidateEnd = new Date(startedAt.getTime() + durationMinutes * 60000);
  return candidateEnd < testEndTime ? candidateEnd : testEndTime;
}

export function deriveTestStatus(startTime: Date, endTime: Date): "UPCOMING" | "LIVE" | "ENDED" {
  const now = new Date();
  if (now < startTime) return "UPCOMING";
  if (now < endTime) return "LIVE";
  return "ENDED";
}