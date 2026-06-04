import { tool } from "ai";
import { load } from "cheerio";
import { z } from "zod";
import { logger } from "../../logger";

const duckDuckGoSearchUrl = "https://html.duckduckgo.com/html/";

const searchHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

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
          kl: "us-en",
        });

        const response = await fetch(`${duckDuckGoSearchUrl}?${searchParams}`, {
          headers: searchHeaders,
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status} ${response.statusText}`,
          };
        }

        const html = await response.text();
        const results = collectResults(html).slice(0, limit);

        if (results.length === 0) {
          return {
            success: false,
            error: "No search results found",
            query,
            results: [],
            resultCount: 0,
          };
        }

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

function collectResults(html: string) {
  const $ = load(html);
  const results: SearchResult[] = [];

  $(".result.results_links").each((_, element) => {
    const titleLink = $(element).find("a.result__a").first();
    const snippetNode = $(element).find(".result__snippet").first();

    const href = titleLink.attr("href");
    const url = href ? extractResultUrl(href) : undefined;
    const title = normalizeText(titleLink.text());
    const snippet = normalizeText(snippetNode.text());

    if (!url || !title) return;

    results.push({ title, url, snippet });
  });

  return dedupeResults(results);
}

function extractResultUrl(href: string) {
  const decodedHref = decodeHtml(href);
  const absoluteHref = decodedHref.startsWith("//") ? `https:${decodedHref}` : decodedHref;

  try {
    const url = new URL(absoluteHref);
    const redirectTarget = url.searchParams.get("uddg");
    return redirectTarget ? decodeURIComponent(redirectTarget) : absoluteHref;
  } catch {
    return absoluteHref;
  }
}

function dedupeResults(results: SearchResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    if (seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  });
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return load(value).text();
}
