import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SOURCE_ROOT = new URL("../src/", import.meta.url);
const CLASS_NAME =
  /className\s*=\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\{\s*`[\s\S]*?`\s*\})/g;
const BANNED_LITERALS = [
  ["arbitrary hex color", /\[#[0-9a-f]+/gi],
  ["arbitrary rgba color", /\[rgba\(/gi],
  ["arbitrary oklch color", /\[oklch\(/gi],
  ["pixel font size", /text-\[\d+(?:\.\d+)?px\]/g],
  ["pixel radius", /rounded-\[\d+(?:\.\d+)?px\]/g],
  ["arbitrary tracking", /tracking-\[/g],
];

async function findTsxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const location = new URL(
        entry.name + (entry.isDirectory() ? "/" : ""),
        directory,
      );
      if (entry.isDirectory()) return findTsxFiles(location);
      return entry.name.endsWith(".tsx") ? [location] : [];
    }),
  );
  return files.flat();
}

const failures = [];
const files = (await findTsxFiles(SOURCE_ROOT)).sort((a, b) =>
  a.pathname.localeCompare(b.pathname),
);

for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const className of source.matchAll(CLASS_NAME)) {
    const start = className.index ?? 0;
    const nearbyComment = source.slice(Math.max(0, start - 200), start);
    if (
      className[0].includes("style-literal-ok") ||
      nearbyComment.includes("style-literal-ok")
    ) {
      continue;
    }

    for (const [description, pattern] of BANNED_LITERALS) {
      for (const literal of className[0].matchAll(pattern)) {
        const offset = start + (literal.index ?? 0);
        const line = source.slice(0, offset).split("\n").length;
        failures.push({
          file: path.relative(process.cwd(), fileURLToPath(file)),
          line,
          description,
          literal: literal[0],
        });
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Disallowed className style literals found:\n");
  for (const failure of failures) {
    console.error(
      `  ${failure.file}:${failure.line} ${failure.literal} (${failure.description})`,
    );
  }
  console.error(
    "\nUse a design token, or add a nearby /* style-literal-ok */ comment for a sanctioned one-off.",
  );
  process.exitCode = 1;
} else {
  console.log(`Style literal check passed (${files.length} TSX files).`);
}
