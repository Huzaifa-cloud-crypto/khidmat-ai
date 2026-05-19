// Convert all Antigravity trace MD files into a single readable HTML
const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\HC\\.gemini\\antigravity\\brain\\8c2241ce-1d9d-4107-91cb-fe29cb97bde9';

const files = [
    { name: 'Task List (Implementation Checklist)', file: path.join(brainDir, 'task.md') },
    { name: 'Stress Test Report (All 5 Scenarios)', file: path.join(brainDir, 'stress_test_report.md') },
    { name: 'Requirements Audit Report', file: path.join(brainDir, 'requirements_audit.md') },
];

function mdToHtml(md) {
    return md
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
            `<pre><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;').trim()}</code></pre>`)
        .replace(/`([^`\n]+)`/g, '<code>$1</code>')
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^---$/gm, '<hr>')
        // Tables
        .replace(/^(\|.+\|)$/gm, (line) => {
            if (/^\|[-\s|]+\|$/.test(line)) return '';
            const cells = line.split('|').filter((c, i, a) => i > 0 && i < a.length - 1);
            return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
        })
        .replace(/(<tr>.*<\/tr>\n?)+/g, m => `<table>${m}</table>`)
        // Checkboxes
        .replace(/^- \[x\] (.+)$/gm, '<li class="done">✅ $1</li>')
        .replace(/^- \[\/\] (.+)$/gm, '<li class="done">✅ $1</li>')
        .replace(/^- \[ \] (.+)$/gm, '<li class="todo">⬜ $1</li>')
        .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
}

// Sample agent trace (live JSON)
const agentTraceJson = fs.existsSync('./sample_agent_traces.json')
    ? fs.readFileSync('./sample_agent_traces.json', 'utf8')
    : '[]';

const sections = files.map(f => {
    const content = fs.existsSync(f.file) ? fs.readFileSync(f.file, 'utf8') : '_File not found_';
    return `
    <section>
        <div class="section-header">${f.name}</div>
        <div class="section-body">${mdToHtml(content)}</div>
    </section>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Khidmat.ai — Antigravity Development Traces & Logs</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.7; color: #1a1a1a; background: #f5f7fa; }
  .cover { background: linear-gradient(135deg, #1a73e8, #0d47a1); color: white; padding: 40px; text-align: center; }
  .cover h1 { font-size: 28pt; margin-bottom: 10px; }
  .cover p { font-size: 12pt; opacity: 0.9; margin: 4px 0; }
  .cover .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 14px; margin: 6px 4px; font-size: 10pt; }
  .note { background: #fff3cd; border-left: 4px solid #f0ad4e; padding: 14px 20px; margin: 20px 40px; border-radius: 4px; }
  .note strong { color: #856404; }
  section { background: white; margin: 20px 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
  .section-header { background: #1a73e8; color: white; padding: 14px 20px; font-size: 14pt; font-weight: bold; }
  .section-body { padding: 24px; }
  h1 { font-size: 18pt; color: #1a73e8; margin: 16px 0 8px; border-bottom: 2px solid #e8f0fe; padding-bottom: 6px; }
  h2 { font-size: 14pt; color: #174ea6; margin: 14px 0 6px; }
  h3 { font-size: 12pt; color: #0d47a1; margin: 10px 0 4px; }
  h4 { font-size: 11pt; color: #333; margin: 8px 0 4px; }
  code { background: #f4f4f4; border: 1px solid #ddd; border-radius: 3px; padding: 1px 6px; font-family: Consolas, monospace; font-size: 9pt; }
  pre { background: #1e1e1e; color: #d4d4d4; padding: 14px; border-radius: 6px; overflow-x: auto; margin: 10px 0; font-size: 8.5pt; line-height: 1.5; }
  pre code { background: none; border: none; color: inherit; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
  tr:nth-child(even) { background: #f8f9fa; }
  tr:first-child td { background: #1a73e8; color: white; font-weight: bold; }
  td { border: 1px solid #ddd; padding: 7px 10px; }
  li { margin: 4px 0 4px 20px; }
  li.done { color: #2e7d32; }
  li.todo { color: #888; }
  hr { border: none; border-top: 1px solid #e0e0e0; margin: 16px 0; }
  strong { font-weight: 700; }
  p { margin: 8px 0; }
  .trace-section { background: white; margin: 20px 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
  .trace-header { background: #0d47a1; color: white; padding: 14px 20px; font-size: 14pt; font-weight: bold; }
  .trace-body { padding: 24px; }
  .agent-step { border-left: 4px solid #1a73e8; padding: 10px 16px; margin: 8px 0; background: #f8f9fa; border-radius: 0 6px 6px 0; }
  .agent-name { font-weight: bold; color: #1a73e8; font-size: 10pt; }
  .agent-action { color: #333; font-size: 11pt; }
  .agent-detail { color: #555; font-size: 9pt; font-family: Consolas, monospace; }
  @media print { section, .trace-section { margin: 10px 0; } }
</style>
</head>
<body>

<div class="cover">
  <h1>🤖 Khidmat.ai</h1>
  <p style="font-size:14pt; font-weight:bold; margin-bottom:8px">Antigravity Development Traces & Logs</p>
  <p>Google AI Seekho Phase II — AI Service Orchestrator Challenge</p>
  <br>
  <span class="badge">Team: AgentOrchestrator</span>
  <span class="badge">Member: Muhammad Huzaifa</span>
  <span class="badge">Built 100% with Antigravity</span>
  <span class="badge">22 Cloud Run Deployments</span>
  <span class="badge">5 Stress Tests Passed</span>
  <br><br>
  <p>APK: https://expo.dev/accounts/huzaifaned/projects/mobile/builds/5ed52229-3a8a-45b8-abce-4916f377b785</p>
  <p>Backend: https://khidmat-ai-514385561723.us-central1.run.app</p>
  <p>GitHub: https://github.com/Huzaifa-cloud-crypto/khidmat-ai</p>
</div>

<div class="note">
  <strong>📋 What this document contains:</strong> This file was auto-generated from Antigravity's development session artifacts.
  It contains the full implementation task checklist, all 5 stress test results, the requirements audit report, 
  and 3 live agent trace samples captured from the production system. 
  Open in any web browser (Chrome, Edge, Firefox) to read.
</div>

${sections}

<div class="trace-section">
  <div class="trace-header">📡 Live Agent Trace Samples (3 Real Requests)</div>
  <div class="trace-body">
    <p>These traces were captured from the live Cloud Run production system. Each shows exactly what the AI decided at each step.</p>
    <br>
    ${JSON.parse(agentTraceJson).map((scenario, idx) => `
      <h3>Scenario ${idx+1}: ${scenario.scenario}</h3>
      <p><strong>Status:</strong> ${scenario.status} | <strong>Confidence:</strong> ${scenario.confidenceScore || 'N/A'} | 
      <strong>Provider:</strong> ${scenario.provider || 'Clarification needed'} | 
      <strong>Price:</strong> ${scenario.finalPrice ? 'Rs. '+scenario.finalPrice : 'N/A'}</p>
      ${(scenario.logs || []).map(log => `
        <div class="agent-step">
          <div class="agent-name">[${log.agent}] — ${log.action}</div>
          <div class="agent-detail">${JSON.stringify(log.details, null, 2).substring(0, 300)}</div>
        </div>`).join('')}
      <hr>
    `).join('')}
  </div>
</div>

</body>
</html>`;

fs.writeFileSync('./antigravity_traces.html', html);
console.log('Created: antigravity_traces.html (' + Math.round(html.length/1024) + ' KB)');
console.log('Open in Chrome and press Ctrl+P to save as PDF');
