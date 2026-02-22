#!/usr/bin/env node
/**
 * Build script for Safwat al-Tafasir book data.
 *
 * Reads the raw 6.1MB JSON (from shamela-style export) and produces:
 *   - ../index.json   — book metadata + TOC (headings with 0-based page indices)
 *   - ../pages/0.json … ../pages/N.json — chunked page files (CHUNK_SIZE pages each)
 *
 * Usage:  node build-book.js
 */

const fs = require("fs");
const path = require("path");

const CHUNK_SIZE = 50;
const SOURCE_DIR = __dirname;
const OUT_DIR = path.resolve(SOURCE_DIR, "..");

const rawPath = path.join(
  SOURCE_DIR,
  "..",
  "..",
  "..",
  "tafsir",
  "ar-safwat-al-tafasir",
  ".source",
  "book-8967-raw.json"
);
const indexSourcePath = path.join(
  SOURCE_DIR,
  "..",
  "..",
  "..",
  "tafsir",
  "ar-safwat-al-tafasir",
  ".source",
  "book-8967-index.json"
);

// Strip HTML span tags, keep inner text
function stripSpans(text) {
  return text.replace(/<span[^>]*>/g, "").replace(/<\/span>/g, "");
}

function main() {
  console.log("Reading raw book data…");
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  const indexSource = JSON.parse(fs.readFileSync(indexSourcePath, "utf8"));

  const pages = raw.pages; // Array of { text, vol, page }
  console.log(`Total pages: ${pages.length}`);

  // Clean text
  const cleanPages = pages.map((p) => ({
    text: stripSpans(p.text),
    vol: p.vol,
    page: p.page,
  }));

  // Build index.json
  const meta = indexSource.meta;
  const headings = indexSource.indexes.headings.map((h) => ({
    title: h.title,
    level: h.level,
    page: h.page - 1, // Convert 1-based page to 0-based index
  }));

  // Clamp heading page indices to valid range
  for (const h of headings) {
    if (h.page < 0) h.page = 0;
    if (h.page >= pages.length) h.page = pages.length - 1;
  }

  const index = {
    id: "safwat-al-tafasir",
    title: meta.name,
    author: "محمد علي الصابوني",
    volumes: indexSource.indexes.volumes.length,
    totalPages: pages.length,
    chunkSize: CHUNK_SIZE,
    totalChunks: Math.ceil(pages.length / CHUNK_SIZE),
    headings,
  };

  const indexPath = path.join(OUT_DIR, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index), "utf8");
  console.log(
    `Wrote ${indexPath} (${(fs.statSync(indexPath).size / 1024).toFixed(1)} KB)`
  );

  // Build page chunks
  const pagesDir = path.join(OUT_DIR, "pages");
  if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, { recursive: true });

  for (let i = 0; i < index.totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, pages.length);
    const chunk = cleanPages.slice(start, end);
    const chunkPath = path.join(pagesDir, `${i}.json`);
    fs.writeFileSync(chunkPath, JSON.stringify(chunk), "utf8");
    const sizeKB = (fs.statSync(chunkPath).size / 1024).toFixed(1);
    console.log(
      `  Chunk ${i}: pages ${start}–${end - 1} (${sizeKB} KB)`
    );
  }

  console.log("\nDone!");
}

main();
