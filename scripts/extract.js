#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPython(pdfUrl) {
  return new Promise((resolve, reject) => {
    const py = spawn('.venv/bin/python', ['convert.py', pdfUrl], { cwd: path.join(__dirname, '..') });
    let out = '';
    let err = '';
    py.stdout.on('data', d => out += d.toString());
    py.stderr.on('data', d => err += d.toString());
    py.on('close', code => {
      if (code !== 0) return reject(new Error('Python exited ' + code + '\n' + err));
      resolve(out);
    });
  });
}

function chunkMarkdown(markdown, maxChars = 3000) {
  const paras = markdown.split(/\n{2,}/);
  const out = [];
  let cur = [];
  let len = 0;
  for (const p of paras) {
    if (len + p.length > maxChars && cur.length) {
      out.push(cur.join('\n\n'));
      cur = [];
      len = 0;
    }
    cur.push(p);
    len += p.length;
  }
  if (cur.length) out.push(cur.join('\n\n'));
  return out;
}

async function main() {
  const pdfUrl = process.argv[2] || 'https://cdn.openai.com/pdf/8124a3ce-ab78-4f06-96eb-49ea29ffb52f/gpt5-system-card-aug7.pdf';
  console.log('Running Docling via Python for', pdfUrl);
  const markdown = await runPython(pdfUrl);
  const outDir = path.join(__dirname, '..', 'output');
  await fs.mkdir(outDir, { recursive: true });
  const base = path.basename(new URL(pdfUrl).pathname).replace(/\.pdf$/i, '');
  const mdPath = path.join(outDir, base + '.md');
  await fs.writeFile(mdPath, markdown, 'utf8');
  console.log('Markdown written to', mdPath);

  // Chunking for RAG
  const chunks = chunkMarkdown(markdown, parseInt(process.env.CHUNK_SIZE || '3000', 10));
  const chunksDir = path.join(outDir, base + '_chunks');
  await fs.mkdir(chunksDir, { recursive: true });
  await Promise.all(chunks.map((c, i) => fs.writeFile(path.join(chunksDir, `chunk-${i + 1}.md`), `---\nsource: ${pdfUrl}\nchunk: ${i + 1}\ntotal_chunks: ${chunks.length}\n---\n\n${c}`)));
  console.log('Created', chunks.length, 'chunks in', chunksDir);
}

main().catch(e => { console.error(e); process.exit(1); });
