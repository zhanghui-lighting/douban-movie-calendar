// 在本地 Claude Code / 终端里跑，需要真实联网。
// 用法：node download-posters.js
// 依赖：npm install axios   （仓库 package.json 已经有这个依赖）

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_FILE = './movie-calendar-2026-clean.json';
const OUT_DIR = './docs/posters';
const OUT_JSON = './movie-calendar-2026-final.json';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function downloadOne(url, destPath) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      // 关键：豆瓣图床按 Referer 拦截，没有这个头基本会 403 或拿到占位图
      'Referer': 'https://movie.douban.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 15000
  });
  fs.writeFileSync(destPath, res.data);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0, fail = 0;
  for (const item of data) {
    const ext = path.extname(new URL(item.poster_url).pathname) || '.jpg';
    const filename = `${String(item.day_of_year).padStart(3, '0')}${ext}`;
    const dest = path.join(OUT_DIR, filename);

    if (!item.poster_url) { fail++; continue; }
    try {
      await downloadOne(item.poster_url, dest);
      item.poster_local = `/posters/${filename}`;
      ok++;
      if (ok % 20 === 0) console.log(`已下载 ${ok} / ${data.length}`);
    } catch (e) {
      console.log(`第${item.day_of_year}天失败: ${item.title_cn} -> ${e.message}`);
      item.poster_local = null;
      fail++;
    }
    await sleep(300); // 别把豆瓣打太狠，间隔一下
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n完成：成功 ${ok}，失败 ${fail}`);
  console.log(`海报存在 ${OUT_DIR}/，最终数据在 ${OUT_JSON}`);
}

main();
