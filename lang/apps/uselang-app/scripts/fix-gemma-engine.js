#!/usr/bin/env node
// One-shot script to rebuild gemma-engine.ts with llama.rn API
const fs = require("fs");
const path = require("path");

const filePath = path.resolve(__dirname, "../src/lib/gemma-engine.ts");
const content = fs.readFileSync(filePath, "utf8");

// Find the tail: everything from validateAndFixChunks to end
const tailMarker = "function validateAndFixChunks(";
const tailIdx = content.indexOf(tailMarker);
if (tailIdx === -1) {
  console.error("ERROR: could not find validateAndFixChunks in file");
  process.exit(1);
}
const tail = content.slice(tailIdx);

// Find the header: everything from the start up to and including the comment block
const headerMarker = "import * as FileSystem from";
const headerEndMarker = content.indexOf("// ── Model config");
const header = content.slice(0, headerEndMarker);

const newMiddle = `// ── Model config ─────────────────────────────────────────────────────────
const MODEL_DIR = (FileSystem.documentDirectory ?? "") + "models/";
const MODEL_FILE = "gemma-2b-q4.gguf";
const MODEL_PATH = MODEL_DIR + MODEL_FILE;
const MODEL_URL =
  "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf";

const STOP_WORDS = [
  "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>",
  "<|im_end|>", "<|EOT|>", "<end_of_turn>", "<eos>",
  "
