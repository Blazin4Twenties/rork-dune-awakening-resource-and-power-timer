export type ResourceCategory = "power" | "resources" | "other";
export type TimerCategory = "generator" | "equipment" | "cooldown" | "other";

export interface Resource {
  id: string;
  name: string;
  value: number;
  needed: number; // Total resources needed (replaces threshold)
  category: ResourceCategory;
}

export interface TimerReminder {
  interval: number; // Interval in ms (e.g., 5 minutes, 1 hour, etc.)
  message: string; // Custom message for the reminder
  enabled: boolean;
}

export interface Timer {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  threshold: number; // Time in ms when to trigger low warning
  category: TimerCategory;
  isActive: boolean;
  reminder?: TimerReminder; // Optional reminder settings
}