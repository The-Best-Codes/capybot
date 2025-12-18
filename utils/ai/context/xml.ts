export function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toUTCString();
}

export function serializeToXML(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  // if (value === false) return "";
  // if (Array.isArray(value) && value.length === 0) return "";

  const open = `<${key}>`;
  const close = `</${key}>`;

  if (value === true) {
    return `${open}true${close}`;
  }

  if (typeof value === "string") {
    return `${open}${escapeXML(value)}${close}`;
  }

  if (typeof value === "number") {
    return `${open}${value}${close}`;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object") {
          return Object.entries(item as Record<string, unknown>)
            .map(([k, v]) => serializeToXML(k, v))
            .join("");
        }
        return `<item>${serializeToXML("value", item)}</item>`;
      })
      .join("");
  }

  if (typeof value === "object") {
    const content = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => serializeToXML(k, v))
      .join("");

    if (!content) return "";

    return `${open}${content}${close}`;
  }

  return `${open}${String(value)}${close}`;
}
