import { z } from "zod";

export const AgeGateSchema = z.object({
  // A date input arrives as "YYYY-MM-DD".
  dateOfBirth: z.coerce.date({ errorMap: () => ({ message: "Enter your date of birth." }) }),
});

export type AgeGateInput = z.infer<typeof AgeGateSchema>;
