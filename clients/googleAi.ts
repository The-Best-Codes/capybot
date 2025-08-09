import { GoogleGenAI } from "@google/genai";

import { configDotenv } from "dotenv";
configDotenv();

export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
