import { setStatus } from "./setStatus";

export const tools = {
  [setStatus.name]: setStatus,
};

export type ToolName = keyof typeof tools;
