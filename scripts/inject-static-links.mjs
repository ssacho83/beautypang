/**
 * beautypang — 내부링크 정적 삽입 (SEO)
 *
 * 배경: related-tools.js가 innerHTML로 링크를 주입해서
 *       HTML 소스에는 내부링크가 없다 → 크롤러가 링크 그래프를 못 본다.
 * 조치: 주제적으로 연관된 도구 링크를 <nav>로 HTML에 직접 심는다.
 *       기존 JS 카드 그리드는 그대로 둔다(사용자 경험은 유지, 중복은 rel로 처리 안 함 — 같은 링크 중복은 무해).
 *
 * 실행: node scripts/inject-static-links.mjs
 * 멱등: 이미 삽입된 페이지는 건너뛴다(마커로 판별).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = 'bp-static-links';

const NAMES = {
  'age-calculator': '만 나이 계산기',
  'alcohol-calculator': '혈중알코올농도 계산기',
  'bmi-calculator': 'BMI 계산기',
  'body-composition': '체지방률 계산기',
  'caffeine': '카페인 계산기',
  'calorie-calculator': '칼로리 계산기',
  'd-day': '디데이 계산기',
  'exercise-calorie': '운동 칼로리 계산기',
  'height-predictor': '예상 키 계산기',
  'obesity-check': '복부비만 계산기',
  'one-rep-max': '1RM 계산기',
  'ovulation-calculator': '배란일·생리일 계산기',
  'pregnancy-calculator': '임신 주수 계산기',
  'protein-calculator': '단백질 섭취량 계산기',
  'running-pace': '러닝 페이스 계산기',
  'sleep-calculator': '수면 시간 계산기',
  'water-intake': '하루 물 섭취량 계산기',
};

// 주제 클러스터 — 검색 의도가 이어지는 것끼리 묶는다.
// 무작위 5개보다 관련성 높은 링크가 SEO·이탈률 모두에 낫다.
const RELATED = {
  'pregnancy-calculator': ['ovulation-calculator', 'd-day', 'age-calculator', 'height-predictor', 'protein-calculator'],
  'ovulation-calculator': ['pregnancy-calculator', 'd-day', 'bmi-calculator', 'water-intake', 'height-predictor'],
  'age-calculator': ['d-day', 'height-predictor', 'bmi-calculator', 'pregnancy-calculator', 'sleep-calculator'],
  'd-day': ['age-calculator', 'pregnancy-calculator', 'ovulation-calculator', 'height-predictor', 'sleep-calculator'],
  'bmi-calculator': ['body-composition', 'calorie-calculator', 'obesity-check', 'protein-calculator', 'height-predictor'],
  'body-composition': ['bmi-calculator', 'obesity-check', 'protein-calculator', 'calorie-calculator', 'height-predictor'],
  'obesity-check': ['bmi-calculator', 'body-composition', 'calorie-calculator', 'exercise-calorie', 'water-intake'],
  'calorie-calculator': ['bmi-calculator', 'exercise-calorie', 'protein-calculator', 'body-composition', 'height-predictor'],
  'exercise-calorie': ['calorie-calculator', 'one-rep-max', 'running-pace', 'bmi-calculator', 'protein-calculator'],
  'protein-calculator': ['calorie-calculator', 'body-composition', 'one-rep-max', 'bmi-calculator', 'height-predictor'],
  'one-rep-max': ['exercise-calorie', 'protein-calculator', 'body-composition', 'running-pace', 'calorie-calculator'],
  'running-pace': ['exercise-calorie', 'one-rep-max', 'water-intake', 'calorie-calculator', 'sleep-calculator'],
  'water-intake': ['caffeine', 'calorie-calculator', 'protein-calculator', 'bmi-calculator', 'height-predictor'],
  'caffeine': ['sleep-calculator', 'water-intake', 'alcohol-calculator', 'calorie-calculator', 'bmi-calculator'],
  'sleep-calculator': ['caffeine', 'water-intake', 'height-predictor', 'bmi-calculator', 'age-calculator'],
  'alcohol-calculator': ['caffeine', 'water-intake', 'bmi-calculator', 'sleep-calculator', 'calorie-calculator'],
  'height-predictor': ['age-calculator', 'bmi-calculator', 'protein-calculator', 'sleep-calculator', 'body-composition'],
};

// 기존 블록을 찾아내는 정규식 — 재실행 시 건너뛰지 않고 최신 RELATED로 교체한다.
// (건너뛰기만 하면 링크 구성을 바꿔도 배포본에 영원히 반영되지 않는다.)
const BLOCK_RE = new RegExp(`\\n?\\s*<nav class="${MARKER}"[\\s\\S]*?<\\/nav>\\n?`, 'g');

let changed = 0, unchanged = 0;

for (const [slug, related] of Object.entries(RELATED)) {
  const file = join(ROOT, slug, 'index.html');
  if (!existsSync(file)) { console.log(`  SKIP(없음) ${slug}`); continue; }

  let html = readFileSync(file, 'utf8');

  const links = related
    .filter(r => NAMES[r] && r !== slug)
    .map(r => `<a href="/${r}/">${NAMES[r]}</a>`)
    .join('\n      ');

  const block = `
  <nav class="${MARKER}" aria-label="관련 계산기">
    <h2>함께 쓰면 좋은 계산기</h2>
    <div class="bp-static-links-row">
      ${links}
      <a href="/">전체 계산기 모음</a>
    </div>
  </nav>
`;

  if (!html.includes('</body>')) { console.log(`  SKIP(body없음) ${slug}`); continue; }

  const before = html;
  html = html.includes(MARKER)
    ? html.replace(BLOCK_RE, '\n').replace('</body>', `${block}</body>`)
    : html.replace('</body>', `${block}</body>`);

  if (html === before) { unchanged++; console.log(`  = ${slug} (변경 없음)`); continue; }

  writeFileSync(file, html, 'utf8');
  changed++;
  console.log(`  OK ${slug} → ${related.length + 1} links`);
}

console.log(`\n완료: ${changed}개 수정, ${unchanged}개 변경없음`);
