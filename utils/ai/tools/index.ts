import { getUserInfo } from "./getUserInfo";
import { setStatus } from "./setStatus";

export const tools = {
  [setStatus.name]: setStatus,
  [getUserInfo.name]: getUserInfo,
};

export type ToolName = keyof typeof tools;
