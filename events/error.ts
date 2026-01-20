import { Client, Events } from "discord.js";
import { analytics } from "../utils/analytics/index";
import { logger } from "../utils/logger";

export default {
  event: Events.Error,
  handler: (client: Client, error: Error) => {
    analytics
      .trackEvent({
        eventName: Events.Error,
        metadata: { errorMessage: error.message },
      })
      .catch(() => {});

    logger.error("An error occurred:", error);
  },
};
