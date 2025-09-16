import { Type } from "@google/genai";
import { logger } from "../../logger";
import type { ToolDefinition } from "./types";

async function generateImageFn({
  prompt,
  width,
  height,
}: {
  prompt: string;
  width?: number;
  height?: number;
}): Promise<{
  success: boolean;
  images?: { base64: string; mimeType: string }[];
  message?: string;
  error?: any;
}> {
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
      message: `Image URL: ${imageUrl}`,
    };
  } catch (error: any) {
    logger.error("Image generation failed:", error);
    return {
      success: false,
      message: "Failed to generate image from Pollinations AI.",
      error,
    };
  }
}

export const generateImage: ToolDefinition = {
  name: "generate_image",
  description:
    "Generates an image using Pollinations AI based on a textual prompt, width, and height.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: `A detailed prompt describing what image to generate. Be specific. Example: "A photorealistic image of a capybara wearing a party hat".`,
      },
      width: {
        type: Type.NUMBER,
        description: "The width of the generated image. Defaults to 1024.",
      },
      height: {
        type: Type.NUMBER,
        description: "The height of the generated image. Defaults to 1024.",
      },
    },
    required: ["prompt"],
  },
  function: generateImageFn,
};
