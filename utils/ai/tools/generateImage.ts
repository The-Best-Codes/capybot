import { tool } from "ai";
import { z } from "zod";
import { logger } from "../../logger";

export const createGenerateImageTool = () =>
  tool({
    description:
      "Generates an image using Pollinations AI based on a textual prompt, width, and height.",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          'A detailed prompt describing what image to generate. Be specific. Example: "A photorealistic image of a capybara wearing a party hat".',
        ),
      width: z
        .number()
        .optional()
        .describe("The width of the generated image. Defaults to 1024."),
      height: z
        .number()
        .optional()
        .describe("The height of the generated image. Defaults to 1024."),
    }),
    execute: async ({ prompt, width, height }) => {
      try {
        const imageWidth = width || 1024;
        const imageHeight = height || 1024;

        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${imageWidth}&height=${imageHeight}&model=analog-diffusion&nologo=true&enhance=true&safe=true`;

        const response = await fetch(imageUrl);

        if (!response.ok) {
          return {
            success: false,
            message: `Failed to fetch image from Pollinations AI. Status: ${response.status} ${response.statusText}`,
          };
        }

        return {
          success: true,
          imageUrl,
        };
      } catch (error) {
        logger.error("Image generation failed:", error);
        return {
          success: false,
          message: "Failed to generate image from Pollinations AI.",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  });
