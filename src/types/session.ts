import { type User, type Session } from "@prisma/client";

export interface AuthSession {
  session: Session
  user: User;
}
