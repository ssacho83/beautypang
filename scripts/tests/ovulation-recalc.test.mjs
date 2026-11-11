// 배란일 계산기 «다시 계산» 시험 — node scripts/tests/ovulation-recalc.test.mjs
// 2026-11-11 고장(하자보수 2차 I-1): 달력을 `calBody.outerHTML = …`로 그려서 첫 계산 때 #calBody가 문서에서 떨어져 나갔다.
//   → 값을 바꿔 다시 계산하면 위쪽 결과는 바뀌는데 «다음 6개월 캘린더»는 첫 계산 그대로(오류도 안 남 — 부모 없는 요소의 outerHTML 대입은 조용히 무시된다).
// 이 시험은 페이지의 계산 스크립트를 그대로 꺼내, 그 성질(부모가 없으면 outerHTML 대입 무시)만 흉내 낸 작은 문서에서 두 번 계산해 본다.
// 진짜 화면 확인은 따로 한다(브라우저에서 값 바꿔 두 번) — 이 시험은 «같은 고장이 돌아오는가»를 본다.
//   못 보는 것: CSS(예: `order`로 칸 자리를 바꾸는 것) · 글꼴·줄바꿈 → 브라우저 확인 몫.
// 자리: /scripts/* 는 _redirects가 막아 공개되지 않는다(루트가 그대로 배포되는 저장소).
// 2026-11-12 2차 확인에서 메운 빈틈: ①가임 기간 시작·끝 ②줄의 네 칸 전체(개수·자리·값) ③화면에 없는 요소를 가짜 문서가 만들어 줘 헛통과
//   ④#calBody가 달력 «안»인지(등장 순서 말고 포함) ⑤클래스에 낱말이 하나 더 붙어도 헛경보가 안 나게 낱말 단위로 읽기
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = process.argv[2] || path.join(here, "..", "..");
let fail = 0;
const ok = (c, m) => { console.log((c ? "O " : "X ") + m); if (!c) fail++; };

const html = fs.readFileSync(path.join(root, "ovulation-calculator", "index.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => s.includes("getElementById('calc')"));
ok(scripts.length === 1, "계산 스크립트를 한 덩이 찾음");

// 화면에 진짜 있는 id — 가짜 문서는 여기 있는 것만 돌려준다(없는 id는 브라우저처럼 null)
const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
{
  const asked = [...new Set([...(scripts[0] || "").matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]))];
  const missing = asked.filter((id) => !htmlIds.has(id));
  ok(asked.length > 0 && missing.length === 0, `스크립트가 찾는 요소 ${asked.length}개가 화면에 다 있다${missing.length ? " — 없음: " + missing.join(", ") : ""}`);
}

// <div id="…"> 요소의 안쪽 범위를 div 깊이로 찾는다(등장 순서가 아니라 «포함»을 보려고)
function divRange(id) {
  const open = new RegExp(`<div\\b[^>]*\\bid="${id}"[^>]*>`).exec(html);
  if (!open) return null;
  const re = /<div\b[^>]*>|<\/div>/g;
  re.lastIndex = open.index + open[0].length;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return [open.index, m.index];
  }
  return null;
}
{
  const cal = divRange("calendar");
  const bodyAt = html.indexOf('id="calBody"');
  const headAt = html.search(/<div class="cal-row head">/);
  ok((html.match(/id="calBody"/g) || []).length === 1 && !!cal && bodyAt > cal[0] && bodyAt < cal[1], "화면에 #calBody가 하나 있고 달력(#calendar) 요소 안에 들어 있다");
  ok(!!cal && headAt > cal[0] && headAt < bodyAt, "달력 머리말 줄이 달력 안, #calBody 바로 앞쪽에 있다");
}

// 기대값은 화면 코드와 따로 계산한다: n회차 생리 = 마지막 생리 + 주기×n · 배란 = 그 14일 전 · 가임 = 배란 5일 전 ~ 1일 뒤
const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
const expectRows = (lmp, cycle) => Array.from({ length: 6 }, (_, i) => {
  const [y, mo, da] = lmp.split("-").map(Number);
  const at = (plus) => ymd(new Date(y, mo - 1, da + cycle * (i + 1) + plus));
  return { n: `${i + 1}회차`, o: at(-14), m: at(0), fs: at(-19), fe: at(-13) };
});
// 보이는 달력 줄을 칸 단위로 읽는다 — 칸마다 [클래스 낱말들, 글자]
const readRows = (shownHtml) => [...String(shownHtml || "").matchAll(/<div class="([^"]*)"[^>]*>([\s\S]*?)<\/div>/g)]
  .filter((r) => r[1].split(/\s+/).includes("cal-row") && !r[1].split(/\s+/).includes("head"))
  .map((r) => [...r[2].matchAll(/<span class="([^"]*)"[^>]*>([^<]*)<\/span>/g)].map((c) => ({ cls: c[1].trim().split(/\s+/), text: c[2].replace(/\s+/g, " ").trim() })));
const ORDER = ["month", "ovulation", "menses", "fertile"];
const shapeOk = (rows) => rows.length === 6 && rows.every((cells) => cells.length === 4 && cells.every((c, i) => c.cls.includes(ORDER[i])));
const cell = (cells, name) => (cells.find((c) => c.cls.includes(name)) || { text: "" }).text;
const fertileEnds = (cells) => cell(cells, "fertile").split("~").map((s) => s.trim());

// ── 작은 문서: 화면에 «보이는» 달력 = #calBody가 붙어 있으면 그 안, 떨어졌으면 그 자리에 대신 들어간 것
function makeDoc() {
  const page = { replaced: null };
  const els = {};
  const el = (id) => {
    if (!htmlIds.has(id)) return null; // 브라우저와 같게 — 화면에 없는 요소는 없다
    if (els[id]) return els[id];
    const e = {
      id, value: "", hidden: false, textContent: "", attached: true, _inner: "", _style: "padding: 24px",
      listeners: {},
      classList: { list: new Set(), add(c) { this.list.add(c); } },
      addEventListener(type, fn) { (e.listeners[type] ||= []).push(fn); },
      focus() {}, scrollIntoView() {},
      removeAttribute(n) { if (n === "style") e._style = ""; },
      get innerHTML() { return e._inner; },
      set innerHTML(v) { e._inner = String(v); },
      get outerHTML() { return `<div id="${id}">${e._inner}</div>`; },
      // DOM 규격: 부모가 없으면 아무 일도 하지 않는다(오류도 없음)
      set outerHTML(v) { if (!e.attached) return; page.replaced = String(v); e.attached = false; },
    };
    return (els[id] = e);
  };
  const document = { getElementById: (id) => el(id) };
  const shown = () => (els.calBody ? (els.calBody.attached ? els.calBody._inner : page.replaced) : "") || "";
  return { document, els, shown };
}

if (scripts.length === 1) {
  const { document, els, shown } = makeDoc();
  let crashed = "";
  try { new Function("document", scripts[0])(document); } catch (e) { crashed = "처음 실행: " + e.message; }
  const submit = (lmp, cycle) => {
    try {
      document.getElementById("lmp").value = lmp;
      document.getElementById("cycle").value = String(cycle);
      for (const fn of els.calc.listeners.submit || []) fn({ preventDefault() {} });
    } catch (e) { crashed ||= `계산(${lmp} · ${cycle}일): ` + e.message; }
  };
  const text = (id) => (document.getElementById(id) || { textContent: "" }).textContent;

  submit("2026-11-01", 28);
  ok(shown().includes("2026.11.29") && readRows(shown()).length === 6, "첫 계산: 달력 6줄 · 1회차 생리 예정 2026.11.29(11/1 + 28일)");
  ok(text("resDate").startsWith("11월 15일"), "첫 계산: 예상 배란일 11월 15일(11/1 + 28 − 14)");

  submit("2026-12-10", 30);
  ok(text("resDate").startsWith("12월 26일"), "다시 계산: 위쪽 결과가 새 값(12/10 + 30 − 14 = 12월 26일)");
  ok(shown().includes("2027.01.09") && !shown().includes("2026.11.29"), "다시 계산: 달력도 새 값(1회차 2027.01.09) — 첫 계산 줄이 남아 있지 않다");
  ok(readRows(shown()).length === 6, "다시 계산: 달력은 여전히 6줄(줄이 쌓이지 않는다)");

  submit("2026-12-10", 21);
  ok(shown().includes("2026.12.31") && !shown().includes("2027.01.09"), "세 번째(주기만 21일로): 달력 1회차 2026.12.31");
  ok(!!els.calBody && els.calBody.attached, "#calBody가 문서에 그대로 붙어 있다(자기 요소를 갈아 끼우지 않는다)");
  ok(!!els.calBody && els.calBody._style === "", "처음 안내 글용 여백·가운데 정렬을 걷었다(달력 줄이 안내 글 모양으로 나오지 않는다)");

  // 줄 전부·칸 전부를 본다 — 앞 한 줄만 새 값이거나, 줄이 더 붙거나, 칸이 끼어들거나 뒤바뀌어도 잡는다(11/12 Codex 지적 두 번)
  for (const [lmp, cycle] of [["2026-11-01", 28], ["2026-12-10", 30], ["2027-12-20", 35], ["2028-02-01", 21]]) {
    submit(lmp, cycle);
    const rows = readRows(shown());
    const want = expectRows(lmp, cycle);
    const shaped = shapeOk(rows);
    ok(shaped, `${lmp} · ${cycle}일: 달력 6줄 · 줄마다 칸이 딱 넷 = 회차 · 배란 · 생리 · 가임 순서(머리말과 짝)`);
    ok(shaped && rows.every((c, i) => c[0].text === want[i].n && c[1].text === want[i].o && c[2].text === want[i].m), `${lmp} · ${cycle}일: 자리마다 값이 맞다 — 회차 글자 · 둘째 칸 = 배란 · 셋째 칸 = 생리(${rows[0]?.[1]?.text} → ${rows[0]?.[2]?.text} … ${rows[5]?.[1]?.text} → ${rows[5]?.[2]?.text})`);
    ok(shaped && rows.every((c, i) => { const [a, b] = fertileEnds(c); return a === want[i].fs && b === want[i].fe; }), `${lmp} · ${cycle}일: 가임 기간 = 배란 5일 전 ~ 1일 뒤(시작·끝이 뒤바뀌지 않음 · 1회차 ${want[0].fs} ~ ${want[0].fe})`);
    ok(shaped && rows.every((c) => c[1].text < c[2].text), `${lmp} · ${cycle}일: 줄마다 배란 날짜가 그 줄 생리보다 이르다(시간 순서)`);
  }
  ok(!crashed, `스크립트가 멈추지 않고 돌았다${crashed ? " — " + crashed : ""}`);
}

// 머리말 칸 순서 = 줄 칸 순서(배란 예정 → 생리 시작 예정 → 가임 기간). 한쪽만 바꾸면 날짜가 엉뚱한 이름 아래 선다
{
  const head = (/<div class="cal-row head">([\s\S]*?)<\/div>/.exec(html) || [, ""])[1];
  const labels = [...head.matchAll(/<span[^>]*>([^<]*)<\/span>/g)].map((m) => m[1].trim());
  ok(labels.join("|") === "회차|배란 예정|생리 시작 예정|가임 기간", `달력 머리말 = 회차 · 배란 예정 · 생리 시작 예정 · 가임 기간(지금: ${labels.join(" · ")})`);
}

// 같은 꼴 막기: 계산기 화면 어디에도 «요소.outerHTML = …» 대입이 없다
{
  const hits = [];
  for (const d of fs.readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith(".") || ["scripts", "assets", "node_modules"].includes(d.name)) continue;
    const p = path.join(root, d.name, "index.html");
    if (fs.existsSync(p) && /\.outerHTML\s*=[^=]/.test(fs.readFileSync(p, "utf8"))) hits.push(d.name);
  }
  ok(hits.length === 0, `계산기 화면에 outerHTML 대입 없음${hits.length ? " — " + hits.join(", ") : ""}`);
}

if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log("✅ 전부 통과");
