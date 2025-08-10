import { Type } from "@google/genai";
import { ActivityType, Client, Events } from "discord.js";
import { genAI } from "../clients/googleAi";
import { logger } from "../utils/logger";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      description:
        "A short, creative status message for a casual Discord bot named CapyBot. 1 to 4 words.",
    },
  },
  required: ["status"],
};

export default {
  event: Events.ClientReady,
  handler: async (client: Client) => {
    try {
      if (!client.user) {
        logger.error("Client user is not set.");
        return;
      }
      logger.info("Setting presence...");

      const models = genAI.models;

      const prompt =
        "Generate a short, creative status message. It can be simple, chill, or funny. Do not be afraid to have bad grammar or no capitalization.";

      const parts = [{ text: prompt }];

      const result = await models.generateContent({
        model: process.env.GEMINI_AI_MODEL || "gemini-2.0-flash-lite",
        contents: parts,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 2,
        },
      });

      const response = result.text;

      let aiStatus = "just chillin'";

      if (response) {
        try {
          const parsedResponse = JSON.parse(response);
          aiStatus = parsedResponse.status || aiStatus;
        } catch (error) {
          logger.error("Error parsing AI response:", error);
        }
      }

      client.user.setPresence({
        activities: [
          {
            name: "CapyBot",
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore Discord.js does not have this property, but it is valid
            state: aiStatus,
            type: ActivityType.Custom,
          },
        ],
        status: "online",
      });
    } catch (err) {
      logger.error("Error setting presence:", err);
    } finally {
      logger.success("Presence set.");
    }
  },
};
