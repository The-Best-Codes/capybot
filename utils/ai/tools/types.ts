export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
  function: (args: any) => Promise<any>;
}
