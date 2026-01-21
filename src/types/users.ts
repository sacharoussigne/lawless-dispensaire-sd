export interface User {
  id: string;
  name: string;
  email: string;
  role: string | null | undefined;
  emailVerified: boolean;
  banned: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

