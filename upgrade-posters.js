// 用法：node upgrade-posters.js
// 把豆瓣来源的海报从 s_ratio_poster（小图）换成 l_ratio_poster（大图），重新下载。
// TMDB 来源的（poster_source === 'tmdb'）跳过，本来就是原图。

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
    timeout: 15000
  });
  fs.writeFileSync(destPath, res.data);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  let ok = 0, fail = 0, skipped = 0;
  for (const item of data) {
    if (item.poster_source === 'tmdb') { skipped++; continue; }
    if (!item.poster_url || !item.poster_url.includes('s_ratio_poster')) { skipped++; continue; }

    const largeUrl = item.poster_url.replace('s_ratio_poster', 'l_ratio_poster');
    const ext = path.extname(new URL(largeUrl).pathname) || '.jpg';
    const filename = `${String(item.day_of_year).padStart(3, '0')}${ext}`;
    const dest = path.join(OUT_DIR, filename);

    try {
      await downloadOne(largeUrl, dest);
      item.poster_url = largeUrl;
      ok++;
      if (ok % 20 === 0) {
        console.log(`已升级 ${ok} / ${data.length}`);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      }
    } catch (e) {
      console.log(`第${item.day_of_year}天失败: ${item.title_cn} -> ${e.message}`);
      fail++;
    }
    await sleep(300);
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n完成：成功 ${ok}，失败 ${fail}，跳过(TMDB/无匹配) ${skipped}`);
  console.log(`已更新 ${DATA_FILE} 和 ${OUT_DIR}/`);
}

main();
