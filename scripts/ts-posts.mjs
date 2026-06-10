import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Node, Project, QuoteKind, SyntaxKind } from "ts-morph";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const postDir = path.join(root, "content", "post");
const sourceSuffix = ".post.ts";
const generatedSuffix = ".gen.md";
const generatedAuthor = "Yona Appletree";

const command = process.argv[2] ?? "build";
const changedOnly = process.argv.includes("--changed");

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function relativeToRoot(filePath) {
  return toPosix(path.relative(root, filePath));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function gitLines(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function allPostSources() {
  const entries = await fs.readdir(postDir);
  return entries
    .filter((entry) => entry.endsWith(sourceSuffix))
    .sort()
    .map((entry) => path.join(postDir, entry));
}

async function changedPostSources() {
  const tracked = gitLines(["diff", "--name-only", "--diff-filter=ACMR", "origin/main...HEAD"]);
  const untracked = gitLines(["ls-files", "--others", "--exclude-standard"]);
  const candidates = [...new Set([...tracked, ...untracked])]
    .filter((entry) => entry.startsWith("content/post/") && entry.endsWith(sourceSuffix))
    .map((entry) => path.join(root, entry));

  const existing = [];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) existing.push(candidate);
  }
  return existing.sort();
}

function generatedPathFor(sourcePath) {
  return sourcePath.slice(0, -sourceSuffix.length) + generatedSuffix;
}

function postSlugFor(sourcePath) {
  return path.basename(sourcePath).slice(0, -sourceSuffix.length);
}

async function removeStaleGeneratedFiles(postSources) {
  const expectedOutputs = new Set(postSources.map((post) => generatedPathFor(post)));
  const entries = await fs.readdir(postDir);
  await Promise.all(
    entries
      .filter((entry) => entry.endsWith(generatedSuffix))
      .map(async (entry) => {
        const generatedPath = path.join(postDir, entry);
        if (!expectedOutputs.has(generatedPath)) await fs.rm(generatedPath);
      }),
  );
}

function isTsPostImport(statement) {
  if (!Node.isImportDeclaration(statement)) return false;
  return statement.getModuleSpecifierValue().endsWith("/src/ts-post");
}

function expressionStatementCall(statement, name) {
  if (!Node.isExpressionStatement(statement)) return undefined;
  const expression = statement.getExpression();
  if (!Node.isCallExpression(expression)) return undefined;
  if (expression.getExpression().getText() !== name) return undefined;
  return expression;
}

function expressionStatementTaggedTemplate(statement, name) {
  if (!Node.isExpressionStatement(statement)) return undefined;
  const expression = statement.getExpression();
  if (!Node.isTaggedTemplateExpression(expression)) return undefined;
  if (expression.getTag().getText() !== name) return undefined;
  return expression;
}

function literalValue(node) {
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralText();
  }
  if (node.getKind() === SyntaxKind.TrueKeyword) return true;
  if (node.getKind() === SyntaxKind.FalseKeyword) return false;
  if (Node.isArrayLiteralExpression(node))
    return node.getElements().map((element) => literalValue(element));
  throw new Error(`Unsupported post front matter value: ${node.getText()}`);
}

function frontMatterFromObject(expression) {
  if (!Node.isObjectLiteralExpression(expression)) {
    throw new Error("post(...) expects an object literal");
  }

  const frontMatter = {};
  for (const property of expression.getProperties()) {
    if (!Node.isPropertyAssignment(property)) {
      throw new Error(`Unsupported front matter property: ${property.getText()}`);
    }

    const nameNode = property.getNameNode();
    const name =
      Node.isIdentifier(nameNode) || Node.isStringLiteral(nameNode)
        ? nameNode.getText().replaceAll(/^["']|["']$/g, "")
        : undefined;

    if (!name) throw new Error(`Unsupported front matter key: ${property.getText()}`);
    frontMatter[name] = literalValue(property.getInitializerOrThrow());
  }

  return frontMatter;
}

function generatedFrontMatter(sourcePath, frontMatter) {
  for (const generatedKey of ["author", "url"]) {
    if (Object.hasOwn(frontMatter, generatedKey)) {
      throw new Error(
        `${relativeToRoot(sourcePath)} should not define generated front matter field "${generatedKey}"`,
      );
    }
  }

  return {
    author: generatedAuthor,
    ...frontMatter,
    url: `/post/${postSlugFor(sourcePath)}/`,
  };
}

function tomlString(value) {
  return JSON.stringify(value);
}

function renderFrontMatter(frontMatter) {
  const lines = ["+++"];
  for (const [key, value] of Object.entries(frontMatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key} = [`);
      for (const item of value) lines.push(`  ${tomlString(item)},`);
      lines.push("]");
    } else if (typeof value === "string") {
      lines.push(`${key} = ${tomlString(value)}`);
    } else if (typeof value === "boolean") {
      lines.push(`${key} = ${value ? "true" : "false"}`);
    } else {
      throw new Error(`Unsupported TOML value for ${key}`);
    }
  }
  lines.push("+++");
  return lines.join("\n");
}

function markdownFromMdCall(call) {
  const [argument] = call.getArguments();
  if (!argument) throw new Error("md(...) expects a string argument");
  if (Node.isNoSubstitutionTemplateLiteral(argument) || Node.isStringLiteral(argument)) {
    return argument.getLiteralText().trim();
  }
  throw new Error(`Unsupported md(...) argument: ${argument.getText()}`);
}

function markdownFromMdTaggedTemplate(expression) {
  const template = expression.getTemplate();
  if (!Node.isNoSubstitutionTemplateLiteral(template)) {
    throw new Error("md`...` does not support substitutions");
  }
  return template.getLiteralText().trim();
}

function typescriptFromTsTaggedTemplate(expression) {
  const template = expression.getTemplate();
  if (!Node.isNoSubstitutionTemplateLiteral(template)) {
    throw new Error("ts`...` does not support substitutions");
  }
  return ["```ts", template.getLiteralText().trim(), "```"].join("\n");
}

function statementText(statement, sourceText) {
  return sourceText.slice(statement.getFullStart(), statement.getEnd()).trim();
}

function renderCodeBlock(statements, sourceText) {
  const code = statements.map((statement) => statementText(statement, sourceText)).join("\n\n");
  if (!code.trim()) return "";
  return ["```ts", code, "```"].join("\n");
}

function compilePostSource(sourcePath) {
  const project = new Project({
    tsConfigFilePath: path.join(root, "tsconfig.json"),
    manipulationSettings: {
      quoteKind: QuoteKind.Double,
    },
  });
  const sourceFile = project.getSourceFileOrThrow(sourcePath);
  const sourceText = sourceFile.getFullText();
  const chunks = [];
  const codeStatements = [];
  let frontMatter;

  const flushCode = () => {
    if (codeStatements.length === 0) return;
    chunks.push(renderCodeBlock(codeStatements, sourceText));
    codeStatements.length = 0;
  };

  for (const statement of sourceFile.getStatements()) {
    if (isTsPostImport(statement)) continue;

    const postCall = expressionStatementCall(statement, "post");
    if (postCall) {
      flushCode();
      if (frontMatter)
        throw new Error(`${relativeToRoot(sourcePath)} has more than one post(...) call`);
      frontMatter = generatedFrontMatter(
        sourcePath,
        frontMatterFromObject(postCall.getArguments()[0]),
      );
      continue;
    }

    const mdCall = expressionStatementCall(statement, "md");
    if (mdCall) {
      flushCode();
      chunks.push(markdownFromMdCall(mdCall));
      continue;
    }

    const mdTemplate = expressionStatementTaggedTemplate(statement, "md");
    if (mdTemplate) {
      flushCode();
      chunks.push(markdownFromMdTaggedTemplate(mdTemplate));
      continue;
    }

    const tsTemplate = expressionStatementTaggedTemplate(statement, "ts");
    if (tsTemplate) {
      flushCode();
      chunks.push(typescriptFromTsTaggedTemplate(tsTemplate));
      continue;
    }

    codeStatements.push(statement);
  }
  flushCode();

  if (!frontMatter)
    throw new Error(`${relativeToRoot(sourcePath)} is missing post(...) front matter`);

  return `${renderFrontMatter(frontMatter)}\n\n${chunks.filter(Boolean).join("\n\n")}\n`;
}

async function buildPosts({ onlyChanged = false } = {}) {
  const sources = onlyChanged ? await changedPostSources() : await allPostSources();
  await removeStaleGeneratedFiles(onlyChanged ? await allPostSources() : sources);

  if (sources.length === 0) {
    console.log(onlyChanged ? "No changed TypeScript posts." : "No TypeScript posts found.");
    return;
  }

  for (const sourcePath of sources) {
    const markdown = compilePostSource(sourcePath);
    const outputPath = generatedPathFor(sourcePath);
    await fs.writeFile(outputPath, markdown);
    console.log(`${relativeToRoot(sourcePath)} -> ${relativeToRoot(outputPath)}`);
  }
}

async function watchPosts() {
  await buildPosts();
  console.log("Watching content/post/*.post.ts");

  let pending;
  const schedule = () => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      buildPosts().catch((error) => {
        console.error(error.message);
      });
    }, 100);
  };

  const watcher = fs.watch(postDir);
  for await (const event of watcher) {
    if (event.filename?.endsWith(sourceSuffix)) schedule();
  }
}

if (command === "build" || command === "check") {
  await buildPosts({ onlyChanged: changedOnly });
} else if (command === "dev") {
  await watchPosts();
} else {
  console.error(`Unknown ts-posts command: ${command}`);
  process.exitCode = 1;
}
