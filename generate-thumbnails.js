// 在本地 Claude Code / 终端里跑，需要项目里已经有 docs/posters/ 那批真实图片文件
// 用法：node generate-thumbnails.js
// 依赖：npm install sharp   （用于压缩生成小图，比自己写压缩逻辑靠谱很多）

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const POSTER_DIR = './docs/posters';
const THUMB_DIR = './docs/posters/thumb';
const DATA_FILE = './movie-calendar-2026-final.json'; // 用你现在最终这份数据
const OUT_FILE = './movie-calendar-2026-final.json';  // 直接原地更新，写回同一个文件

const THUMB_WIDTH = 180; // 月历小格实际显示大概99-120px宽，180px够清晰又不浪费

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  fs.mkdirSync(THUMB_DIR, { recursive: true });

  let ok = 0, fail = 0;
  for (const item of data) {
    if (!item.poster_local) { fail++; continue; }
    const srcPath = path.join('.', item.poster_local.replace(/^\/?(docs\/)?/, 'docs/'));
    const filename = path.basename(item.poster_local, path.extname(item.poster_local)) + '.webp';
    const destPath = path.join(THUMB_DIR, filename);

    try {
      await sharp(srcPath)
        .resize({ width: THUMB_WIDTH })
        .webp({ quality: 72 })
        .toFile(destPath);
      item.poster_thumb = `/posters/thumb/${filename}`;
      ok++;
    } catch (e) {
      console.log(`第${item.day_of_year}天生成缩略图失败: ${e.message}`);
      fail++;
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n完成：成功 ${ok}，失败 ${fail}`);
  console.log(`小图存在 ${THUMB_DIR}/，movie-calendar-2026-final.json 已加上 poster_thumb 字段`);
}

main();
