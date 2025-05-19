import { Type } from "@google/genai";
import type { ToolDefinition } from "./types";

export const scheduleMeeting: ToolDefinition = {
  name: "schedule_meeting",
  description:
    "Schedules a meeting with specified attendees at a given time and date.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      attendees: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of people attending the meeting.",
      },
      date: {
        type: Type.STRING,
        description: 'Date of the meeting (e.g., "2024-07-29")',
      },
      time: {
        type: Type.STRING,
        description: 'Time of the meeting (e.g., "15:00")',
      },
      topic: {
        type: Type.STRING,
        description: "The subject or topic of the meeting.",
      },
    },
    required: ["attendees", "date", "time", "topic"],
  },
  function: async (args: any) => {
    // In a real application, this is where you would
    // actually schedule the meeting.  For this example,
    // we just return the arguments.
    console.log("Scheduling meeting with arguments:", args);
    return { success: true, message: "Meeting scheduled", details: args };
  },
};
