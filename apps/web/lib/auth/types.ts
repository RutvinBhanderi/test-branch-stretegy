/** The nouns of the auth domain. No imports - this is vocabulary, not behaviour. */

export interface SessionUser {
  userId: string;
  phone: string | null;
}

/** A signed-in user who has completed account creation. */
export interface SessionAccount {
  userId: string;
  accountId: string;
}
