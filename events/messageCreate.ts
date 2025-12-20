import { generateText, stepCountIs } from "ai";
import {
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { globalModel } from "../clients/ai";
import { buildContext } from "../utils/ai/context";
import { IGNORE_PHRASE, systemInstructions } from "../utils/ai/systemPrompt";
import { createTools } from "../utils/ai/tools";
import { conversationManager } from "../utils/conversation/manager";
import { toolCallStore, type ToolCall } from "../utils/db/toolCallsDb";
import { logger } from "../utils/logger";

export default {
  event: Events.MessageCreate,
  handler: async (
    client: Client,
    message: OmitPartialGroupDMChannel<Message<boolean>>,
  ) => {
    if (message.author.bot) return;

    const botId = client.user!.id;

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

    const decision = conversationManager.shouldProcess(
      message,
      botId,
      isMentioned,
      isReplyToBot,
    );

    if (!decision.process) return;

    try {
      conversationManager.setGenerating(message.channelId, true);

      const isExplicit = ["explicit_ping", "keyword_trigger"].includes(
        decision.reason,
      );
      if (isExplicit) {
        message.channel.sendTyping();
      }

      const context = await buildContext(message);
      logger.debug(`Processing msg ${message.id}. Reason: ${decision.reason}`);

      const prompt = context;
      const tools = createTools(message.channel);

      const result = await generateText({
        model: globalModel,
        prompt,
        system: systemInstructions,
        tools,
        stopWhen: stepCountIs(3),
      });

      const { text } = result;

      if (text.includes(IGNORE_PHRASE)) {
        logger.info(`AI Decided to ignore message: ${message.id}`);
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

      await message.reply({
        content: text,
        allowedMentions: { repliedUser: false, parse: [] },
      });

      conversationManager.markInteraction(message.channelId, message.author.id);
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);
      conversationManager.setGenerating(message.channelId, false);
    }
  },
};
