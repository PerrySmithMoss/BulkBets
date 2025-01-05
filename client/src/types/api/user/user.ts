import { Timestamp, UUID } from "..";

export interface User {
  data: {
    id: UUID;
    firstName: string;
    lastName: string;
    email: string;
    isEmailVerified: boolean;
    emailVerifiedAt?: Timestamp | null;
    profileImage?: string | null;
    refreshTokenVersion: number;
    balance: number;
    defaultCurrency: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    googleId?: string | null;
    xId?: string | null;
    githubId?: string | null;
  };
}
