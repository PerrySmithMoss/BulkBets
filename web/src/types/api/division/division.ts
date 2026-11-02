import { Timestamp } from "..";

export enum DivisionStatus {
  Scheduled = "scheduled",
  Ongoing = "ongoing",
  Completed = "completed",
  Canceled = "canceled",
}

export interface Division {
  id: number;
  name: string;
  category: string | null;
  status: DivisionStatus;
  start_time: Timestamp; // ISO 8601 string representation of the timestamp
}
