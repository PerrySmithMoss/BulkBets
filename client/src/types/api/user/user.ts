import { Timestamp, UUID } from "..";

export interface User {
  data: {
    id: UUID;
    first_name: string;
    last_name: string;
    email: string;
    is_email_verified: boolean;
    email_verified_at?: Timestamp | null;
    profile_image?: string | null;
    balance: number;
    default_currency: string;
    created_at: Timestamp;
    updated_at: Timestamp;
  };
}
