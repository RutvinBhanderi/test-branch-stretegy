/** The nouns of the accounts domain. */

export interface Account {
  id: string;
  userId: string;
  displayName: string | null;
  createdAt: string;
}
