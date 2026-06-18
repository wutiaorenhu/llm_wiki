import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const ROOT = join(__dirname, '..');
const RAW = join(ROOT, 'raw');
const OUTPUTS = join(ROOT, 'outputs');
const AUTH_STATE = join(ROOT, '.yuanbao-auth.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function slug(text) {
  return text.slice(0, 60).replace(/[<>:"/\\|?*\n\r]/g, '').replace(/\s+/g, '_').replace(/_+/g, '-').replace(/^-+|-+$/g, '');
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const ctxOpts = { viewport: { width: 1440, height: 900 }, locale: 'zh-CN' };
  if (existsSync(AUTH_STATE)) ctxOpts.storageState = JSON.parse(readFileSync(AUTH_STATE, 'utf8'));
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();

  // Navigate
  console.log('Navigating...');
  await page.goto('https://yuanbao.tencent.com/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // ====== Get projects with IDs ======
  const projectsResp = await page.evaluate(async () => {
    const resp = await fetch('https://yuanbao.tencent.com/api/v5/projectLogic/project/get-user-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include'
    });
    const data = await resp.json();
    return data?.data?.items || [];
  });

  console.log(`Found ${projectsResp.length} projects`);
  const projectMap = {}; // name -> project_id
  projectsResp.forEach(p => {
    console.log(`  ${p.name} -> ${p.project_id}`);
    projectMap[p.name] = p.project_id;
  });

  // ====== For each project, fetch conversations via API ======
  console.log('\n=== FETCHING CONVERSATIONS ===');
  const allProjectConvs = {};

  for (const [projName, projId] of Object.entries(projectMap)) {
    console.log(`\n${projName} (${projId})...`);

    const conversations = await page.evaluate(async (pid) => {
      try {
        const resp = await fetch('https://yuanbao.tencent.com/api/user/agent/conversation/v3/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id: 'naQivTmsDa',
            project_id: pid,
            page_size: 500,
            top_time: 0,
            action: 1,
            last_replied_at: 0
          }),
          credentials: 'include'
        });
        const data = await resp.json();
        const convs = data?.data?.list || data?.data?.conversations || data?.conversations || [];
        return convs.map(c => ({
          id: c.id || c.cid || c.conversation_id || '',
          title: c.title || c.sessionTitle || c.name || 'untitled'
        }));
      } catch (e) {
        return { error: e.message };
      }
    }, projId);

    if (conversations.error) {
      console.log(`  ERROR: ${conversations.error}`);
      continue;
    }

    console.log(`  ${conversations.length} conversations`);
    allProjectConvs[projName] = { projId, conversations };
    conversations.slice(0, 3).forEach(c => console.log(`    - ${c.title}`));
    await sleep(300);
  }

  // ====== Extract conversations ======
  console.log('\n' + '='.repeat(60));
  console.log('EXTRACTING MESSAGES');
  console.log('='.repeat(60));

  let totalExtracted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [projName, projData] of Object.entries(allProjectConvs)) {
    const { conversations } = projData;
    const groupDir = join(RAW, slug(projName));
    if (!existsSync(groupDir)) mkdirSync(groupDir, { recursive: true });
    if (conversations.length === 0) continue;

    console.log(`\n--- ${projName} (${conversations.length}) ---`);

    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      const convTitle = conv.title;
      const cleanTitle = slug(convTitle) || `conv-${i}`;
      const fileIdx = String(i + 1).padStart(3, '0');
      const fileName = `${fileIdx}-${cleanTitle}.md`;
      const filePath = join(groupDir, fileName);

      if (existsSync(filePath)) {
        totalSkipped++;
        if (totalSkipped % 30 === 0) console.log(`  Skipped ${totalSkipped} existing...`);
        continue;
      }

      console.log(`  [${i + 1}/${conversations.length}] ${convTitle}`);

      const detail = await page.evaluate(async (cid) => {
        try {
          const resp = await fetch('https://yuanbao.tencent.com/api/user/agent/conversation/v1/detail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: cid }),
            credentials: 'include'
          });
          const data = await resp.json();
          return { ok: resp.ok, data };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }, conv.id);

      if (!detail.ok) {
        console.log(`    API error: ${detail.error || 'status ' + detail.data?.code}`);
        totalErrors++;
        continue;
      }

      // Parse messages
      const raw = detail.data;
      let messages = [];
      const d = raw?.data;

      if (d?.conversations && Array.isArray(d.conversations)) {
        for (const entry of d.conversations) {
          const speaker = entry.speaker || 'ai';
          if (entry.speechesV2 && Array.isArray(entry.speechesV2)) {
            for (const speech of entry.speechesV2) {
              const role = speech.speaker || speaker;
              let content = '';
              if (Array.isArray(speech.content)) {
                content = speech.content.map(b => {
                  if (typeof b === 'string') return b;
                  if (b.type === 'text' || b.type === 'markdown') return b.msg || b.content || '';
                  if (b.msg) return typeof b.msg === 'string' ? b.msg : '';
                  return '';
                }).filter(Boolean).join('\n\n');
              } else if (typeof speech.content === 'string') {
                content = speech.content;
              }
              if (content.trim()) messages.push({ role, content: content.trim() });
            }
          }
        }
      }

      let md = `---
title: "${convTitle}"
type: source-summary
source: yuanbao
project: "${projName}"
conversation_id: "${conv.id}"
extracted: ${new Date().toISOString().slice(0, 10)}
confidence: low
---

# ${convTitle}

> 来源: 元宝 (腾讯元宝) · ${projName}

`;

      if (messages.length > 0) {
        for (const msg of messages) {
          const isUser = (msg.role || '').toLowerCase() === 'user';
          md += `### ${isUser ? '**User**' : '**AI**'}\n\n${msg.content}\n\n---\n`;
        }
      } else {
        md += `## Raw Response\n\n\`\`\`json\n${JSON.stringify(raw, null, 2).slice(0, 20000)}\n\`\`\`\n\n`;
      }

      md += `\n*Auto-extracted via API from yuanbao.tencent.com*\n`;
      writeFileSync(filePath, md, 'utf8');
      totalExtracted++;
      await sleep(200);
    }
  }

  // ====== Report ======
  const totalConvs = Object.values(allProjectConvs).reduce((s, d) => s + d.conversations.length, 0);
  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
  console.log(`Projects: ${Object.keys(allProjectConvs).length}`);
  console.log(`Total conversations: ${totalConvs}`);
  console.log(`Extracted: ${totalExtracted}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);

  writeFileSync(join(OUTPUTS, 'final-report.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    projects: Object.keys(allProjectConvs).length,
    totalConvs, totalExtracted, totalSkipped, totalErrors
  }, null, 2));

  await browser.close();
  console.log('Done!');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
