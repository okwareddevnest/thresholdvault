import { readFile } from "node:fs/promises";
import path from "node:path";

const PRD_PATH = path.resolve(process.cwd(), "../prd.md");
const WHITEPAPER_PATH = path.resolve(process.cwd(), "../whitepaper.md");

let cachedPrd: string | null = null;
let cachedWhitepaper: string | null = null;

async function loadFile(targetPath: string): Promise<string> {
  const content = await readFile(targetPath, "utf-8");
  return content.trim();
}

export async function loadPrdSpec(): Promise<string> {
  if (!cachedPrd) {
    cachedPrd = await loadFile(PRD_PATH);
  }
  return cachedPrd;
}

export async function loadWhitepaper(): Promise<string> {
  if (!cachedWhitepaper) {
    cachedWhitepaper = await loadFile(WHITEPAPER_PATH);
  }
  return cachedWhitepaper;
}
