import { generateText, stepCountIs } from "ai";
import {
  ChannelType,
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { globalModel } from "../clients/ai";
import { buildContext } from "../utils/ai/context";
import { IGNORE_PHRASE, systemInstructions } from "../utils/ai/systemPrompt";
import { createTools } from "../utils/ai/tools";
import { analytics } from "../utils/analytics/index";
import { checkDevAuth } from "../utils/auth/devAuth";
import { hasPermission } from "../utils/auth/permissions";
import { conversationManager } from "../utils/conversation/manager";
import { toolCallStore, type ToolCall } from "../utils/db/toolCallsDb";
import { logger } from "../utils/logger";

export default {
  event: Events.MessageCreate,
  handler: async (
    client: Client,
    message: OmitPartialGroupDMChannel<Message<boolean>> | Message<boolean>,
  ) => {
    // Track event
    analytics.trackEvent({ eventName: Events.MessageCreate }).catch(() => {});

    if (message.author.bot) return;

    const botId = client.user!.id;
    const isDM = message.channel.type === ChannelType.DM;

    if (isDM) {
      const authResult = checkDevAuth(
        message.author.id,
        message.author.username,
      );
      if (!authResult.loggedIn) {
        await message.reply(
          "Sign in as a CapyBot developer to use CapyBot in DMs. Use `/dev_login` in a server first.",
        );
        return;
      }

      if (!hasPermission(authResult.permissions, "dm")) {
        await message.reply(
          "Your developer key does not have permission to use DMs. Contact an admin to update your key permissions.",
        );
        return;
      }

      logger.debug(`Dev DM from ${message.author.username}: ${message.id}`);
    }

    const isMentioned = message.mentions.has(botId);
    let isReplyToBot = false;

    if (message.reference?.messageId) {
      try {
        const repliedMsg =
          message.channel.messages.cache.get(message.reference.messageId) ||
          (await message.channel.messages.fetch(message.reference.messageId));
        isReplyToBot = repliedMsg.author.id === botId;
      } catch (error) {
        isReplyToBot = false;
      }
    }

    if (isDM) {
      isReplyToBot = true;
    }

    const decision = conversationManager.shouldProcess(
      message as OmitPartialGroupDMChannel<Message<boolean>>,
      botId,
      isMentioned,
      isReplyToBot,
    );

    if (!decision.process) {
      analytics
        .trackMessage({
          messageId: message.id,
          userId: message.author.id,
          channelId: message.channelId,
          guildId: message.guildId,
          isDM,
          isMentioned,
          isReply: isReplyToBot,
          processReason: decision.reason,
          messageLength: message.content.length,
          hasAttachments: message.attachments.size > 0,
          attachmentCount: message.attachments.size,
          responseGenerated: false,
        })
        .catch((err) =>
          logger.error(`Failed to track message analytics: ${err}`),
        );
      return;
    }

    const messageStartTime = Date.now();

    try {
      conversationManager.setGenerating(message.channelId, true);

      const isExplicit = ["explicit_ping", "keyword_trigger"].includes(
        decision.reason,
      );
      if (isExplicit && "sendTyping" in message.channel) {
        message.channel.sendTyping();
      }

      const context = await buildContext(message);
      logger.debug(`Processing msg ${message.id}. Reason: ${decision.reason}`);

      const prompt = context;
      const tools = createTools(message.channel);

      const aiStartTime = Date.now();
      const result = await generateText({
        model: globalModel,
        prompt,
        system: systemInstructions,
        tools,
        stopWhen: stepCountIs(3),
      });
      const aiEndTime = Date.now();

      const { text } = result;

      if (text.includes(IGNORE_PHRASE)) {
        logger.info(`AI Decided to ignore message: ${message.id}`);

        analytics
          .trackAI({
            messageId: message.id,
            modelUsed: globalModel.modelId,
            toolCallCount: 0,
            toolsUsed: [],
            stepCount: result.steps.length,
            generationTime: aiEndTime - aiStartTime,
            success: true,
            decisionReason: "ignored",
          })
          .catch((err) => logger.error(`Failed to track AI analytics: ${err}`));

        conversationManager.setGenerating(message.channelId, false);
        return;
      }

      const allToolCalls: ToolCall[] = [];
      const toolCallIdToResult: Record<string, any> = {};

      result.steps.forEach((step, stepIndex) => {
        step.toolResults.forEach((tr) => {
          toolCallIdToResult[tr.toolCallId] = tr;
        });
      });

      result.steps.forEach((step, stepIndex) => {
        step.toolCalls.forEach((tc) => {
          const result = toolCallIdToResult[tc.toolCallId];
          const toolCall: ToolCall = {
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            input: tc.input as Record<string, any>,
            stepNumber: stepIndex,
            timestamp: Date.now(),
            isError: result?.isError ?? false,
            error: result?.isError ? result.output : undefined,
            output: result?.isError ? undefined : result?.output,
            executionTime: undefined,
          };
          allToolCalls.push(toolCall);
        });
      });

      if (allToolCalls.length > 0) {
        toolCallStore.save(message.id, allToolCalls).catch((error) => {
          logger.error(
            `Failed to save tool calls for message ${message.id}: ${error}`,
          );
        });
      }

      if (text) {
        await message.reply({
          content: text,
          allowedMentions: { repliedUser: false, parse: [] },
        });
      } else {
        logger.info(`No text generated for message ${message.id}`);
      }

      const messageEndTime = Date.now();

      analytics
        .trackMessage({
          messageId: message.id,
          userId: message.author.id,
          channelId: message.channelId,
          guildId: message.guildId,
          isDM,
          isMentioned,
          isReply: isReplyToBot,
          processReason: decision.reason,
          messageLength: message.content.length,
          hasAttachments: message.attachments.size > 0,
          attachmentCount: message.attachments.size,
          responseGenerated: !!text,
          responseTime: messageEndTime - messageStartTime,
        })
        .catch((err) =>
          logger.error(`Failed to track message analytics: ${err}`),
        );

      const toolsUsed = Array.from(
        new Set(allToolCalls.map((tc) => tc.toolName)),
      );
      analytics
        .trackAI({
          messageId: message.id,
          modelUsed: globalModel.modelId,
          toolCallCount: allToolCalls.length,
          toolsUsed,
          stepCount: result.steps.length,
          generationTime: aiEndTime - aiStartTime,
          success: true,
          decisionReason: decision.reason,
        })
        .catch((err) => logger.error(`Failed to track AI analytics: ${err}`));

      conversationManager.markInteraction(message.channelId, message.author.id);
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);

      const messageEndTime = Date.now();

      analytics
        .trackMessage({
          messageId: message.id,
          userId: message.author.id,
          channelId: message.channelId,
          guildId: message.guildId,
          isDM,
          isMentioned,
          isReply: isReplyToBot,
          processReason: decision.reason,
          messageLength: message.content.length,
          hasAttachments: message.attachments.size > 0,
          attachmentCount: message.attachments.size,
          responseGenerated: false,
          responseTime: messageEndTime - messageStartTime,
          error: error instanceof Error ? error.message : String(error),
        })
        .catch((err) =>
          logger.error(`Failed to track message analytics: ${err}`),
        );

      conversationManager.setGenerating(message.channelId, false);
    }
  },
};
