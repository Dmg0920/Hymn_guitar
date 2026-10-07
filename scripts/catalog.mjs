// 解析 data/raw/ 下的詩歌目錄文字檔，產生 songs 表的 seed 資料。

const HYMN_LINE = /^(.+?)\s+((?:\d+\s*)+)$/;
const HYMN_APPENDIX_LINE = /^附(\d+)\s+(.+)$/;
const SUPPLEMENT_LINE = /^(\d{4})[\s　]+(.+)$/;
const APPENDIX_SORT_OFFSET = 10000;

function contentLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/　/g, ' ').trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

function assertUniqueCodes(entries, label) {
  const seen = new Set();
  for (const { code } of entries) {
    if (seen.has(code)) throw new Error(`${label}: 重複的號碼 ${code}`);
    seen.add(code);
  }
}

/** 大本詩歌：只有分類，沒有歌名。 */
export function parseHymns(text) {
  const entries = [];
  let section = null;

  for (const line of contentLines(text)) {
    const appendix = line.match(HYMN_APPENDIX_LINE);
    if (appendix) {
      const n = Number(appendix[1]);
      entries.push({
        book: 'hymn',
        code: `附${n}`,
        title: null,
        category: `附・${appendix[2].trim()}`,
        sortKey: APPENDIX_SORT_OFFSET + n,
      });
      continue;
    }

    const sub = line.match(HYMN_LINE);
    if (!sub) {
      section = line;
      continue;
    }
    if (!section) throw new Error(`詩歌本: 「${line}」之前沒有大分類`);

    const subName = sub[1].trim();
    for (const num of sub[2].trim().split(/\s+/).map(Number)) {
      entries.push({
        book: 'hymn',
        code: String(num),
        title: null,
        category: `${section}・${subName}`,
        sortKey: num,
      });
    }
  }

  assertUniqueCodes(entries, '詩歌本');
  return entries;
}

/** 補充本：四位數號碼 + 歌名，號碼存成去掉前導零的字串（0101 → "101"）。 */
export function parseSupplement(text) {
  const entries = [];
  let section = null;

  for (const line of contentLines(text)) {
    const song = line.match(SUPPLEMENT_LINE);
    if (!song) {
      section = line;
      continue;
    }
    if (!section) throw new Error(`補充本: 「${line}」之前沒有分類`);

    const num = Number(song[1]);
    entries.push({
      book: 'supplement',
      code: String(num),
      title: song[2].trim(),
      category: section,
      sortKey: num,
    });
  }

  assertUniqueCodes(entries, '補充本');
  return entries;
}

function sqlString(value) {
  return value === null ? 'null' : `'${value.replace(/'/g, "''")}'`;
}

export function toSeedSql(entries) {
  const rows = entries.map(
    (e) =>
      `  ('${e.book}', ${sqlString(e.code)}, ${sqlString(e.title)}, ${sqlString(e.category)}, ${e.sortKey})`,
  );
  return [
    '-- 由 scripts/build-seed.mjs 從 data/raw/*.txt 產生，請勿手動修改。',
    '-- 可重複執行：已存在的歌只更新分類與排序，不覆蓋你在後台補上的歌名。',
    'insert into public.songs (book, code, title, category, sort_key) values',
    rows.join(',\n'),
    'on conflict (book, code) do update set',
    '  category = excluded.category,',
    '  sort_key = excluded.sort_key,',
    '  title = coalesce(public.songs.title, excluded.title);',
    '',
  ].join('\n');
}
