export interface SerializedAttachment {
  id: string;
  name: string;
  url: string;
  mime_type: string | null;
  size: number;
  width: number | null;
  height: number | null;
}

export interface ReferencedMessage {
  id: string;
  author_id: string;
  content: string;
  timestamp: string;
  referenced_message_id: string | null;
  attachments?: SerializedAttachment[];
}
