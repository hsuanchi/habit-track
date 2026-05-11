const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The main background
html = html.replace(/bg-\[\#FAF9F6\]/g, 'bg-[#12100f]');

// Clean card background
html = html.replace(/background: #181614;/g, 'background: #181614;');
html = html.replace(/background: #FFFFFF;/g, 'background: #181614;');
// Clean card border
html = html.replace(/border: 1px solid rgba\(0, 0, 0, 0\.04\);/g, 'border: 1px solid rgba(255, 255, 255, 0.05);');

// Backgrounds
html = html.replace(/bg-slate-200\/50/g, 'bg-slate-800/50');
html = html.replace(/bg-slate-100\/50/g, 'bg-slate-900/50');
html = html.replace(/bg-slate-100/g, 'bg-slate-900');
html = html.replace(/bg-slate-200/g, 'bg-slate-800');
html = html.replace(/bg-white/g, 'bg-slate-950');

// Borders
html = html.replace(/border-slate-200\/50/g, 'border-slate-800/50');
html = html.replace(/border-slate-200/g, 'border-slate-800');
html = html.replace(/border-slate-300\/50/g, 'border-slate-700/50');
html = html.replace(/border-slate-300/g, 'border-slate-800');

// Text colors
html = html.replace(/text-slate-900/g, 'text-white');
html = html.replace(/text-slate-800/g, 'text-slate-300');
html = html.replace(/text-slate-700/g, 'text-slate-300');
// text-slate-400 remains (it absorbed 500)
// wait, the scrollbar
html = html.replace(/background: #f1f5f9;/g, 'background: #12100f;');
html = html.replace(/background: #cbd5e1;/g, 'background: #2a2523;');
html = html.replace(/background: #94a3b8;/g, 'background: #3c3532;');

// Calendar Overrides
html = html.replace(/rgba\(0, 0, 0, 0\.06\)/g, 'rgba(255, 255, 255, 0.05)');
html = html.replace(/rgba\(0,0,0,0\.06\)/g, 'rgba(255,255,255,0.05)');
html = html.replace(/rgba\(0, 0, 0, 0\.08\)/g, 'rgba(255, 255, 255, 0.08)');
html = html.replace(/rgba\(0, 0, 0, 0\.05\)/g, 'rgba(255, 255, 255, 0.1)');
html = html.replace(/color: #1a1a1a;/g, 'color: #f5f5f5;');
html = html.replace(/color: #64748b/g, 'color: #cbd5e1');
html = html.replace(/color: #1e293b/g, 'color: #ffffff');

fs.writeFileSync('index.html', html);
console.log('Reverted to Dark Mode');
