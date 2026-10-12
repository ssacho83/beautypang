/**
 * 🎨 가이드 글 대표 이미지(SVG) 생성기 — 2026-08-06
 *
 * 왜 SVG인가:
 *  - 🔴 사진을 쓸 수 없다. D:하드 사진 393장은 **출처 불명 스톡이라 사용 금지** 판정,
 *    웹에서 찾은 이미지·제품 사진은 저작권. 애드센스가 붙은 사이트에서 저작권 문제가 나면
 *    happyhouse83과 공유하는 pub 계정 전체가 위험하다.
 *  - 코드로 그리면 저작권 0·비용 0·131편 자동. 용량도 2~4KB로 사진보다 훨씬 가볍다.
 *
 * 무엇을 그리나:
 *  - 🔴 131편이 전부 같은 배경에 제목만 다르면 안 넣느니만 못하다.
 *    → 제목 키워드로 **주제를 판정**해 색·심볼·패턴을 바꾼다(스킨케어/식습관/운동/수면/모발…).
 *  - 본문 최상단 히로 이미지 겸 OG 썸네일(1200×630)로 공용.
 */

/* ── 주제 판정 ─────────────────────────────────────────────
   제목에 어떤 단어가 있느냐로 테마를 고른다. 못 찾으면 기본 테마. */
const THEMES = [
  {
    id: "hair",
    kw: ["염색", "모발", "머리", "헤어", "탈모", "샴푸"],
    c1: "#8B5CF6", c2: "#EC4899", soft: "#FCE7F3", label: "헤어 케어",
    // 물결 = 머릿결
    art: `<g stroke="#fff" stroke-width="3" fill="none" opacity=".9" stroke-linecap="round">
      <path d="M0 26 Q 18 6 36 26 T 72 26"/><path d="M0 44 Q 18 24 36 44 T 72 44"/>
      <path d="M0 62 Q 18 42 36 62 T 72 62"/></g>`,
  },
  {
    id: "skin",
    kw: ["선크림", "비비", "화장", "피부", "크림", "자외선", "클렌징", "각질"],
    c1: "#F97316", c2: "#EC4899", soft: "#FFEDD5", label: "스킨케어",
    // 해 = 자외선·피부
    art: `<g fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round">
      <circle cx="36" cy="36" r="15"/>
      <path d="M36 6v8M36 58v8M6 36h8M58 36h8M15 15l6 6M51 51l6 6M57 15l-6 6M21 51l-6 6"/></g>`,
  },
  {
    id: "body",
    kw: ["뼈", "관절", "손목", "허리", "목", "어깨", "건강의"],
    c1: "#0EA5E9", c2: "#6366F1", soft: "#E0F2FE", label: "몸·건강",
    // 방패 = 보호·건강
    art: `<g fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round">
      <path d="M36 8l22 9v16c0 15-9 25-22 31-13-6-22-16-22-31V17z"/>
      <path d="M27 36l7 7 12-14" stroke-linecap="round"/></g>`,
  },
  {
    id: "food",
    kw: ["식습관", "음식", "설탕", "감미료", "밀가루", "먹", "영양", "단백질", "칼로리", "식단"],
    c1: "#10B981", c2: "#2563EB", soft: "#D1FAE5", label: "식습관·영양",
    // 잎 = 음식·영양
    art: `<g fill="#fff" opacity=".92">
      <path d="M36 8C20 18 12 32 14 50c18 4 32-6 40-22 3-7 0-16-18-20z"/>
      <path d="M14 50c8-10 18-18 30-24" stroke="#fff" stroke-width="2.4" fill="none" opacity=".55"/></g>`,
  },
  {
    id: "exercise",
    kw: ["운동", "뱃살", "다이어트", "근육", "스트레칭", "체지방", "러닝", "걷기"],
    c1: "#2563EB", c2: "#06B6D4", soft: "#DBEAFE", label: "운동·다이어트",
    // 덤벨
    art: `<g fill="#fff" opacity=".95">
      <rect x="8" y="28" width="10" height="18" rx="3"/><rect x="54" y="28" width="10" height="18" rx="3"/>
      <rect x="20" y="33" width="8" height="8" rx="2.5"/><rect x="44" y="33" width="8" height="8" rx="2.5"/>
      <rect x="26" y="34.5" width="20" height="5" rx="2.5"/></g>`,
  },
  {
    id: "sleep",
    kw: ["수면", "잠", "낮과 밤", "생체리듬", "불면", "밤"],
    c1: "#6366F1", c2: "#8B5CF6", soft: "#E0E7FF", label: "수면·리듬",
    // 달
    art: `<g fill="#fff" opacity=".95">
      <path d="M44 10a26 26 0 1 0 18 44A28 28 0 0 1 44 10z"/>
      <circle cx="20" cy="18" r="2.6" opacity=".85"/><circle cx="30" cy="10" r="1.8" opacity=".7"/>
      <circle cx="13" cy="30" r="1.6" opacity=".6"/></g>`,
  },
];

const FALLBACK = {
  id: "general", c1: "#2563EB", c2: "#8B5CF6", soft: "#EDE9FE", label: "건강·뷰티",
  art: `<g fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round">
    <circle cx="36" cy="36" r="20"/><path d="M28 36l6 6 12-14"/></g>`,
};

export function pickTheme(title) {
  for (const t of THEMES) if (t.kw.some((k) => title.includes(k))) return t;
  return FALLBACK;
}

/* 제목을 화면 폭에 맞춰 줄바꿈. 한글은 글자폭이 거의 일정해서 글자 수로 끊어도 어긋나지 않는다. */
function wrap(title, per = 15, maxLines = 3) {
  const words = title.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > per && cur) { lines.push(cur.trim()); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].slice(0, per - 1) + "…";
    return cut;
  }
  return lines;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * 대표 이미지 SVG (1200×630 — OG 표준 비율).
 * 본문 상단 히로와 공유 썸네일에 같은 파일을 쓴다.
 */
export function heroSvg(title) {
  const t = pickTheme(title);
  const lines = wrap(title);
  const startY = 315 - (lines.length - 1) * 33;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/>
    </linearGradient>
    <pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse">
      <circle cx="2.5" cy="2.5" r="2.5" fill="#fff" opacity=".07"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <circle cx="1055" cy="120" r="230" fill="#fff" opacity=".07"/>
  <circle cx="150" cy="560" r="180" fill="#fff" opacity=".05"/>

  <g transform="translate(96,150)">${t.art}</g>

  <text x="96" y="128" font-family="Pretendard,'Malgun Gothic',sans-serif" font-size="25" font-weight="700" fill="#fff" opacity=".82" letter-spacing="1">${esc(t.label)}</text>

  ${lines.map((l, i) => `<text x="96" y="${startY + i * 66}" font-family="Pretendard,'Malgun Gothic',sans-serif" font-size="55" font-weight="800" fill="#fff" letter-spacing="-1">${esc(l)}</text>`).join("\n  ")}

  <rect x="96" y="${startY + (lines.length - 1) * 66 + 42}" width="70" height="5" rx="2.5" fill="#fff" opacity=".65"/>
  <text x="96" y="${startY + (lines.length - 1) * 66 + 92}" font-family="Pretendard,'Malgun Gothic',sans-serif" font-size="23" font-weight="600" fill="#fff" opacity=".72">beautypang.co.kr</text>
</svg>`;
}

/** 목록 카드용 작은 썸네일(테마 색만 쓰는 가벼운 버전). */
export function thumbSvg(title) {
  const t = pickTheme(title);
  // 🔴 id 를 테마별로 고유하게. 인라인 SVG 를 한 페이지에 여러 개 넣으면
  //    같은 id("g")끼리 충돌해 **첫 번째 그라디언트가 전부에 적용된다**
  //    (2026-08-06 실측: 목록 썸네일이 전부 보라색으로 나왔다).
  const gid = `tg-${t.id}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
  <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient></defs>
  <rect width="72" height="72" rx="16" fill="url(#${gid})"/>
  <g transform="scale(0.72) translate(14,14)">${t.art}</g>
</svg>`;
}
