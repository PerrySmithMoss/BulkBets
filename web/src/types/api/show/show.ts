import { Timestamp } from "..";

export enum ShowStatus {
  Upcoming = "upcoming",
  Ongoing = "ongoing",
  Completed = "completed",
  Canceled = "canceled",
}

export interface Show {
  id: number;
 sandbox?: boolean;
 settle_at?: string;
  name: string;
  description: string | null;
  location: string | null;
  is_two_day_show: boolean;
  start_time: Timestamp; // ISO 8601 string representation of the timestamp
  end_time: Timestamp; // ISO 8601 string representation of the timestamp
  status: ShowStatus;
}
