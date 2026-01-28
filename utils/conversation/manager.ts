import { Collection, type Message } from "discord.js";

const CONFIG = {
  HOT_WINDOW_MS: 10 * 1000,
  REACTION_WINDOW_MS: 5 * 1000,
  OVERHEAR_RATE: 0.02,
  TRIGGER_KEYWORDS: ["capybot"],
  MAX_MESSAGE_DISTANCE: 5,
};

interface ChannelState {
  lastBotMessageTime: number;
  lastRepliedToUserId: string | null;
  isGenerating: boolean;
}

class ConversationManager {
  private states = new Collection<string, ChannelState>();

  public setGenerating(channelId: string, isGenerating: boolean) {
    const state = this.states.get(channelId) || {
      lastBotMessageTime: 0,
      lastRepliedToUserId: null,
      isGenerating: false,
    };
    state.isGenerating = isGenerating;
    this.states.set(channelId, state);
  }

  public markInteraction(channelId: string, userId: string) {
    this.states.set(channelId, {
      lastBotMessageTime: Date.now(),
      lastRepliedToUserId: userId,
      isGenerating: false,
    });
  }

  public shouldProcess(
    message: Message,
    botId: string,
    isMentioned: boolean,
    isReplyToBot: boolean,
  ): { process: boolean; reason: string } {
    const { channel, author, content } = message;
    const state = this.states.get(channel.id);
    const now = Date.now();

    // Always process explicit interactions
    if (isMentioned || isReplyToBot) {
      return { process: true, reason: "explicit_ping" };
    }
    // Uncomment to disable all other methods, which is more economical
    // else {
    //   return { process: false, reason: "other_methods_disabled" };
    // }

    // Always process keywords
    const lowerContent = content.toLowerCase();
    if (CONFIG.TRIGGER_KEYWORDS.some((kw) => lowerContent.includes(kw))) {
      return { process: true, reason: "keyword_trigger" };
    }

    // Random chance to "overhear"
    if (content.length > 10 && Math.random() < CONFIG.OVERHEAR_RATE) {
      return { process: true, reason: "random_overhear" };
    }

    // Check "Hot Window" logic
    if (state) {
      if (state.isGenerating) {
        return { process: false, reason: "busy_generating" };
      }

      const timeSinceLastMsg = now - state.lastBotMessageTime;

      if (timeSinceLastMsg < CONFIG.HOT_WINDOW_MS) {
        // Check message distance
        const recentMessages = channel.messages.cache
          .filter((m) => m.id !== message.id)
          .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
          .first(CONFIG.MAX_MESSAGE_DISTANCE);

        const botSpokeRecently = recentMessages.some((m) => m.author.id === botId);

        if (!botSpokeRecently) {
          return { process: false, reason: "cold_channel_distance" };
        }

        // If we are here, Time is good AND Distance is good.
        if (state.lastRepliedToUserId === author.id) {
          return { process: true, reason: "direct_followup" };
        }

        if (timeSinceLastMsg < CONFIG.REACTION_WINDOW_MS) {
          return { process: true, reason: "quick_reaction_from_other" };
        }

        return { process: false, reason: "interruption_outside_window" };
      }
    }

    return { process: false, reason: "cold_channel" };
  }
}

export const conversationManager = new ConversationManager();
