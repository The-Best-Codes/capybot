import { addReaction } from "./addReaction";
import { getAttachmentInfo } from "./getAttachmentInfo";
import { getUserInfo } from "./getUserInfo";
import { searchChannels } from "./searchChannels";
import { searchRoles } from "./searchRoles";
import { searchServerMembers } from "./searchServerMembers";

export const tools = {
  [getUserInfo.name]: getUserInfo,
  [getAttachmentInfo.name]: getAttachmentInfo,
  [addReaction.name]: addReaction,
  [searchChannels.name]: searchChannels,
  [searchRoles.name]: searchRoles,
  [searchServerMembers.name]: searchServerMembers,
};

export type ToolName = keyof typeof tools;
