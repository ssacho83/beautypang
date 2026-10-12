#!/usr/bin/env node
/**
 * 📝 뷰티팡 /guide/ 자동 발행 엔진 (2026-08-06 신설)
 *
 * 무엇을: `business-hq/content/manuscripts/` 의 원고(.txt)를 읽어
 *         뷰티팡 결에 맞는 정적 HTML 페이지로 변환·생성한다.
 *
 * 왜 이 방식인가 (2026-08-06 설계 판단):
 *  - 🔴 원문을 AI로 재작성하지 않는다(싸초 확정). 이 원고의 최대 무기는
 *    "사람이 실제로 겪고 쓴 글"이라는 점이고, 2026년 구글·네이버 알고리즘이
 *    정확히 그걸 찾는다(AI 대량생산물 필터 강화). 다듬으면 그 색이 빠진다.
 *  - 하는 일은 **구조화와 SEO 메타 부착**뿐: 제목 추출, 문단 분리,
 *    번호 목록(1. 2. 3.)을 소제목으로 승격, 메타·OG·JSON-LD 생성.
 *
 * 🔴 절대 건드리지 않는 것:
 *  - `assets/guide.css` — 계산기 17개가 이 파일을 공유한다. 덮으면 전멸.
 *    가이드 전용 스타일은 페이지 안에 <style>로 인라인한다.
 *  - 기존 계산기 폴더 — 이 스크립트는 `guide/` 아래에만 쓴다.
 *
 * 사용:
 *   node scripts/build-guide.mjs --limit 10      # 10편만 (기본)
 *   node scripts/build-guide.mjs --all           # 전량
 *   node scripts/build-guide.mjs --dry           # 파일 안 쓰고 결과만 확인
 */

import fs from "node:fs";
import path from "node:path";
import { heroSvg, thumbSvg } from "./guide-image.mjs";

const SITE = "https://beautypang.co.kr";
const SRC = "c:/Users/a0106/OneDrive/projects/business-hq/content/manuscripts";
const OUT = path.resolve(process.cwd(), "guide");

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const ALL = args.includes("--all");
/* 🔴 --new : 이미 발행된 글은 건너뛰고 «아직 안 나간 것»만 처리한다 (2026-08-25 신설)
   사고: 기본 동작이 «맨 앞 N편»이라 --limit 5 를 몇 번을 눌러도 늘 같은 5편이었다.
        관제실 [발행] 버튼을 반복해서 눌러도 새 글이 한 편도 안 늘어난다.
   ⇒ guide/<slug>/index.html 이 이미 있으면 건너뛴다. */
const ONLY_NEW = args.includes("--new");
// 10/5 — «--limit 0»(새 글 0편·목록과 사이트맵만 다시)을 받는다. 예전엔 0이 기본값 10으로 바뀌었다.
const LIMIT_RAW = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : NaN;
const LIMIT = ALL ? Infinity : (Number.isFinite(LIMIT_RAW) && LIMIT_RAW >= 0 ? LIMIT_RAW : 10);

/* ── 원고 수집 ─────────────────────────────────────────────── */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".txt")) out.push(p);
  }
  return out;
}

/* ── 슬러그: 한글 제목 → URL ────────────────────────────────
   한글을 그대로 URL에 쓰면 인코딩돼 링크가 흉해지고 공유 시 깨져 보인다.
   제목의 한글은 살리되(검색엔진이 URL의 키워드도 본다) 공백·특수문자만 정리. */
/* 🔴 2026-08-06 실측: 한글 슬러그를 쓰니 URL이 `%EC%97%BC%EC%83%89…`로 인코딩돼
   공유 시 흉하고 일부 환경(curl 등)에서 404가 났다(페이지 자체는 정상인데도).
   ⇒ 영문 슬러그로 간다. 한글 키워드는 title·h1·본문에 이미 충분히 들어 있어
      검색엔진이 주제를 못 읽을 걱정은 없다. */
const SLUG_MAP = {
  /* 🔴 2026-08-25 — 121편 영문 슬러그 일괄 등록.
     왜: 여기 없으면 romanize() 로 넘어가 «sontot-geongat-moyateuro…» 같은
         한글 로마자 주소가 나온다. 애드센스 승인 도메인에 그런 URL을 121개
         쏟아부으면 SEO에 나쁘다(싸초: «무조건 좋은 쪽으로»).
     ⇒ 제목을 «영어로 번역»한 검색어형 슬러그. 중복 0·형식위반 0 검증 완료. */
  "염색약 지우는 방법": "hair-dye-removal",
  "건강한식습관": "healthy-eating-habits",
  "뱃살빼기운동": "belly-fat-exercise",
  "비비크림 바르는 방법": "bb-cream-application",
  "선크림 제대로 바르는 방법": "sunscreen-guide",
  "건강의 3요소": "three-elements-of-health",
  "모르면 손해 설탕을 대체할 수 있는 감미료가 있다고": "sugar-substitutes",
  "낮과 밤이 절대적으로 바뀌면 안 되는 이유": "day-night-rhythm",
  "뼈건강 관리법 뼈에 좋은 음식": "bone-health-foods",
  "밀가루 먹으면 안되는 이유": "why-avoid-flour",
  "손톱 건강 모양으로 보는 내 건강상태": "nail-health-signs",
  "얼굴 부위별 여드름 원인과 집에서 없애는 방법": "acne-face-map",
  "살 탔을때 피부 하얘지는 법": "sunburn-skin-recovery",
  "요요현상 없이 다이어트 하는 방법": "diet-without-rebound",
  "황칠나무 효능 부작용 만병통치약": "hwangchil-tree-benefits",
  "장염증상 급성 장염 빨리 낫는 방법": "gastroenteritis-relief",
  "임신 극초기증상 아랫배 통증 두통 초기증상": "early-pregnancy-symptoms",
  "공복에 절대적으로 하면 안되는 행동과 아침 공복에 먹으면 좋은 음식": "empty-stomach-dos-donts",
  "피부노화를 일으키는 요인 잘못된 습관 노화방지": "skin-aging-causes",
  "발톱무좀 남녀비율 전염성 강한 무좀 없애는 방법": "toenail-fungus-treatment",
  "생리를 안해요 임신 아닌데 늦어지는 이유": "late-period-not-pregnant",
  "Y존케어 여성이라면 꼭 알아야할 건강한 케어 방법": "feminine-hygiene-care",
  "식중독 증상 원인 및 치료 예방": "food-poisoning-symptoms",
  "옷 기름때 제거 옷에 묻은 기름얼룩 지우는 방법": "oil-stain-removal-clothes",
  "생활용품 지금 당장 버려야 하는 것들이 있다고": "household-items-to-toss",
  "에어컨 냄새 꿉꿉한 냄새의 원인과 제거하는 방법": "air-conditioner-odor-removal",
  "1 커피 마실 때 함께 복용하지 말아야 할 약들": "coffee-drug-interactions",
  "2 꿀우유를 마시면 우리몸에 일어나는 놀라운 변화": "honey-milk-benefits",
  "물티슈 무심코 쓰고 버린 물티슈의 위험성 우리 건강의 적신호": "wet-wipes-health-risks",
  "모공줄이기 늘어난 내 피부모공 없내는 방법": "how-to-shrink-pores",
  "더운 여름철 모기에게 물리지 않는 방법 강제헌혈 안당하기": "mosquito-bite-prevention",
  "모기가 없어지면 일어나는 일 극혐모기 멸종": "world-without-mosquitoes",
  "줄넘기를 깡충깡충 매일하면 일어나는 우리몸의 변화": "jump-rope-body-changes",
  "맥주를 매일 마시면 우리몸에 일어나는 변화 적당히 마셔야 하는 이유": "daily-beer-effects",
  "빨래 꿉꿉한 냄새 제거하는 방법 세탁물 쉰내": "laundry-musty-smell",
  "콜레스테롤 낮추고 싶으면 반드시 먹어야할 음식": "cholesterol-lowering-foods",
  "고혈압 보다 무서운 기립성 저혈압 원인 치료": "orthostatic-hypotension",
  "여름 제철음식 효능 피로회복 건강한 여름나기 더위와 친해지기": "summer-seasonal-foods",
  "다이어트 하기 의외로 좋은 살 빠지는 음식 땅콩버터 달걀 치즈": "surprising-weight-loss-foods",
  "935 에클로니아 프리미엄 7중 기능성 만성피로": "ecklonia-supplement-fatigue",
  "얼굴붓기 빼는법 퉁퉁부은 내 얼굴 갸름하게 복귀시키기": "face-swelling-remedies",
  "손가락 주름 없애기  목주름 이마주름 피해야 할 습관": "wrinkle-prevention-habits",
  "머리카락 빨리 기르는 방법 샴푸로 감는 방법하나 바꿨을 뿐인데": "faster-hair-growth",
  "운동없이 살빼기 식단조절 다이어트 체중관리 총정리": "weight-loss-without-exercise",
  "여행가서 인생샷 찍는 법 사진 잘나오게 찍는 꿀팁": "travel-photo-tips",
  "해외여행 준비전에 알아두어야 할 기본 꿀팁 A to Z": "overseas-travel-checklist",
  "운전자가 모르는 자동차 숨겨진 기능 알고나면 기가막힌 꿀팁 대방출": "hidden-car-features",
  "주유 경고등 켜지고 나서 갈 수 있는 주행거리 멈췄을 때 대처법": "low-fuel-driving-range",
  "우리몸에서 함부로 뜯으면 안되는 것들 콧털 머리딱지 입술각질": "body-parts-never-pick",
  "불법인지 한국에서 의외로 우리가 모르는 것들 카지노 우버 누드비치": "surprising-korean-laws",
  "에어컨 전기세 적게 나오는 방법 절약 꿀팁": "air-conditioner-energy-saving",
  "습기 제거 여름철 우리집 습기 제거 하는 방법 장마철 곰팡이 제거 꿀팁": "home-humidity-control",
  "항문 소양증 원인과 예방 치료방법 간질간질 참지 못할 가려움": "anal-itching-causes",
  "복근 운동 초보자도 할 수 있는 식스팩 만들기": "beginner-abs-workout",
  "치아를 누렇게 만드는 음식들 누렁니 예방": "teeth-staining-foods",
  "음식물쓰레기 냄새 줄이는 방법 음쓰 냄새 없애는 살림고수": "food-waste-odor-control",
  "얼려 먹으면 의외로 영양가 좋은 음식 이냉치냉": "foods-better-frozen",
  "흰 운동화 하얗게 만드는 방법 버릴 때까지 새 신발처럼 신는 방법": "whiten-white-sneakers",
  "전자레인지 올바른 활용법 우리가 몰랐던 사실 식기 살균 세척": "microwave-proper-use",
  "바세린으로 블랙헤드 제거 하는 효과적인 방법 바세린 활용법": "vaseline-blackhead-removal",
  "냉동 보관 하면 절대 안되는 우리가 몰랐던 음식들 얼리면 안되는 음식": "foods-never-freeze",
  "아침 공복에 먹으면 안되는 나쁜 음식 우리가 몰랐던 사실": "foods-to-avoid-empty-stomach",
  "과일별 싱싱하게 보관하는 법 꿀팁 랩에 싼 수박 세균 득실": "fruit-storage-tips",
  "샤워는 언제 하는 것이 좋을까 잘못된 샤워습관 샤워하는법 샤워꿀팁": "best-time-to-shower",
  "뼈 튼튼 뼈 건강에 의외로 좋은 음식 통뼈": "bone-health-foods-list",
  "오이물 다이어트 오이 우려낸 물을  마시면 일어나는 놀라운 디톡스 효과": "cucumber-water-detox",
  "베이킹소다를 직접 먹으면 일어나는 놀라운 몸의 변화 효능 효과": "eating-baking-soda-effects",
  "유통기한 지난 식품 활용법 생활 꿀팁 녹 제거할 땐 케첩": "expired-food-uses",
  "불면증 개선 잘자는 법 잠 못이룰 때 꿀잠 자는 팁": "insomnia-sleep-tips",
  "남자정력 좋게 해주는 천연정력제 및 불끈불끈 정력 좋게 해주는 꿀팁": "natural-male-vitality",
  "김빠진 콜라 활용법 의외로 유용한 꿀팁 버리지 말고 쓰세요": "flat-coke-uses",
  "생활 가전 수명 단축시키는 우리가 모르는 치명적인 실수": "appliance-lifespan-mistakes",
  "칫솔 재사용 하는 꿀팁 다 쓴 칫솔 그냥 버리지 말기": "old-toothbrush-uses",
  "유통기한 지난 식용유 재활용 하는 방법 폐식용유 사용법 꿀팁": "used-cooking-oil-reuse",
  "커피 대신 졸음 깨기 위해 아침에 마시면 좋은 차 피로회복": "morning-tea-instead-coffee",
  "기력회복에 좋은 여름철 보양식 무기력한 일상 스테미나": "summer-stamina-foods",
  "건조한 피부 10분만에 촉촉한 꿀 피부로 만들어 버리기 꿀팁공개": "dry-skin-quick-fix",
  "숙취해소 음료 보다 술 빨리 깨는 법": "sober-up-fast",
  "혈전을 예방해 주는 음식 혈액뭉침": "blood-clot-prevention-foods",
  "유통기한 넘기면 절대 먹으면 안되는 식품들": "never-eat-past-expiry",
  "니코틴 해독에 좋은 음식 흡연이 우리건강에 미치는 영향 금연지침": "nicotine-detox-foods",
  "알로에의 효능과 먹는 방법 영양성분 및 부작용 주의사항 보관 꿀팁": "aloe-vera-benefits",
  "파슬리의 효능과 부작용 먹는 법 꿀팁 정리": "parsley-benefits-side-effects",
  "숙취해소법 숙취 울렁거림 두통": "hangover-relief-methods",
  "뱃살 빼기 좋은 최고의 운동 효율적인 방법 꿀팁": "best-belly-fat-workout",
  "생리통 심할 때 피해야 하는 음식 그 원인과 통증 완화하는 꿀팁": "period-cramps-foods-avoid",
  "자취방을 구할 때 꼭 체크해야 할  A to Z 꿀팁 총정리": "studio-apartment-checklist",
  "비누 활용법 살림고수가 알려주는 짜투리 비누 꿀템 만드는 법": "soap-scrap-reuse",
  "옷에 묻은 잉크 지우는 법 얼룩 볼펜자국 제거 꿀팁": "ink-stain-removal",
  "우리가 몰랐던 냉동실 얼음 활용법 의외의 꿀팁": "freezer-ice-cube-uses",
  "꿀물의 효능 숙취해소에 좋은 꿀물 타는 방법 장단점": "honey-water-benefits",
  "임신초기 입덧의 모든 것 원인과 증상 극복하는 방법 A to Z": "morning-sickness-guide",
  "수면을 방해하는 맛있는 음식들 깊은잠 꿀잠": "foods-that-disrupt-sleep",
  "겨드랑이 땀 억제하는 방법 악취 불청객 냄새 안나게 하는 법": "underarm-sweat-control",
  "코털을 뽑으면 위험한 이유 사망 패혈증 치사율50": "nose-hair-plucking-danger",
  "코에서 냄새가 나는 이유 콧속냄새 비염 축농증": "nose-odor-causes",
  "눈 시력 좋아지게 하는 법 시력검사 굴절이상 안구노화": "improve-eyesight-naturally",
  "수건 냄새 없애는 법 쉰 냄새 악취 썩은내": "towel-smell-removal",
  "딸꾹질 원인과 멈추기 힘든 딸국질 멈추는 방법": "how-to-stop-hiccups",
  "눈 밑이 떨리는 이유와 증상 해결 방안 마그네슘 눈밑떨림": "eye-twitching-magnesium",
  "먹으면 체온을 올려주어 몸을 따뜻하게 만들어 주는 음식": "body-warming-foods",
  "재활용 쓰레기 헷갈리는 쓰레기 분리배출 방법 분리수거 팁": "recycling-sorting-guide",
  "전자레인지에 넣으면 큰일나는 음식 절대 돌리면 안되는 것들": "never-microwave-foods",
  "몸에 나쁠 것 같지만 의외로 좋은 음식 베이컨 케첩": "surprisingly-healthy-foods",
  "목에 가시가 걸렸을 때 대처법 가시 빼는 법 생선가시": "fish-bone-stuck-throat",
  "손가락 붓는 원인 손가락 부었을 때 붓기 빼는 방법": "swollen-fingers-causes",
  "껌 삼키면 안되는 이유 껌 삼켰을 때 대처법": "swallowed-gum-risks",
  "남성용 피임약 원리": "male-birth-control-pill",
  "고양이 밥먹을 때 머리 흔드는 이유 구내염 고양이 수염": "cat-head-shaking-eating",
  "고양이가 행복하고 신날때 보이는 행동 고양이 박치기": "cat-happy-behaviors",
  "고양이 눈 색상으로 알아보는 성격유형 오드아이 블루 그린": "cat-eye-color-personality",
  "고양이가 하품을 하는 이유 지루함 기분전환 구강불편 스트레스": "cat-yawning-reasons",
  "고양이 털 색깔별 성격 유형 턱시도 카오스 황금고양이": "cat-fur-color-personality",
  "고양이 반드시 병원에 가야 하는 증상 무기력 호흡곤란 표피낭종 피지낭종": "cat-emergency-symptoms",
  "고양이 설사 원인과 진단 복부팽만": "cat-diarrhea-causes",
  "개와 고양이 차이점 같지만 다른 습성 관계 길들이기 바디랭귀지": "cat-vs-dog-differences",
  "고양이 싸움 이유 영역싸움 서열싸움 말리면 안될까": "cat-fighting-reasons",
  "고양이가 화났을 때 집사에게 하는 행동 고양이 삐짐": "cat-angry-signs",
  "고양이를 반려동물로 키우기 정말 좋은 이유 배변훈련 독립적 성향": "cat-as-a-pet-benefits",
  "고양이 꼬리로 표현하는 언어 종류 물음표 꼬리 부풀린 꼬리": "cat-tail-language",
  "고양이가 집사가 있는 이불속에 들어오는 이유 나는 집사가 좋아": "cat-sleeping-under-blanket",
  "발정난 고양이 진정 시키는 방법 중성화 수술": "cat-in-heat-calming",
  "고양이 색깔 무늬로 알아보는 집사의 성격 및 특징": "cat-owner-personality-test",
  "고양이가 할퀴었을 때 치료하는 방법 세균감염 치료법": "cat-scratch-treatment",
  "고양이가 물고 할 퀼 때 대처하는 법 고양이 이빨 대응방법": "cat-biting-how-to-stop",
  "남자 사타구니 가려움증 원인과 치료방법 피부질환 습진 고환": "male-groin-itching",
  "고양이 잠자는 자세로 알아보는 고양이의 심리상태 고멘네코": "cat-sleeping-positions",
  "고양이가 절대로 먹으면 안되는 음식 카페인 생고기 뼈 초콜릿": "cat-toxic-foods",
  "고양이 평균 수명 및 오래 사는 장수 고양이 품종 메인쿤": "cat-lifespan-longest-breeds",
  "고양이 별자리로 알아보는 성격 성향 테스트": "cat-zodiac-personality",
  "고양이 귀 청소할 때 주의사항 및 방법 귀 청소약 염증형태": "cat-ear-cleaning",
};

// \ud55c\uae00 \u2192 \ub85c\ub9c8\uc790 \uc74c\ucc28(\ub9e4\ud551\uc5d0 \uc5c6\ub294 \uc81c\ubaa9\uc6a9).
// \ud45c\uae30\ubc95 \uc644\ubcbd\uc131\uc774 \uc544\ub2c8\ub77c URL \uc548\uc804\uc131\uc774 \ubaa9\uc801.
const CHO = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const JUNG = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
const JONG = ["","k","k","k","n","n","n","t","l","k","m","l","l","l","m","l","l","t","m","p","t","t","ng","t","t","k","t","p","h"];

function romanize(s) {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const i = c - 0xac00;
      out += CHO[Math.floor(i / 588)] + JUNG[Math.floor((i % 588) / 28)] + JONG[i % 28];
    } else if (/[a-zA-Z0-9]/.test(ch)) out += ch.toLowerCase();
    else out += " ";
  }
  return out;
}

function slugify(title) {
  const clean = title
    .replace(/\(.*?\)/g, "")
    .replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, "")
    .trim();
  if (SLUG_MAP[clean]) return SLUG_MAP[clean];
  return romanize(clean).trim().replace(/\s+/g, "-").slice(0, 50).replace(/-+$/, "");
}


function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ── 본문 구조화 ───────────────────────────────────────────
   원고는 두 가지 형식이 섞여 있다(2026-08-06 실측):
     A형: "1. 피부에 묻은 염색약을 빨리 씻어낸다"   ← 번호 + 제목
     B형: "오늘부터 탄수화물 골라먹기"               ← 번호 없는 짧은 제목 줄
   둘 다 <h2>로 승격한다. B형을 놓치면 2천자 글이 문단 덩어리로만 나와서
   읽기도 어렵고 검색엔진이 목차를 못 읽는다(1차 시도에서 10편 중 6편이 이랬다).
   🔴 문장 자체는 절대 손대지 않는다 — 구조만 입힌다. */
function structure(raw) {
  const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const html = [];
  const toc = [];
  let n = 0;

  for (const b of blocks) {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    const first = lines[0] || "";

    // A형: 번호로 시작
    const numbered = first.match(/^(\d+)[.)]\s*(.+)$/);
    // B형: 짧고(35자 이내) 문장부호로 끝나지 않는 줄 = 제목처럼 쓰인 줄.
    //      뒤에 본문이 더 있어야 제목으로 인정한다(끝맺음 문장 오인 방지).
    const headingLike =
      !numbered &&
      first.length <= 35 &&
      lines.length > 1 &&
      !/[.!?]$/.test(first) &&
      !/^(그래서|하지만|이렇게|그리고|또한|즉|참고|이상)/.test(first);

    if (numbered && numbered[2].length < 60) {
      n++;
      const head = numbered[2].trim();
      const id = `s${n}`;
      toc.push({ id, head });
      html.push(`<h2 id="${id}"><span class="num">${n}</span>${esc(head)}</h2>`);
      const rest = lines.slice(1).join("\n");
      if (rest.trim()) html.push(`<p>${esc(rest.trim()).replace(/\n/g, "<br>")}</p>`);
    } else if (headingLike) {
      n++;
      const id = `s${n}`;
      toc.push({ id, head: first });
      html.push(`<h2 id="${id}"><span class="num">${n}</span>${esc(first)}</h2>`);
      const rest = lines.slice(1).join("\n");
      if (rest.trim()) html.push(`<p>${esc(rest.trim()).replace(/\n/g, "<br>")}</p>`);
    } else {
      html.push(`<p>${esc(b).replace(/\n/g, "<br>")}</p>`);
    }
  }
  return { body: html.join("\n"), toc };
}

/* ── 요약(메타 description) ────────────────────────────────
   첫 문단에서 뽑는다. 지어내지 않는다 — 원문에 있는 말만 쓴다. */
function summarize(raw, max = 155) {
  const first = raw.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  return first.length <= max ? first : first.slice(0, max - 1) + "…";
}

/* ── 페이지 템플릿 ─────────────────────────────────────────
   기존 계산기 페이지(height-predictor)의 head 구성을 그대로 따른다:
   애드센스·GA4·SEO 메타·favicon·RSS·Pretendard. 결이 갈리면 안 된다. */
function page({ title, desc, slug, bodyHtml, toc, dateISO }) {
  const url = `${SITE}/guide/${slug}/`;
  const tocHtml = toc.length >= 3
    ? `<nav class="toc"><p class="toc-t">이 글의 순서</p><ol>${
        toc.map((t) => `<li><a href="#${t.id}">${esc(t.head)}</a></li>`).join("")
      }</ol></nav>`
    : "";

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | beautypang</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow">
<meta name="google-site-verification" content="2xVj59QMIgWGp8je6lsptzWQYhHyDG_aVc05mWOp--4" />
<meta name="naver-site-verification" content="74fef3d418a1e812489238486ef027fdf967907b" />
<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="beautypang.tools">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="ko_KR">
<meta property="og:image" content="${SITE}/guide/${slug}/hero.svg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/guide/${slug}/hero.svg">

<meta name="theme-color" content="#EA580C">
<meta name="author" content="beautypang.tools">

<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate" type="application/rss+xml" title="beautypang.tools RSS" href="/rss.xml">

<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5126709833280837" crossorigin="anonymous"></script>
<script src="/assets/sister-sites.js?v=1" defer></script>
<script src="/assets/nav.js?v=4" defer></script>

<!-- Google Analytics (GA4) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-F76TTBSP9F"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-F76TTBSP9F');
</script>

<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description: desc,
  datePublished: dateISO,
  dateModified: dateISO,
  author: { "@type": "Organization", name: "beautypang" },
  publisher: { "@type": "Organization", name: "beautypang", url: SITE },
  image: `${SITE}/guide/${slug}/hero.svg`,
  mainEntityOfPage: url,
}, null, 2)}
</script>

<!-- 🔴 guide.css 를 쓰지 않는다: 계산기 17개가 공유하는 파일이라 손대면 전멸한다.
     가이드 전용 스타일은 여기 인라인으로만 둔다. -->
<style>
:root{--ac:#EA580C;--ac-d:#C2410C;--ac-s:#FFEDD5;--ink:#1f2937;--mut:#6b7280;--line:#e5e7eb;--bg:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;line-height:1.85;word-break:keep-all;-webkit-text-size-adjust:100%}
.wrap{max-width:760px;margin:0 auto;padding:28px 20px 72px}
.crumb{font-size:13px;color:var(--mut);margin-bottom:14px}
/* 🔴 히로는 「배너」다. 원본이 1200x630(OG 비율)이라 그대로 두면 화면 절반을 먹고
   본문이 밀린다(2026-08-06 화면 확인). 높이를 잘라 띠처럼 보이게 한다. */
.hero{display:block;width:100%;height:170px;object-fit:cover;object-position:left center;border-radius:14px;margin:0 0 20px;background:#f3f4f6}
@media(max-width:640px){.hero{height:132px}}
.crumb a{color:var(--mut);text-decoration:none}
.crumb a:hover{color:var(--ac)}
h1{font-size:29px;line-height:1.35;letter-spacing:-.02em;margin:0 0 12px}
.meta{font-size:13px;color:var(--mut);padding-bottom:20px;border-bottom:1px solid var(--line);margin-bottom:26px}
.toc{background:#fafafa;border:1px solid var(--line);border-left:3px solid var(--ac);border-radius:10px;padding:16px 20px;margin:0 0 30px}
.toc-t{margin:0 0 8px;font-size:13px;font-weight:800;color:var(--ac-d);letter-spacing:.02em}
.toc ol{margin:0;padding-left:20px}
.toc li{font-size:14.5px;padding:3px 0}
.toc a{color:var(--ink);text-decoration:none}
.toc a:hover{color:var(--ac);text-decoration:underline}
h2{font-size:20px;line-height:1.45;margin:38px 0 12px;padding-top:4px;display:flex;align-items:flex-start;gap:10px}
h2 .num{flex:none;display:inline-flex;align-items:center;justify-content:center;width:27px;height:27px;border-radius:8px;background:var(--ac-s);color:var(--ac-d);font-size:14px;font-weight:800;margin-top:2px}
p{font-size:16.5px;margin:0 0 18px;color:#374151}
.foot{margin-top:52px;padding-top:22px;border-top:1px solid var(--line);font-size:13.5px;color:var(--mut)}
.foot a{color:var(--ac-d)}
.more{margin-top:34px;padding:18px 20px;background:#fafafa;border:1px solid var(--line);border-radius:12px}
.more p{font-size:13px;font-weight:800;color:var(--ac-d);margin:0 0 10px}
.more ul{margin:0;padding-left:18px}
.more li{font-size:14.5px;padding:3px 0}
.more a{color:var(--ink);text-decoration:none}
.more a:hover{color:var(--ac);text-decoration:underline}
@media(max-width:640px){.wrap{padding:20px 16px 56px}h1{font-size:24px}h2{font-size:18px}p{font-size:16px}}
@media(prefers-color-scheme:dark){
:root{--ink:#e5e7eb;--mut:#9ca3af;--line:#374151;--bg:#111827;--ac-s:#7c2d12}
p{color:#d1d5db}.toc,.more{background:#1f2937}
}
</style>
</head>
<body>
<div class="wrap">
  <div class="crumb"><a href="/">beautypang</a> › <a href="/guide/">건강·뷰티 가이드</a></div>
  <img class="hero" src="hero.svg" alt="${esc(title)}" width="1200" height="630" loading="eager">
  <h1>${esc(title)}</h1>
  <div class="meta">건강·뷰티 가이드 · beautypang</div>
  ${tocHtml}
  ${bodyHtml}
  <div class="more">
    <p>함께 보면 좋은 계산기</p>
    <ul>
      <li><a href="/bmi-calculator/">BMI 계산기 — 내 체중은 적정한가</a></li>
      <li><a href="/body-composition/">체성분 계산기 — 체지방률·근육량</a></li>
      <li><a href="/calorie-calculator/">칼로리 계산기 — 하루 필요 열량</a></li>
    </ul>
  </div>
  <div class="foot">
    이 글은 일반적인 정보 제공을 목적으로 합니다. 증상이 있거나 지속되면 전문가와 상담하세요.<br>
    <a href="/guide/">← 다른 가이드 보기</a>
  </div>
</div>
</body>
</html>`;
}

/* ── 목록 페이지 ───────────────────────────────────────────── */
function indexPage(items) {
  const li = items.map((it) =>
    `<li><a href="/guide/${it.slug}/"><span class="th">${thumbSvg(it.title)}</span><span class="tx"><b>${esc(it.title)}</b><span>${esc(it.desc.slice(0, 70))}…</span></span></a></li>`
  ).join("\n");

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>건강·뷰티 가이드 — 직접 해보고 쓴 생활 정보 | beautypang</title>
<meta name="description" content="염색약 지우는 법부터 식습관·운동·화장품 사용법까지, 직접 해보고 정리한 건강·뷰티 생활 가이드 ${items.length}편.">
<meta name="robots" content="index,follow">
<meta name="google-site-verification" content="2xVj59QMIgWGp8je6lsptzWQYhHyDG_aVc05mWOp--4" />
<meta name="naver-site-verification" content="74fef3d418a1e812489238486ef027fdf967907b" />
<link rel="canonical" href="${SITE}/guide/">
<meta property="og:type" content="website">
<meta property="og:title" content="건강·뷰티 가이드 | beautypang">
<meta property="og:description" content="직접 해보고 정리한 건강·뷰티 생활 가이드 ${items.length}편.">
<meta property="og:url" content="${SITE}/guide/">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="theme-color" content="#EA580C">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5126709833280837" crossorigin="anonymous"></script>
<script src="/assets/sister-sites.js?v=1" defer></script>
<script src="/assets/nav.js?v=4" defer></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-F76TTBSP9F"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-F76TTBSP9F');</script>
<style>
:root{--ac:#EA580C;--ac-d:#C2410C;--ink:#1f2937;--mut:#6b7280;--line:#e5e7eb;--bg:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Pretendard,'Apple SD Gothic Neo',sans-serif;line-height:1.7;word-break:keep-all}
.wrap{max-width:760px;margin:0 auto;padding:32px 20px 72px}
h1{font-size:30px;letter-spacing:-.02em;margin:0 0 10px}
.sub{color:var(--mut);font-size:15px;margin:0 0 30px}
ul{list-style:none;padding:0;margin:0}
li{border-bottom:1px solid var(--line)}
li a{display:flex;gap:15px;align-items:flex-start;padding:18px 4px;text-decoration:none;color:inherit}
.th{flex:none;line-height:0}
.th svg{width:56px;height:56px;border-radius:13px}
.tx{flex:1;min-width:0}
li a:hover{background:#fafafa}
li b{display:block;font-size:17.5px;margin-bottom:5px;letter-spacing:-.01em}
li a:hover b{color:var(--ac-d)}
li span{font-size:14px;color:var(--mut);line-height:1.6}
@media(max-width:640px){.wrap{padding:24px 16px 56px}h1{font-size:25px}}
@media(prefers-color-scheme:dark){:root{--ink:#e5e7eb;--mut:#9ca3af;--line:#374151;--bg:#111827}li a:hover{background:#1f2937}}
</style>
</head>
<body>
<div class="wrap">
  <h1>건강·뷰티 가이드</h1>
  <p class="sub">직접 해보고 정리한 생활 정보 ${items.length}편입니다.</p>
  <ul>
${li}
  </ul>
</div>
</body>
</html>`;
}

/* ── 실행 ──────────────────────────────────────────────────── */
const files = walk(SRC).sort();
console.log(`원고 총 ${files.length}편 발견 · 이번 처리 ${Math.min(LIMIT, files.length)}편`);

const items = [];
const seen = new Set();

for (const f of files) {
  if (items.length >= LIMIT) break;
  const raw = fs.readFileSync(f, "utf-8").replace(/\r\n/g, "\n").trim();
  if (raw.length < 400) { console.log(`  건너뜀(너무 짧음): ${path.basename(f)}`); continue; }

  // 🆕 10/5 — 싣지 않을 원고(파일 이름 일부). 건강기능식품 제품 광고 글은 질병·효능 표현(«만성피로 개선»·«효과 검증»)이
  //   건강기능식품법 광고 기준·애드센스 정책에 걸릴 수 있어 사이트 가이드로 내보내지 않는다.
  const EXCLUDE = ["935 에클로니아"];
  if (EXCLUDE.some(x => path.basename(f).includes(x))) { console.log(`  건너뜀(제품 광고 원고): ${path.basename(f)}`); continue; }

  const title = path.basename(f, ".txt").replace(/\(feat\..*?\)/gi, "").trim();
  const slug = slugify(title);
  if (!slug || seen.has(slug)) { console.log(`  건너뜀(중복/빈 슬러그): ${title}`); continue; }
  seen.add(slug);

  // --new 면 이미 라이브인 글은 넘긴다(같은 글을 계속 다시 만들지 않게)
  if (ONLY_NEW && fs.existsSync(path.join(OUT, slug, "index.html"))) continue;

  const desc = summarize(raw);
  const { body, toc } = structure(raw);
  const dateISO = new Date(fs.statSync(f).mtime).toISOString().slice(0, 10);

  // 🆕 2026-10-05 — 원고 파일 이름이 «1. 커피 마실 때…txt»처럼 번호로 시작하면 그대로 제목·검색 결과에 «1.»이 붙었다.
  //   주소(slug)는 위에서 원래 이름으로 만든다(영문 슬러그 표가 원래 이름 기준) → 보이는 제목에서만 번호를 뗀다.
  const shown = title.replace(/^\s*\d+\s*[.)]\s*/, "");
  const html = page({ title: shown, desc, slug, bodyHtml: body, toc, dateISO });
  items.push({ title: shown, slug, desc });

  if (!DRY) {
    const dir = path.join(OUT, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
    // 🎨 대표 이미지 — 저작권 걱정 없는 코드 생성 SVG. OG 썸네일 겸 본문 히로.
    fs.writeFileSync(path.join(dir, "hero.svg"), heroSvg(title), "utf-8");
  }
  // 🆕 10/5 — 끝에 «원고:» 상대 경로를 붙인다(발행국 [보기]가 이걸로 원고를 연다 · 앞부분 형식은 그대로라 기존 파싱 안 깨짐)
  console.log(`  ✓ /guide/${slug}/  (${toc.length}개 소제목, ${raw.length}자)  원고: ${path.relative(SRC, f).replace(/\\/g, "/")}`);
}

if (!DRY) {
  fs.mkdirSync(OUT, { recursive: true });
  /* 🔴 2026-08-25 수정 — 목록에서 옛 글이 사라지던 버그.
     사고: indexPage(items) 의 items 는 «이번 실행에서 만든 것»뿐이다.
           --new 로 5편만 만들면 목록에 그 5편만 남고, 이미 올라가 있던 10편이
           목록에서 통째로 빠졌다(글 자체는 200으로 살아 있는데 링크가 끊긴다).
           ⇒ 사람이 찾아갈 길이 없어지고 내부링크도 끊겨 SEO에 직접 손해.
     ⇒ 목록은 «이번 결과»가 아니라 **guide/ 폴더 전체**를 훑어서 만든다. */
  const allItems = [];
  for (const d of fs.readdirSync(OUT)) {
    const f = path.join(OUT, d, "index.html");
    if (d === "index.html" || !fs.existsSync(f)) continue;
    const fresh = items.find((x) => x.slug === d);
    if (fresh) { allItems.push(fresh); continue; }
    // 이미 있던 글은 파일에서 제목·설명을 되읽는다
    const html = fs.readFileSync(f, "utf-8");
    const t = html.match(/<title>([^<]*?)\s*\|/);
    const de = html.match(/name="description" content="([^"]*)"/);
    allItems.push({
      title: t ? t[1].trim() : d,
      slug: d,
      desc: de ? de[1] : "",
    });
  }
  /* 🆕 10/5 — 목록을 «새 글이 위»로(싸초). 폴더 순서(알파벳)라 새 글이 사이사이에 묻혔다.
     «언제 올렸나» = sitemap.xml 의 <lastmod> — 이 빌더가 글을 처음 올릴 때 그날 날짜를 넣고 다시는 안 건드린다(아래 sitemap 블록).
     이번 실행에서 만든 글은 아직 sitemap 에 없으니 오늘로 본다. 같은 날짜면 페이지 파일이 늦게 만들어진 쪽이 위. */
  const firstSeen = {};
  try {
    const smTxt = fs.readFileSync(path.resolve(process.cwd(), "sitemap.xml"), "utf-8");
    for (const m of smTxt.matchAll(/<loc>[^<]*\/guide\/([a-z0-9-]+)\/<\/loc>\s*<lastmod>([\d-]+)<\/lastmod>/g)) firstSeen[m[1]] = m[2];
  } catch (_) {}
  const todayISO = new Date().toISOString().slice(0, 10);
  const mtime = (s) => { try { return fs.statSync(path.join(OUT, s, "index.html")).mtimeMs; } catch (_) { return 0; } };
  allItems.sort((a, b) =>
    (firstSeen[b.slug] || todayISO).localeCompare(firstSeen[a.slug] || todayISO) || mtime(b.slug) - mtime(a.slug));
  fs.writeFileSync(path.join(OUT, "index.html"), indexPage(allItems), "utf-8");
  console.log(`  목록 페이지: 전체 ${allItems.length}편 반영`);
}
console.log(`\n${DRY ? "[DRY] " : ""}완료: ${items.length}편 + 목록 페이지`);

/* ── sitemap.xml 갱신 ───────────────────────────────────────
   🔴 sitemap 에 없으면 구글이 새 글을 못 찾는다. 수동 관리는 반드시 빠뜨리므로
   빌드가 끝날 때마다 자동으로 넣는다(멱등 — 이미 있는 URL은 건드리지 않는다). */
if (!DRY) {
  const smPath = path.resolve(process.cwd(), "sitemap.xml");
  let sm = fs.readFileSync(smPath, "utf-8");
  const today = new Date().toISOString().slice(0, 10);

  const urls = [`${SITE}/guide/`, ...items.map((it) => `${SITE}/guide/${it.slug}/`)];
  let added = 0;
  const blocks = [];
  for (const u of urls) {
    if (sm.includes(`<loc>${u}</loc>`)) continue;   // 이미 있으면 건너뜀
    const pri = u.endsWith("/guide/") ? "0.9" : "0.8";
    blocks.push(`  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${pri}</priority>\n  </url>`);
    added++;
  }
  if (added) {
    sm = sm.replace("</urlset>", blocks.join("\n") + "\n</urlset>");
    fs.writeFileSync(smPath, sm, "utf-8");
  }
  console.log(`sitemap.xml: ${added}개 URL 추가 (총 ${(sm.match(/<loc>/g) || []).length}개)`);
}
