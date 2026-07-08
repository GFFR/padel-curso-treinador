#!/usr/bin/env node
/**
 * Fail if any tracked source file is not valid UTF-8.
 * Nixpacks / Turbopack require UTF-8; Latin-1 or Windows-1252 Portuguese text breaks deploy.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".sql",
  ".md",
]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, files);
    } else if (EXTENSIONS.has(path.slice(path.lastIndexOf(".")))) {
      files.push(path);
    }
  }
  return files;
}

const failures: string[] = [];

for (const file of walk(ROOT)) {
  const bytes = readFileSync(file);
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    failures.push(relative(ROOT, file));
  }
}

if (failures.length > 0) {
  console.error("Invalid UTF-8 in source files (deploy will fail):");
  for (const file of failures.sort()) {
    console.error(`  - ${file}`);
  }
  console.error(
    "\nFix: save files as UTF-8. Portuguese UI strings belong in UTF-8, not Latin-1/Windows-1252.",
  );
  process.exit(1);
}

console.log("All source files are valid UTF-8.");
