import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const ROOT = join(__dirname, '..');
const RAW = join(ROOT, 'raw');
const AUTH_STATE = join(ROOT, '.yuanbao-auth.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await chromium.launch({ headless: false });
  const ctxOpts = { viewport: { width: 1440, height: 900 }, locale: 'zh-CN' };
  if (existsSync(AUTH_STATE)) ctxOpts.storageState = JSON.parse(readFileSync(AUTH_STATE, 'utf8'));
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();

  await page.goto('https://yuanbao.tencent.com/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Find all files with "Raw Response" (failed parsing)
  const projectDirs = readdirSync(RAW, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.match(/^\d{3}-/));

  const toFix = [];
  for (const dir of projectDirs) {
    const dirPath = join(RAW, dir.name);
    const files = readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = join(dirPath, file);
      const content = readFileSync(filePath, 'utf8');
      if (content.includes('## Raw Response')) {
        // Extract conversation ID from frontmatter
        const idMatch = content.match(/conversation_id:\s*"([^"]+)"/);
        toFix.push({ filePath, convId: idMatch?.[1], dir: dir.name });
      }
    }
  }

  console.log(`Found ${toFix.length} files needing fix (out of ${projectDirs.reduce((s, d) => s + readdirSync(join(RAW, d.name)).filter(f => f.endsWith('.md')).length, 0)} total)`);

  let fixed = 0;
  for (const item of toFix) {
    if (!item.convId) {
      console.log(`  SKIP ${item.filePath} (no conversation ID)`);
      continue;
    }

    console.log(`  Fixing: ${item.dir}/${item.filePath.split('\\').pop()}`);

    const detail = await page.evaluate(async (cid) => {
      const resp = await fetch('https://yuanbao.tencent.com/api/user/agent/conversation/v1/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: cid }),
        credentials: 'include'
      });
      return { ok: resp.ok, data: await resp.json() };
    }, item.convId);

    if (!detail.ok) {
      console.log(`    API error`);
      continue;
    }

    const d = detail.data || detail.data?.data || {};
    let messages = [];

    if (d?.convs && Array.isArray(d.convs)) {
      for (const conv of d.convs) {
        const speaker = conv.speaker || 'ai';
        if (conv.speechesV2) {
          for (const speech of conv.speechesV2) {
            if (Array.isArray(speech.content)) {
              const parts = [];
              for (const block of speech.content) {
                if (block.type === 'text' && block.msg) {
                  parts.push(block.msg);
                } else if (block.type === 'deepSearch' && block.contents) {
                  for (const inner of block.contents) {
                    if (inner.type === 'text' && inner.msg) {
                      parts.push(inner.msg);
                    }
                  }
                }
              }
              const content = parts.join('\n\n');
              if (content.trim()) {
                messages.push({ role: speaker, content: content.trim() });
              }
            }
          }
        }
      }
    }

    // Rebuild file with proper content
    const fileContent = readFileSync(item.filePath, 'utf8');
    const fmMatch = fileContent.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = fmMatch?.[1] || '';
    const titleMatch = frontmatter.match(/title:\s*"([^"]+)"/);
    const projMatch = frontmatter.match(/project:\s*"([^"]+)"/);

    let md = `---
${frontmatter}
---

# ${titleMatch?.[1] || 'Untitled'}

> 来源: 元宝 (腾讯元宝) · ${projMatch?.[1] || item.dir}

`;

    if (messages.length > 0) {
      for (const msg of messages) {
        const isUser = (msg.role || '').toLowerCase() === 'human' || (msg.role || '').toLowerCase() === 'user';
        const label = isUser ? '**User**' : '**AI**';
        md += `### ${label}\n\n${msg.content}\n\n---\n`;
      }
      md += `\n*Auto-extracted via API from yuanbao.tencent.com*\n`;
    } else {
      // Keep raw response if we still can't parse
      console.log(`    Still no messages after fix`);
      continue;
    }

    writeFileSync(item.filePath, md, 'utf8');
    fixed++;
    await sleep(200);
  }

  console.log(`\nFixed: ${fixed}/${toFix.length}`);
  await browser.close();
}

main().catch(console.error);
