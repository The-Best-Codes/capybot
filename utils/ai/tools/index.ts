import { addReaction } from "./addReaction";
import { browseUrl } from "./browseUrl";
import { executeCode } from "./executeCode";
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
  [executeCode.name]: executeCode,
  [searchGoogle.name]: searchGoogle,
  [browseUrl.name]: browseUrl,
};

export type ToolName = keyof typeof tools;
