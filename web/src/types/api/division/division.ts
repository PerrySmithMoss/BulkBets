import { Timestamp } from "..";

export enum DivisionStatus {
  Scheduled = "Scheduled",
  Ongoing = "On going",
  Completed = "Completed",
  Canceled = "Canceled",
}

export interface Division {
  id: number;
  name: string;
  category: string | null;
  status: DivisionStatus;
  start_time: Timestamp; // ISO 8601 string representation of the timestamp
}
