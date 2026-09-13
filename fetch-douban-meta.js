// 用法：node fetch-douban-meta.js
// 依赖：npm install axios cheerio（仓库 package.json 已有）
// 需要：./.douban-cookie 文件（豆瓣登录 Cookie，已加入 .gitignore，不会被提交）
//
// 给 movie-calendar-2026-final.json 里的每条记录，从其 douban_link 页面
// 补充抓取：导演(director)、制片国家/地区(country)、上映年份(year)

const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const DATA_FILE = './movie-calendar-2026-final.json';
const COOKIE_FILE = './.douban-cookie';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseMeta(html) {
  const $ = cheerio.load(html);

  const director = $('#info a[rel="v:directedBy"]')
    .map((i, el) => $(el).text().trim())
    .get()
    .join(' / ') || null;

  const infoHtml = $('#info').html() || '';
  const countryMatch = infoHtml.match(/制片国家\/地区:<\/span>\s*([^<]+)<br/);
  const country = countryMatch ? countryMatch[1].trim() : null;

  let year = null;
  const yearText = $('h1 .year').text().trim(); // "(1980)"
  const yearMatch = yearText.match(/\d{4}/);
  if (yearMatch) {
    year = yearMatch[0];
  } else {
    const releaseDate = $('#info span[property="v:initialReleaseDate"]').attr('content') || '';
    const releaseMatch = releaseDate.match(/\d{4}/);
    if (releaseMatch) year = releaseMatch[0];
  }

  return { director, country, year };
}

async function fetchOne(url, cookie) {
  const res = await axios.get(url, {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Referer': 'https://movie.douban.com/'
    },
    timeout: 15000
  });
  return parseMeta(res.data);
}

async function main() {
  if (!fs.existsSync(COOKIE_FILE)) {
    console.error(`找不到 ${COOKIE_FILE}，请先把豆瓣登录 Cookie 写入这个文件`);
    process.exit(1);
  }
  const cookie = fs.readFileSync(COOKIE_FILE, 'utf8').trim();
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  let ok = 0, fail = 0;
  for (const item of data) {
    if (!item.douban_link) { fail++; continue; }
    try {
      const meta = await fetchOne(item.douban_link, cookie);
      item.director = meta.director;
      item.country = meta.country;
      item.year = meta.year;
      ok++;
      if (ok % 20 === 0) {
        console.log(`已抓取 ${ok} / ${data.length}`);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      }
    } catch (e) {
      console.log(`第${item.day_of_year}天失败: ${item.title_cn} -> ${e.message}`);
      fail++;
    }
    await sleep(1500); // 已登录也别太狠，间隔一下
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n完成：成功 ${ok}，失败 ${fail}`);
  console.log(`已更新 ${DATA_FILE}`);
}

main();
