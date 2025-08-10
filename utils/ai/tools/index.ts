import { addReaction } from "./addReaction";
import { executeJsCode } from "./executeJsCode";
import { getAttachmentInfo } from "./getAttachmentInfo";
import { getServerInfo } from "./getServerInfo";
import { getUserInfo } from "./getUserInfo";
import { searchChannels } from "./searchChannels";
import { searchGoogle } from "./searchGoogle";
import { searchRoles } from "./searchRoles";
import { searchServerMembers } from "./searchServerMembers";

export const tools = {
  [getUserInfo.name]: getUserInfo,
  [getAttachmentInfo.name]: getAttachmentInfo,
  [getServerInfo.name]: getServerInfo,
  [addReaction.name]: addReaction,
  [searchChannels.name]: searchChannels,
  [searchRoles.name]: searchRoles,
  [searchServerMembers.name]: searchServerMembers,
  [executeJsCode.name]: executeJsCode,
  [searchGoogle.name]: searchGoogle,
};

export type ToolName = keyof typeof tools;
