import fs from 'fs';
import path from 'path';

const filesToInclude = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'index.html',
  'README.md',
  'src/types.ts',
  'src/storage.ts',
  'src/engine.ts',
  'src/gemini.ts',
  'src/notifications.ts',
  'src/main.tsx',
  'src/App.tsx'
];

let markdown = `# ClutchAI Codebase Context

This file contains the complete source code of ClutchAI. You can upload this directly to Google AI Studio to chat with Gemini about your codebase.

`;

for (const file of filesToInclude) {
  if (fs.existsSync(file)) {
    let ext = path.extname(file).substring(1);
    if (ext === 'tsx') ext = 'tsx';
    if (ext === 'ts') ext = 'typescript';
    if (ext === 'html') ext = 'html';
    if (ext === 'json') ext = 'json';
    if (ext === 'css') ext = 'css';
    
    const content = fs.readFileSync(file, 'utf8');
    markdown += `## File: \`${file}\`\n\n\`\`\`${ext}\n${content}\n\`\`\`\n\n---\n\n`;
  }
}

fs.writeFileSync('clutch_ai_codebase_context.md', markdown);
console.log('Successfully generated clutch_ai_codebase_context.md');
