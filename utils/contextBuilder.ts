export class ContextElement {
  private name: string;
  private value: string | null;
  private description: string | null;
  private children: ContextElement[];

  constructor(name: string, value: string | null = null) {
    this.name = name;
    this.value = value;
    this.description = null;
    this.children = [];
  }

  desc(description: string): this {
    this.description = description;
    return this;
  }

  add(name: string, value: string | null = null): ContextElement {
    const child = new ContextElement(name, value);
    this.children.push(child);
    return child;
  }

  toString(indent = 0): string {
    const padding = "  ".repeat(indent);

    // TODO: Escape quotes and special characters in the description
    if (this.value !== null && this.children.length === 0) {
      if (this.description) {
        return `${padding}<${this.name} desc="${this.description}">${this.value}</${this.name}>`;
      } else {
        return `${padding}<${this.name}>${this.value}</${this.name}>`;
      }
    }

    let result = this.description
      ? `${padding}<${this.name} desc="${this.description}">`
      : `${padding}<${this.name}>`;

    for (const child of this.children) {
      result += "\n" + child.toString(indent + 1);
    }

    result += `\n${padding}</${this.name}>`;
    return result;
  }
}

export class Context extends ContextElement {
  constructor() {
    super("context");
  }
}
