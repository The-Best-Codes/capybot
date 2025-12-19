import { google } from "@ai-sdk/google";

export const globalModel = google("gemini-2.5-flash");
export const attachmentModel = google("gemini-2.5-flash-lite");
