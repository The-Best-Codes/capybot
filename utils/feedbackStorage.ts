import { Message } from "discord.js";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

interface FeedbackData {
  messageId: string;
  isPositive: boolean;
  userId: string;
  timestamp: string;
  lastUpdated: string;
  surroundingMessages: {
    id: string;
    content: string;
    authorId: string;
    authorUsername: string;
    timestamp: string;
    isBot: boolean;
  }[];
}

const STORAGE_DIR = path.join(process.cwd(), "data", "feedback");

const ensureStorageDir = (): void => {
  try {
    if (!fs.existsSync(path.join(process.cwd(), "data"))) {
      fs.mkdirSync(path.join(process.cwd(), "data"));
    }

    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR);
    }
  } catch (error) {
    logger.error(`Error creating storage directory: ${error}`);
    throw error;
  }
};

export const storeFeedback = async (
  messageId: string,
  isPositive: boolean,
  userId: string,
  surroundingMessages: Message[],
): Promise<void> => {
  try {
    ensureStorageDir();

    const formattedMessages = surroundingMessages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      authorId: msg.author.id,
      authorUsername: msg.author.username,
      timestamp: msg.createdAt.toISOString(),
      isBot: msg.author.bot,
    }));

    const filename = `${messageId}_${userId}.json`;
    const filePath = path.join(STORAGE_DIR, filename);

    let feedbackData: FeedbackData;

    // Check if we already have feedback from this user for this message
    if (fs.existsSync(filePath)) {
      // Read existing data
      const existingData = JSON.parse(
        fs.readFileSync(filePath, "utf8"),
      ) as FeedbackData;

      // Update the existing data
      feedbackData = {
        ...existingData,
        isPositive, // Update with new feedback
        lastUpdated: new Date().toISOString(),
        surroundingMessages: formattedMessages, // Update with current context
      };

      logger.info(
        `Updating existing feedback for message ${messageId} from user ${userId}`,
      );
    } else {
      // Create new feedback data
      feedbackData = {
        messageId,
        isPositive,
        userId,
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        surroundingMessages: formattedMessages,
      };

      logger.info(
        `Creating new feedback entry for message ${messageId} from user ${userId}`,
      );
    }

    fs.writeFileSync(filePath, JSON.stringify(feedbackData, null, 2));
    logger.info(
      `Stored feedback for message ${messageId} from user ${userId} in ${filename}`,
    );
  } catch (error) {
    logger.error(`Error storing feedback: ${error}`);
    throw error;
  }
};
