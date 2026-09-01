import { z } from "zod";

export const CreateAccountSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(60, "That name is too long."),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
