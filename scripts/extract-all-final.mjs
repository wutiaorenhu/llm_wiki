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

async function postJSON(ctx, path, body = {}) {
  const url = `https://yuanbao.tencent.com${path}`;
  const resp = await ctx.request.post(url, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    data: body
  });
  const json = await resp.json().catch(() => null);
  return { ok: resp.ok(), status: resp.status(), data: json };
}

async function main() {
  // ====== 0. Launch ======
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const ctxOpts = { viewport: { width: 1440, height: 900 }, locale: 'zh-CN' };
  if (existsSync(AUTH_STATE)) ctxOpts.storageState = JSON.parse(readFileSync(AUTH_STATE, 'utf8'));
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();

  // Navigate to set cookies
  await page.goto('https://yuanbao.tencent.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // ====== 1. Get all projects ======
  console.log('\n=== STEP 1: Fetching projects ===');
  const projResp = await postJSON(context, '/api/v5/projectLogic/project/get-user-projects', {});
  const projects = projResp.data?.data?.items || [];

  console.log(`${projects.length} projects:`);
  projects.forEach(p => console.log(`  ${p.name} (${p.project_id})`));

  // ====== 2. For each project, get conversations ======
  console.log('\n=== STEP 2: Fetching conversations per project ===');
  const projectConvs = {};

  for (const proj of projects) {
    console.log(`\nProject: ${proj.name}`);
    const convResp = await postJSON(context, '/api/user/agent/conversation/v3/list', {
      agent_id: 'naQivTmsDa',
      project_id: proj.project_id,
      page_size: 500,
      top_time: 0,
      action: 1,
      last_replied_at: 0
    });

    let conversations = convResp.data?.data?.conversations || convResp.data?.conversations || [];

    console.log(`  ${conversations.length} conversations`);
    projectConvs[proj.project_id] = {
      name: proj.name,
      conversations: conversations.map(c => ({
        id: c.id || c.cid || c.conversation_id,
        title: c.title || c.name || c.sessionTitle || 'untitled'
      }))
    };

    if (conversations.length > 0) {
      conversations.slice(0, 3).forEach(c =>
        console.log(`    - ${c.title || c.sessionTitle || c.name}`));
    }

    await sleep(500);
  }

  // Save project-to-conversation mapping
  writeFileSync(join(OUTPUTS, 'project-conv-map.json'), JSON.stringify(projectConvs, null, 2));

  // ====== 3. Extract each conversation ======
  console.log('\n=== STEP 3: Extracting conversation messages ===');

  let totalExtracted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [projId, projData] of Object.entries(projectConvs)) {
    const { name: projName, conversations } = projData;
    const groupDir = join(RAW, slug(projName));

    if (!existsSync(groupDir)) mkdirSync(groupDir, { recursive: true });
    if (conversations.length === 0) continue;

    console.log(`\n--- ${projName} (${conversations.length} convos) ---`);

    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      const convTitle = conv.title;
      const cleanTitle = slug(convTitle) || `conv-${i}`;
      const fileIdx = String(i + 1).padStart(3, '0');
      const fileName = `${fileIdx}-${cleanTitle}.md`;
      const filePath = join(groupDir, fileName);

      // Skip if exists
      if (existsSync(filePath)) {
        totalSkipped++;
        if (totalSkipped % 20 === 0) console.log(`  Skipped ${totalSkipped} existing...`);
        continue;
      }

      console.log(`  [${i + 1}/${conversations.length}] ${convTitle}`);

      try {
        // Fetch detail
        const detailResp = await postJSON(context, '/api/user/agent/conversation/v1/detail', {
          conversationId: conv.id
        });

        if (!detailResp.ok) {
          console.log(`    ERROR: API returned ${detailResp.status}`);
          totalErrors++;
          continue;
        }

        // Parse messages
        const raw = detailResp.data;
        let messages = [];
        const d = raw?.data;

        // Handle conversations array format (common in yuanbao)
        if (d?.conversations && Array.isArray(d.conversations)) {
          for (const entry of d.conversations) {
            const speaker = entry.speaker || 'ai';
            // Check speechesV2 (most common format)
            if (entry.speechesV2 && Array.isArray(entry.speechesV2)) {
              for (const speech of entry.speechesV2) {
                const role = speech.speaker || speaker;
                let content = '';
                if (speech.content && Array.isArray(speech.content)) {
                  content = speech.content
                    .map(b => {
                      if (typeof b === 'string') return b;
                      if (b.type === 'text' || b.type === 'markdown') return b.msg || b.content || b.data || '';
                      if (b.msg) return typeof b.msg === 'string' ? b.msg : JSON.stringify(b.msg);
                      return '';
                    })
                    .filter(Boolean)
                    .join('\n\n');
                } else if (typeof speech.content === 'string') {
                  content = speech.content;
                }
                if (content.trim()) {
                  messages.push({ role, content: content.trim() });
                }
              }
            }
            // Check simple format
            if (entry.msg && typeof entry.msg === 'string') {
              messages.push({ role: speaker, content: entry.msg });
            }
          }
        }

        // Handle simple messages array
        if (messages.length === 0) {
          if (d?.messages) messages = d.messages;
          else if (Array.isArray(d)) messages = d;
        }

        // Build markdown
        let md = `---
title: "${convTitle}"
type: source-summary
source: yuanbao
project: "${projName}"
project_id: "${projId}"
conversation_id: "${conv.id}"
extracted: ${new Date().toISOString().slice(0, 10)}
confidence: low
---

# ${convTitle}

> 来源: 元宝 (腾讯元宝) · ${projName}
> 会话 ID: \`${conv.id}\`

`;

        if (messages.length > 0) {
          let msgCount = 0;
          for (const msg of messages) {
            const lowerRole = (msg.role || '').toLowerCase();
            const isUser = lowerRole === 'user' || lowerRole === 'human';
            const prefix = isUser ? '**User**' : '**AI**';
            const content = typeof msg.content === 'string' ? msg.content.trim() : msg.text?.trim() || msg.msg?.trim() || '';

            if (content) {
              msgCount++;
              md += `### ${prefix}\n\n${content}\n\n`;
            }
          }
          if (msgCount === 0) {
            // If no messages could be parsed, save raw structure
            md += `## Messages (raw)\n\n\`\`\`json\n${JSON.stringify(messages.slice(0, 5), null, 2)}\n\`\`\`\n\n`;
          }
        } else {
          md += `## Raw Response\n\n\`\`\`json\n${JSON.stringify(raw, null, 2).slice(0, 30000)}\n\`\`\`\n\n`;
        }

        md += `\n---\n*Auto-extracted via API from yuanbao.tencent.com*\n`;

        writeFileSync(filePath, md, 'utf8');
        totalExtracted++;
      } catch (e) {
        console.log(`    ERROR: ${e.message}`);
        totalErrors++;
      }

      // Rate limit
      await sleep(300);
    }
  }

  // ====== 4. Report ======
  const totalConvs = Object.values(projectConvs).reduce((s, p) => s + p.conversations.length, 0);
  console.log('\n' + '='.repeat(60));
  console.log('EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Projects: ${projects.length}`);
  console.log(`Total conversations: ${totalConvs}`);
  console.log(`Extracted: ${totalExtracted}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);

  writeFileSync(join(OUTPUTS, 'final-report.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    projects: projects.length,
    totalConvs,
    totalExtracted,
    totalSkipped,
    totalErrors
  }, null, 2));

  await browser.close();
  console.log('Done!');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
