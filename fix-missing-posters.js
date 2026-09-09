// 用法：node fix-missing-posters.js
// 针对豆瓣图床已经 404 的 4 部片子，用 TMDB 的替代海报链接下载。

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_FILE = './movie-calendar-2026-final.json';
const OUT_DIR = './docs/posters';

// day_of_year -> TMDB 原图海报地址（从 TMDB 页面 og:image 拿到 hash，换成 /original/ 尺寸）
const REPLACEMENTS = {
  20: 'https://image.tmdb.org/t/p/original/u0wpPYjuSt8DIe1Y3Vapnh8jcKE.jpg', // 象人 The Elephant Man
  62: 'https://image.tmdb.org/t/p/original/kCAla6EHtwymFS73o0Gu3lRbGMl.jpg', // 印度之歌 India Song
  235: 'https://image.tmdb.org/t/p/original/5yYnTVXuLBjFQ91k2FnSWcwNn3x.jpg', // 秋菊打官司
  267: 'https://image.tmdb.org/t/p/original/c15BtJxCXMrISLVmysdsnZUPQft.jpg', // 辐射 Fallout
};

async function downloadOne(url, destPath) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
  fs.writeFileSync(destPath, res.data);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  for (const item of data) {
    const replacement = REPLACEMENTS[item.day_of_year];
    if (!replacement) continue;

    const ext = path.extname(new URL(replacement).pathname) || '.jpg';
    const filename = `${String(item.day_of_year).padStart(3, '0')}${ext}`;
    const dest = path.join(OUT_DIR, filename);

    try {
      await downloadOne(replacement, dest);
      item.poster_local = `/posters/${filename}`;
      item.poster_url_original_broken = item.poster_url; // 保留豆瓣原始失效链接备查
      item.poster_url = replacement;
      item.poster_source = 'tmdb';
      console.log(`第${item.day_of_year}天成功(TMDB): ${item.title_cn}`);
    } catch (e) {
      console.log(`第${item.day_of_year}天仍失败: ${item.title_cn} -> ${e.message}`);
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('已更新', DATA_FILE);
}

main();
