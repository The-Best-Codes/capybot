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

    if (this.value !== null) {
      return `${padding}<${this.name}>${this.value}</${this.name}>`;
    }

    let result = `${padding}<${this.name}>`;
    if (this.description) {
      result += `\n${padding}  <desc>${this.description}</desc>`;
    }

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
