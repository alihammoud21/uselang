#!/usr/bin/env python3
"""Rebuild gemma-engine.ts: inject llama.rn declarations, fix broken STOP_WORDS."""
import os, re

ENGINE = os.path.join(os.path.dirname(__file__), "../src/lib/gemma-engine.ts")

with open(ENGINE, encoding="utf-8") as f:
    original = f.read()

# We keep two things from original:
#  1. The header comment + imports (lines before "// ── Model config")
#  2. The body from validateAndFixChunks onwards

header_end = original.index("// ── Model config")
tail_start = original.index("function validateAndFixChunks(")

header = original[:header_end]
tail   = original[tail_start:]

MIDDLE = r"""// ── Model config ─────────────────────────────────────────────────────────
const MODEL_DIR = (FileSystem.documentDirectory ?? "") + "models/";
const MODEL_FILE = "gemma-2b-q4.gguf";
const MODEL_PATH = MODEL_DIR + MODEL_FILE;
const MODEL_URL =
  "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf";

const STOP_WORDS = [
  "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>",
  "<|im_end|>", "<|EOT|>", "<end_of_turn>", "<eos>",
  "
