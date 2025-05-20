import { getUserInfo } from "./getUserInfo";
import { searchChannels } from "./searchChannels";
import { searchRoles } from "./searchRoles";
import { searchServerMembers } from "./searchServerMembers";
import { setStatus } from "./setStatus";

export const tools = {
  [setStatus.name]: setStatus,
  [getUserInfo.name]: getUserInfo,
  [searchChannels.name]: searchChannels,
  [searchRoles.name]: searchRoles,
  [searchServerMembers.name]: searchServerMembers,
};

export type ToolName = keyof typeof tools;
