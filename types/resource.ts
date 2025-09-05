export type ResourceCategory = "power" | "resources" | "other";
export type TimerCategory = "generator" | "equipment" | "cooldown" | "other";

export interface Resource {
  id: string;
  name: string;
  value: number;
  threshold: number;
  category: ResourceCategory;
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
}