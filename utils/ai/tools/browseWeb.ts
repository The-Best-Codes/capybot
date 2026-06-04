import { tool } from "ai";
import { z } from "zod";
import TurndownService from "turndown";
import { logger } from "../../logger";

const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
  linkReferenceStyle: "full",
});

function htmlToMarkdown(html: string): string {
  let text = html;

  text = text.replace(/<script[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style\s*>/gi, "");
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript\s*>/gi, "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  text = turndown.turndown(text);

  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

export const createBrowseWebTool = () =>
  tool({
    description:
      "Fetches content from a URL and returns it as Markdown (default) or raw HTML. Use this to browse websites, read documentation, check API responses, or look up information online. Results are limited by default but can be paginated with offset/limit parameters.",
    inputSchema: z.object({
      url: z.url().describe("The full URL (including protocol) to fetch content from"),
      format: z
        .enum(["markdown", "html"])
        .optional()
        .default("markdown")
        .describe(
          'Output format: "markdown" converts HTML to readable Markdown (best for most sites), "html" returns raw HTML source',
        ),
      limit: z
        .number()
        .min(1)
        .max(25000)
        .optional()
        .default(2000)
        .describe(
          "Maximum number of characters to return (1-25000). Start small to keep responses manageable, then paginate with offset if you need more.",
        ),
      offset: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe(
          "Character offset for pagination. Use 0 for the first page, then set to the previous offset + limit to get the next chunk.",
        ),
    }),
    execute: async ({ url, format, limit, offset }) => {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "CapyBot/1.0 (AI Assistant; https://bestcodes.dev)",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status} ${response.statusText}`,
          };
        }

        const contentType = response.headers.get("content-type") || "";
        const rawText = await response.text();
        const isHtml = contentType.includes("text/html");
        const finalUrl = response.url;

        let content: string;
        if (format === "html") {
          content = rawText;
        } else if (isHtml) {
          content = htmlToMarkdown(rawText);
        } else {
          content = rawText;
        }

        const totalLength = content.length;
        const sliced = content.slice(offset, offset + limit);

        return {
          success: true,
          content: sliced,
          metadata: {
            url: finalUrl,
            contentType,
            totalLength,
            returnedLength: sliced.length,
            offset,
            limit,
            hasMore: offset + limit < totalLength,
          },
        };
      } catch (error) {
        logger.error("Browse web failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch URL",
        };
      }
    },
  });
