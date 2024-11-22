import { Timestamp } from "..";

export enum ShowStatus {
  Upcoming = "Up coming",
  Ongoing = "On going",
  Completed = "Completed",
  Canceled = "Canceled",
}

export interface Show {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  is_two_day_show: boolean;
  start_time: Timestamp; // ISO 8601 string representation of the timestamp
  end_time: Timestamp; // ISO 8601 string representation of the timestamp
  status: ShowStatus;
}
