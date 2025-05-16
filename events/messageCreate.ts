import { DynamicRetrievalConfigMode, GoogleGenAI } from "@google/genai";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
  TextChannel,
} from "discord.js";
import { Context } from "../utils/contextBuilder";
import { downloadImageVirtual } from "../utils/downloadImageVirtual";
import { logger } from "../utils/logger";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const systemInstruction = {
  role: "system",
  parts: [
    {
      text: `# General Rules
You never include \`<context>\` details in your responses. You use \`<context>\` details to personalize your responses.
You are never innappropriate.
You look at the most recent context and try to fit in, even if that means using all lowercase, bad grammar, punctuation, or spelling.
You do not use emoji unless specifically requested to.
You rarely ping users.

# General Information
You are CapyBot, a bot developed by BestCodes (https://bestcodes.dev) to run in Discord servers.
Your ID is ${process.env.DISCORD_APP_ID || "unknown"}.
Your training cutoff date is August 2024.
`,
    },
  ],
};

export default {
  event: Events.MessageCreate,
  handler: async (
    client: Client,
    message: OmitPartialGroupDMChannel<Message<boolean>>,
  ) => {
    if (message.author.bot) return; // Ignore bot messages

    const shouldRandomlyRespond = Math.random() < 0.1;
    const shouldRespond =
      shouldRandomlyRespond ||
      message.mentions.users.has(client.user?.id || "");

    if (!shouldRespond) return;

    try {
      await message.channel.sendTyping();

      const context = new Context();

      context.add("current_time_utc", new Date().toISOString());

      const serverAttributes = context
        .add("server_attributes")
        .desc(
          "These are details about the server where this message was sent.",
        );
      serverAttributes.add("id", message.guild?.id || "");
      serverAttributes.add("name", message.guild?.name || "");
      serverAttributes.add("icon_url", message.guild?.iconURL() || "");
      serverAttributes.add(
        "member_count",
        message.guild?.memberCount?.toString() || "",
      );

      const channelAttributes = context
        .add("channel_attributes")
        .desc(
          "These are details about the channel where this message was sent.",
        );
      channelAttributes.add("id", message.channel.id);
      // @ts-ignore
      channelAttributes.add("name", message.channel?.name || "Direct Message");
      channelAttributes.add("url", message.channel.url);
      channelAttributes.add("type", message.channel.type.toString());

      const userAttributes = context
        .add("user_attributes")
        .desc("These are details about the user who triggered this message.");
      userAttributes.add("id", message.author.id);
      userAttributes.add("name", message.author.username);
      userAttributes.add("avatar_url", message.author.avatarURL() || "");
      if (message.member?.nickname) {
        userAttributes.add("server_nickname", message.member?.nickname);
      }

      const conversationHistory = [];
      const clearHistoryMarker = "{% clear_history_before %}";
      let historyStartIndex = 0;

      if (message.channel instanceof TextChannel) {
        const messages = await message.channel.messages.fetch({ limit: 50 });
        const history = Array.from(messages.values()).reverse();

        for (let i = history.length - 2; i >= 0; i--) {
          const msg = history[i];
          if (msg.content.includes(clearHistoryMarker)) {
            historyStartIndex = i;
            break;
          }
        }

        for (let i = historyStartIndex; i < history.length - 1; i++) {
          const msg = history[i];
          if (msg.author.id === client.user?.id) {
            conversationHistory.push({
              role: "model",
              parts: [{ text: msg?.content || "Error: No message content" }],
            });
          } else {
            const historyContext = new Context();

            const userAttrs = historyContext
              .add("user_attributes")
              .desc("Details about the user who sent this message.");
            userAttrs.add("id", msg.author.id);
            userAttrs.add("name", msg.author.username);
            userAttrs.add("avatar_url", msg.author.avatarURL() || "");
            if (msg.member?.nickname) {
              userAttrs.add("server_nickname", msg.member?.nickname);
            }
            if (msg.author.bot) {
              userAttrs.add("is_bot", "true");
            }

            conversationHistory.push({
              role: "user",
              parts: [
                {
                  text: `${historyContext.toString()}\n\n${msg?.content || "Error: No message content"}`,
                },
              ],
            });
          }
        }
      }

      const imageAttachments = message.attachments.filter((attachment) =>
        attachment.contentType?.startsWith("image/"),
      );

      const currentMessageParts = [];

      currentMessageParts.push({
        text: `${context.toString()}\n\n${message?.content || "Error: No message content"}`,
      });

      if (imageAttachments.size > 0) {
        for (const [, attachment] of imageAttachments) {
          try {
            const imageBuffer = await downloadImageVirtual(attachment.url);
            const base64Image = imageBuffer.toString("base64");

            currentMessageParts.push({
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

      conversationHistory.push({
        role: "user",
        parts: currentMessageParts,
      });

      logger.log(
        `Responding to message ${message.id}. This is a response triggered ${shouldRandomlyRespond && !message.mentions.users.has(client.user?.id || "") ? "randomly" : "due to a ping"}.
There are ${conversationHistory.length} messages in the conversation history.`,
      );

      const modelName = process.env.GEMINI_AI_MODEL || "gemini-2.0-flash-001";
      const geminiModels = genAI.models;

      const response = await geminiModels.generateContent({
        model: modelName,
        contents: conversationHistory,
        config: {
          systemInstruction: systemInstruction,
          tools: [
            {
              googleSearch: {
                dynamicRetrievalConfig: {
                  dynamicThreshold: 0.5,
                  mode: DynamicRetrievalConfigMode.MODE_DYNAMIC,
                },
              },
            },
          ],
        },
      });

      const responseText = response.text;

      if (responseText) {
        let trimmedResponse;
        if (responseText.length > 1900) {
          trimmedResponse = `${responseText.slice(0, 1900)}\n[Truncated to less than 2000 characters]`;
        } else {
          trimmedResponse = responseText;
        }

        const row = new ActionRowBuilder<ButtonBuilder>();

        if (
          shouldRandomlyRespond &&
          !message.mentions.users.has(client.user?.id || "")
        ) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`thumbsup_${message.id}`)
              .setStyle(ButtonStyle.Success)
              .setEmoji("👍"),
            new ButtonBuilder()
              .setCustomId(`thumbsdown_${message.id}`)
              .setStyle(ButtonStyle.Danger)
              .setEmoji("👎"),
          );
        }

        if (
          response.candidates &&
          response.candidates[0]?.groundingMetadata?.groundingSupports &&
          response.candidates[0]?.groundingMetadata?.groundingSupports?.length >
            0
        ) {
          const numSites =
            response.candidates[0].groundingMetadata.groundingSupports.length;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`web_searches_${message.id}`)
              .setStyle(ButtonStyle.Secondary)
              .setLabel(
                `Searched ${numSites || "a few"} website${numSites === 1 ? "" : "s"}.`,
              )
              .setDisabled(true)
              .setEmoji("🔍"),
          );
        }

        await message.reply({
          content: `${trimmedResponse}`,
          components: row.components.length > 0 ? [row] : [],
        });
      } else {
        await message.reply("Oops! The AI didn't respond.");
      }
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);
      await message.reply(
        "Oh no! Something went wrong when I tried to respond to you. :(",
      );
    }
  },
};
