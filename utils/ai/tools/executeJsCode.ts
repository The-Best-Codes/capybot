import { Type } from "@google/genai";
import ivm from "isolated-vm";
import { logger } from "../../logger";
import type { ToolDefinition } from "./types";

async function executeJsCodeFn({ code }: { code: string }): Promise<{
  status: string;
  result?: string;
  error?: string;
}> {
  let result: any;
  let error: string | undefined;
  let isolate: ivm.Isolate | undefined;

  try {
    isolate = new ivm.Isolate({
      memoryLimit: 256, // Memory limit in MB
    });

    const context = await isolate.createContext();

    // await context.global.set("log", new ivm.Reference(logger.info));

    const script = await isolate.compileScript(code, {
      filename: "sandbox.js",
    });

    result = await script.run(context, {
      timeout: 10000,
      copy: true,
    });
  } catch (e: any) {
    logger.error("Error executing JavaScript in sandbox:", e);
    error = `Execution failed: ${e.message}`;
  } finally {
    if (isolate) {
      try {
        isolate.dispose();
      } catch (disposeError: any) {
        logger.error("Error disposing isolate:", disposeError);
        if (!error) {
          error = `Execution completed but encountered an error during cleanup: ${disposeError.message}`;
        }
      }
    }
  }

  if (error) {
    return { status: "failed", error };
  } else {
    let resultString;
    try {
      resultString = JSON.stringify(result);
    } catch (jsonError: any) {
      logger.error("Error stringifying JS execution result:", jsonError);
      resultString = `Execution succeeded, but result could not be serialized: ${jsonError.message}. Result type: ${typeof result}`;
    }
    return { status: "success", result: resultString };
  }
}

export const executeJsCode: ToolDefinition = {
  name: "execute_js_code",
  description:
    "Executes arbitrary JavaScript code in a secure sandbox using V8 isolates. Useful for calculations, data processing, and simple logic execution.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      code: {
        type: Type.STRING,
        description:
          "The JavaScript code to execute within the sandbox. It should be a string containing valid JS.",
      },
    },
    required: ["code"],
  },
  function: executeJsCodeFn,
};
