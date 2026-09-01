/**
 * The PUBLIC SURFACE of the auth domain.
 *
 * Other domains and the app layer import from "@/lib/auth" - never from
 * "@/lib/auth/service" directly. Files inside this folder use relative imports
 * ("./session") among themselves.
 *
 * If something is not exported here, it is internal to this domain.
 */
export { getSessionUser, getSessionAccount, requireSessionAccount } from "./session";
export { sendLoginCode, verifyLoginCode } from "./service";
export { PhoneSchema, OtpSchema } from "./schema";
export type { PhoneInput, OtpInput } from "./schema";
export type { SessionUser, SessionAccount } from "./types";
