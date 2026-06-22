export interface GanttTask {
  id: string;
  name: string;
  color: string;
  cells: boolean[];
  sortOrder: number;
}

export interface GanttProject {
  id: string;
  name: string;
  totalWeeks: number;
  sortOrder: number;
  tasks: GanttTask[];
}

// API response shapes
export type ProjectsResponse = GanttProject[];

export interface ApiError {
  error: string;
}

// Template tasks used when creating a new project
export const TEMPLATE_TASKS: Omit<GanttTask, "id" | "cells">[] = [
  { name: "Foreign Goods LC",              color: "#C0392B", sortOrder: 0 },
  { name: "Local Goods Procurement",       color: "#2980B9", sortOrder: 1 },
  { name: "Module Structure Installation", color: "#E67E22", sortOrder: 2 },
  { name: "PV Module Installation",        color: "#8E44AD", sortOrder: 3 },
  { name: "Inverter Installation",         color: "#16A085", sortOrder: 4 },
  { name: "AC, DC Cable Routing",          color: "#7D6608", sortOrder: 5 },
  { name: "Others Installation",           color: "#6C3483", sortOrder: 6 },
  { name: "Testing & Commissioning",       color: "#E74C3C", sortOrder: 7 },
  { name: "Commercial Operation (COD)",    color: "#27AE60", sortOrder: 8 },
];

export const DEFAULT_WEEKS = 16;

export const BAR_COLORS = [
  "#C0392B","#2980B9","#E67E22","#8E44AD","#16A085",
  "#7D6608","#6C3483","#E74C3C","#27AE60","#1A5276","#117A65","#BA4A00",
];
