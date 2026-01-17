import { User, Session } from "@prisma/client";

export interface AuthSession {
  session: Session
  user: User;
}
