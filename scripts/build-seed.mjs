import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseHymns, parseSupplement, toSeedSql } from './catalog.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, 'utf8');

const hymns = parseHymns(read('data/raw/hymns.txt'));
const supplement = parseSupplement(read('data/raw/supplement.txt'));

writeFileSync(`${root}supabase/seed.sql`, toSeedSql([...hymns, ...supplement]));
console.log(`seed.sql：詩歌本 ${hymns.length} 首、補充本 ${supplement.length} 首`);
