// 用法：node retry-posters.js
// 只重试 movie-calendar-2026-final.json 中 poster_local 为 null 的条目，
// 加大延迟 + 每条最多重试 3 次，缓解豆瓣图床 502 限流。

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_FILE = './movie-calendar-2026-final.json';
const OUT_DIR = './docs/posters';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function downloadOne(url, destPath) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'Referer': 'https://movie.douban.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 20000
  });
  fs.writeFileSync(destPath, res.data);
}

async function downloadWithRetry(url, destPath, maxAttempts) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await downloadOne(url, destPath);
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) await sleep(2000 * attempt);
    }
  }
  throw lastErr;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const failedItems = data.filter(item => !item.poster_local);
  console.log(`待重试 ${failedItems.length} 条`);

  let ok = 0, fail = 0;
  for (const item of failedItems) {
    if (!item.poster_url) { fail++; continue; }
    const ext = path.extname(new URL(item.poster_url).pathname) || '.jpg';
    const filename = `${String(item.day_of_year).padStart(3, '0')}${ext}`;
    const dest = path.join(OUT_DIR, filename);

    try {
      await downloadWithRetry(item.poster_url, dest, 3);
      item.poster_local = `/posters/${filename}`;
      ok++;
      console.log(`第${item.day_of_year}天成功: ${item.title_cn}`);
    } catch (e) {
      console.log(`第${item.day_of_year}天仍失败: ${item.title_cn} -> ${e.message}`);
      fail++;
    }
    await sleep(1000); // 拉长间隔，减轻限流
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n重试完成：成功 ${ok}，仍失败 ${fail}`);
  console.log(`已更新 ${DATA_FILE}`);
}

main();
