// Generate a clean, styled HTML version of the README for PDF printing
const fs = require('fs');
const path = require('path');

const readmeContent = fs.readFileSync('./README.md', 'utf8');
const brainDir = 'C:\\Users\\HC\\.gemini\\antigravity\\brain\\8c2241ce-1d9d-4107-91cb-fe29cb97bde9';
const implPlanPath = path.join(brainDir, 'implementation_plan.md');
const implPlanContent = fs.existsSync(implPlanPath) ? fs.readFileSync(implPlanPath, 'utf8') : '';

// Simple markdown → HTML conversion
function mdToHtml(md) {
  return md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="code"><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Tables
    .replace(/^\|(.+)\|\s*$/gm, (line) => {
      if (line.includes('---')) return '';
      const cells = line.split('|').filter(c => c.trim() !== '');
      const isHeader = false;
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
    })
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Bullet lists
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

const bodyHtml = mdToHtml(readmeContent);
const implHtml = implPlanContent ? mdToHtml(implPlanContent) : '';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Khidmat.ai — README & Documentation</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; padding: 2cm; max-width: 1000px; margin: 0 auto; }
  h1 { font-size: 22pt; color: #1a73e8; margin: 20px 0 10px; border-bottom: 3px solid #1a73e8; padding-bottom: 8px; }
  h2 { font-size: 16pt; color: #174ea6; margin: 18px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 13pt; color: #0d47a1; margin: 14px 0 6px; }
  h4 { font-size: 11pt; color: #333; margin: 10px 0 4px; }
  p { margin: 8px 0; }
  code { background: #f4f4f4; border: 1px solid #ddd; border-radius: 3px; padding: 1px 5px; font-family: 'Consolas', monospace; font-size: 9.5pt; }
  pre.code { background: #1e1e1e; color: #d4d4d4; border-radius: 6px; padding: 14px; overflow-x: auto; margin: 12px 0; font-size: 8.5pt; line-height: 1.5; }
  pre.code code { background: none; border: none; color: inherit; padding: 0; font-size: inherit; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  tr:nth-child(even) { background: #f8f9fa; }
  td, th { border: 1px solid #ddd; padding: 7px 10px; text-align: left; }
  tr:first-child td { background: #1a73e8; color: white; font-weight: bold; }
  li { margin: 4px 0 4px 20px; }
  blockquote { border-left: 4px solid #1a73e8; padding: 8px 16px; background: #e8f0fe; margin: 10px 0; border-radius: 0 6px 6px 0; }
  hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
  strong { color: #1a1a1a; }
  .cover { text-align: center; padding: 40px 0; border-bottom: 2px solid #1a73e8; margin-bottom: 30px; }
  .cover h1 { border: none; font-size: 28pt; }
  .cover .subtitle { font-size: 13pt; color: #555; margin: 10px 0; }
  .cover .badge { display: inline-block; background: #1a73e8; color: white; border-radius: 20px; padding: 4px 14px; margin: 4px; font-size: 10pt; }
  .appendix-header { background: #0d47a1; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0; font-size: 16pt; font-weight: bold; margin-top: 40px; }
  .appendix-body { border: 2px solid #0d47a1; border-top: none; border-radius: 0 0 8px 8px; padding: 24px; margin-bottom: 40px; }
  @media print { body { padding: 1cm; } pre.code { font-size: 7.5pt; } }
</style>
</head>
<body>
<div class="cover">
  <h1>🤖 Khidmat.ai</h1>
  <p class="subtitle">Agentic AI Service Orchestrator for the Informal Economy</p>
  <br>
  <span class="badge">Google AI Seekho Phase II</span>
  <span class="badge">Gemini 2.5 Flash</span>
  <span class="badge">Cloud Run</span>
  <span class="badge">React Native</span>
  <br><br>
  <p><strong>Team:</strong> AgentOrchestrator &nbsp;|&nbsp; <strong>Member:</strong> Muhammad Huzaifa</p>
  <p><strong>Live Backend:</strong> https://khidmat-ai-514385561723.us-central1.run.app</p>
  <p><strong>APK:</strong> https://expo.dev/accounts/huzaifaned/projects/mobile/builds/5ed52229-3a8a-45b8-abce-4916f377b785</p>
  <p><strong>GitHub:</strong> https://github.com/Huzaifa-cloud-crypto/khidmat-ai</p>
</div>
${bodyHtml}

${implHtml ? `
<div class="appendix-header">📐 Appendix: Implementation Plan (Antigravity Design Document)</div>
<div class="appendix-body">${implHtml}</div>
` : ''}
</body>
</html>`;

fs.writeFileSync('./README.html', html);
console.log('Created README.html (' + Math.round(html.length/1024) + ' KB)');
console.log('Open README.html in Chrome and press Ctrl+P -> Save as PDF');
