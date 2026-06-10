export type PostFrontMatter = {
  title: string;
  date: string;
  description?: string;
  tested?: boolean;
  tags?: string[];
};

export function md(
  // language=Markdown
  markdown: string,
): void;
export function md(
  // language=Markdown
  markdown: TemplateStringsArray,
): void;
export function md(markdown: string | TemplateStringsArray) {
  void markdown;
}

export function ts(
  // language=TypeScript
  source: string,
): void;
export function ts(
  // language=TypeScript
  source: TemplateStringsArray,
): void;
export function ts(source: string | TemplateStringsArray) {
  void source;
}

export function post(frontMatter: PostFrontMatter) {
  void frontMatter;
}
