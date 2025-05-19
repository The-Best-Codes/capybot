import { scheduleMeeting } from "./scheduleMeeting";

export const tools = {
  [scheduleMeeting.name]: scheduleMeeting,
};

export type ToolName = keyof typeof tools;
