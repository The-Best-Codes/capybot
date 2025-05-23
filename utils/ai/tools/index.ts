import { getAttachmentInfo } from "./getAttachmentInfo";
import { getUserInfo } from "./getUserInfo";
import { searchChannels } from "./searchChannels";
import { searchRoles } from "./searchRoles";
import { searchServerMembers } from "./searchServerMembers";

export const tools = {
  [getUserInfo.name]: getUserInfo,
  [searchChannels.name]: searchChannels,
  [searchRoles.name]: searchRoles,
  [searchServerMembers.name]: searchServerMembers,
  [getAttachmentInfo.name]: getAttachmentInfo,
};

export type ToolName = keyof typeof tools;
