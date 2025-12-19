import type { Attachment } from "discord.js";
import { escapeXML, serializeToXML } from "./xml";

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

export function attachmentToXML(attachment: SerializedAttachment): string {
  const content = [
    serializeToXML("name", attachment.name),
    serializeToXML("url", attachment.url),
    attachment.mime_type
      ? serializeToXML("mime_type", attachment.mime_type)
      : "",
    serializeToXML("size", attachment.size),
    attachment.width ? serializeToXML("width", attachment.width) : "",
    attachment.height ? serializeToXML("height", attachment.height) : "",
  ]
    .filter((x) => x.length > 0)
    .join("");

  return `<attachment id="${escapeXML(attachment.id)}">${content}</attachment>`;
}
