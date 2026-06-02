#!/usr/bin/env node
/**
 * beautypang — 검색엔진 색인 알림 스크립트
 *
 * 사용법:
 *   1. .env 파일에 INDEXNOW_KEY 설정 (Bing/Yandex IndexNow API 키)
 *   2. node scripts/submit-urls.mjs [URL1] [URL2] ...
 *      또는 인자 없이 실행하면 sitemap.xml의 모든 URL 일괄 제출
 *
 * 효과:
 *   - Bing·Yandex 즉시 색인 알림 (IndexNow API)
 *   - Google·네이버에 sitemap.xml 갱신 ping
 *
 * 일반적으로 신규 페이지 추가·콘텐츠 큰 변경 시 1회 실행하면 충분.
 * git push 후 자동 실행하려면 .github/workflows/indexnow.yml 활용.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HOST = 'beautypang.co.kr';
const SITE = `https://${HOST}`;
const __dirname = dirname(fileURLToPath(import.meta.url));
const SITEMAP_PATH = join(__dirname, '..', 'sitemap.xml');

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;

async function loadSitemapUrls() {
  const xml = await readFile(SITEMAP_PATH, 'utf-8');
  const matches = xml.match(/<loc>(.*?)<\/loc>/g) || [];
  return matches.map(m => m.replace(/<\/?loc>/g, '').trim()).filter(u => u.startsWith(SITE));
}

async function pingIndexNow(urls) {
  if (!INDEXNOW_KEY) {
    console.log('⚠️ INDEXNOW_KEY 환경변수 없음 — IndexNow 건너뜀.');
    console.log('   Bing Webmaster Tools → Settings → IndexNow에서 키 발급 후');
    console.log('   .env 파일에 INDEXNOW_KEY=xxx 추가 + public/{KEY}.txt 키 파일 호스팅 필요.');
    return false;
  }
  const body = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };
  console.log(`📤 IndexNow에 ${urls.length}개 URL 전송 중...`);
  const r = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const txt = await r.text().catch(() => '');
  if (r.status >= 200 && r.status < 300) {
    console.log(`✅ IndexNow 성공 (${r.status}) — Bing·Yandex 색인 큐 진입`);
    return true;
  }
  console.log(`❌ IndexNow 실패 (${r.status}): ${txt.slice(0, 200)}`);
  return false;
}

async function pingGoogleSitemap() {
  // Google Search Ping은 deprecated (2023.6)이지만 sitemap.xml 재발견 효과는 있음
  // 정식 등록은 Search Console 필요. 이건 보조 트리거.
  const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITE + '/sitemap.xml')}`;
  console.log(`📤 Google sitemap ping...`);
  try {
    const r = await fetch(url, { method: 'GET' });
    console.log(r.status === 200 ? `✅ Google ping OK` : `⚠️ Google ping ${r.status}`);
  } catch (e) {
    console.log(`⚠️ Google ping 오류: ${e.message}`);
  }
}

async function pingNaverSitemap() {
  // 네이버 서치어드바이저는 공식 ping API가 없음
  // 사용자가 직접 https://searchadvisor.naver.com 에서 사이트맵 제출 권장
  console.log('ℹ️ 네이버는 공식 ping API 없음 — searchadvisor.naver.com에서 수동 제출');
}

async function main() {
  const args = process.argv.slice(2);
  let urls;
  if (args.length > 0) {
    urls = args.map(u => u.startsWith('http') ? u : `${SITE}${u.startsWith('/') ? '' : '/'}${u}`);
    console.log(`📋 인자에서 ${urls.length}개 URL 받음`);
  } else {
    urls = await loadSitemapUrls();
    console.log(`📋 sitemap.xml에서 ${urls.length}개 URL 로드`);
  }
  urls.forEach(u => console.log(`  · ${u}`));
  console.log('');

  await pingIndexNow(urls);
  await pingGoogleSitemap();
  await pingNaverSitemap();

  console.log('\n💡 Google Search Console + 네이버 서치어드바이저는 가끔 수동 색인 요청 권장 (주 1회)');
}

main().catch(e => { console.error(e); process.exit(1); });
