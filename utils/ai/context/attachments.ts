import type { Attachment } from "discord.js";

export interface SerializedAttachment {
  id: string;
  name: string;
  url: string;
  mime_type: string | null;
  size: number;
  width: number | null;
  height: number | null;
}

export function serializeAttachment(
  attachment: Attachment,
): SerializedAttachment {
  return {
    id: attachment.id,
    name: attachment.name,
    url: attachment.url,
    mime_type: attachment.contentType || null,
    size: attachment.size,
    width: attachment.width || null,
    height: attachment.height || null,
  };
}
