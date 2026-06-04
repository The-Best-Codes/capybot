import { tool } from "ai";
import { z } from "zod";
import { logger } from "../../logger";

const duckDuckGoApiUrl = "https://api.duckduckgo.com/";

export const createSearchWebTool = () =>
  tool({
    description:
      "Searches the web for pages matching a query and returns result titles, URLs, and snippets. Use this to find relevant web pages before browsing a specific result with browseWeb.",
    inputSchema: z.object({
      query: z.string().min(1).describe("The web search query"),
      limit: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Maximum number of search results to return (1-10)"),
    }),
    execute: async ({ query, limit }) => {
      try {
        const searchParams = new URLSearchParams({
          q: query,
          format: "json",
          no_html: "1",
          no_redirect: "1",
          skip_disambig: "1",
        });

        const response = await fetch(`${duckDuckGoApiUrl}?${searchParams}`, {
          headers: {
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status} ${response.statusText}`,
          };
        }

        const data = (await response.json()) as DuckDuckGoResponse;
        const results = collectResults(data).slice(0, limit);

        return {
          success: true,
          query,
          results,
          resultCount: results.length,
        };
      } catch (error) {
        logger.error("Search web failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to search web",
        };
      }
    },
  });

type DuckDuckGoTopic = {
  FirstURL?: string;
  Text?: string;
  Result?: string;
  Topics?: DuckDuckGoTopic[];
};

type DuckDuckGoResponse = {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: DuckDuckGoTopic[];
  Results?: DuckDuckGoTopic[];
};

function collectResults(data: DuckDuckGoResponse) {
  const results: { title: string; url: string; snippet: string }[] = [];

  if (data.AbstractURL && data.AbstractText) {
    results.push({
      title: data.Heading || data.AbstractURL,
      url: data.AbstractURL,
      snippet: data.AbstractText,
    });
  }

  for (const topic of [...(data.Results || []), ...(data.RelatedTopics || [])]) {
    addTopicResults(topic, results);
  }

  return results;
}

function addTopicResults(
  topic: DuckDuckGoTopic,
  results: { title: string; url: string; snippet: string }[],
) {
  if (topic.Topics) {
    for (const nestedTopic of topic.Topics) {
      addTopicResults(nestedTopic, results);
    }
    return;
  }

  if (!topic.FirstURL || !topic.Text) return;

  results.push({
    title: extractTitle(topic),
    url: topic.FirstURL,
    snippet: topic.Text,
  });
}

function extractTitle(topic: DuckDuckGoTopic) {
  const textTitle = topic.Text?.split(" - ")[0];
  if (textTitle) return textTitle;

  const htmlTitle = topic.Result?.match(/<a[^>]*>(.*?)<\/a>/i)?.[1];
  if (htmlTitle) return htmlTitle.replace(/<[^>]+>/g, "");

  return topic.FirstURL || "Search result";
}
