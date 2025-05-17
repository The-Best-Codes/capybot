import { Message } from "discord.js";
import { downloadImageVirtual } from "../downloadImageVirtual";
import { logger } from "../logger";

export async function buildImageParts(message: Message) {
  const imageAttachments = message.attachments.filter((attachment) =>
    attachment.contentType?.startsWith("image/"),
  );

  const imageParts = [];

  if (imageAttachments.size > 0) {
    for (const [, attachment] of imageAttachments) {
      try {
        const imageBuffer = await downloadImageVirtual(attachment.url);
        const base64Image = imageBuffer.toString("base64");

        imageParts.push({
          inlineData: {
            data: base64Image,
            mimeType: attachment.contentType || "image/jpeg",
          },
        });
      } catch (error) {
        logger.error(`Error processing image attachment: ${error}`);
      }
    }
  }

  return imageParts;
}
