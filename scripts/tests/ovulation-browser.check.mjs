// 배란일 계산기 «진짜 브라우저» 확인 — node scripts/tests/ovulation-browser.check.mjs [캡처 폴더]
// ovulation-recalc.test.mjs가 못 보는 것(CSS로 칸 자리가 바뀌는지 · 머리말과 줄의 칸이 눈으로 맞는지 · 폰에서 가임 칸이 머리말·줄 같이 숨는지 · 가로 넘침)을
// 헤드리스 크롬으로 본다. 무거운 일(새 크롬)이라 다른 무거운 일이 없을 때 손으로 돌린다 — 예약 실행 X.
//   · 크롬 원격 포트 9453(9333~9340은 영상공장 전용 · 9452는 웨이지랩 화면 시험) · 로컬 서버 4393
//   · 광고·통계·카카오 주소는 막고 연다(시험이 방문 수·광고 요청으로 잡히지 않게)
//   · 기대값은 페이지 코드를 쓰지 않고 여기서 따로 센다(UTC 날짜 셈)
// 자리: /scripts/* 는 _redirects가 막아 공개되지 않는다.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import url from "node:url";
import { spawn } from "node:child_process";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..", "..");
const SHOTS = process.argv[2] || path.join(os.tmpdir(), "beautypang-ovulation-shots");
const PORT = 4393, CDP = 9453;
const TARGET = `http://127.0.0.1:${PORT}/ovulation-calculator/`;
const BLOCK = ["*googletagmanager.com*", "*google-analytics.com*", "*googlesyndication.com*", "*doubleclick.net*", "*adtrafficquality*", "*kakao*", "*workers.dev*", "*beautypang.co.kr*"];
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".xml": "application/xml" };

// ── 기대값(페이지와 따로 센다) ──
const DAY = 86400000;
const parse = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const fmt = (t) => { const d = new Date(t); return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`; };
const kor = (t) => { const d = new Date(t); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${"일월화수목금토"[d.getUTCDay()]})`; };
const expectRows = (lmp, cycle) => Array.from({ length: 6 }, (_, i) => {
  const m = parse(lmp) + cycle * (i + 1) * DAY, o = m - 14 * DAY;
  return { month: `${i + 1}회차`, ovulation: fmt(o), menses: fmt(m), fertile: `${fmt(o - 5 * DAY)} ~ ${fmt(o + DAY)}` };
});
const ORDER = ["month", "ovulation", "menses", "fertile"];
const HEAD = ["회차", "배란 예정", "생리 시작 예정", "가임 기간"];
const INPUTS = [["2026-11-01", 28], ["2026-10-15", 31], ["2026-12-20", 21], ["2027-01-31", 35]];
const VIEWS = [{ name: "pc", width: 1280, height: 1600, mobile: false, cols: 4 }, { name: "phone", width: 390, height: 1400, mobile: true, cols: 3 }];

let ok = 0, bad = 0;
const check = (c, name, got) => { if (c) { ok++; console.log("✅", name); } else { bad++; console.log("❌", name, "→", JSON.stringify(got)); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((q, s) => {
  const p = decodeURIComponent(q.url.split("?")[0]);
  let f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { s.writeHead(403); return s.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(s);
}).listen(PORT, "127.0.0.1");

fs.mkdirSync(SHOTS, { recursive: true });
const prof = path.join(os.tmpdir(), "beautypang-ovulation-chrome");
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, "--window-size=1280,1600", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "about:blank"], { stdio: "ignore" });

// 화면에서 읽기: 보이는 칸만(display:none 제외) · 칸의 왼쪽 자리·글·넘침
const READ = `(() => {
  const vis = (el) => getComputedStyle(el).display !== 'none';
  const cell = (el) => { const r = el.getBoundingClientRect(); return { cls: el.className, text: el.textContent.replace(/\\s+/g, ' ').trim(), x: Math.round(r.left), y: Math.round(r.top), clip: el.scrollWidth > el.clientWidth + 1 }; };
  const headAll = [...document.querySelectorAll('#calendar > .cal-row.head > span')];
  const bodyRows = [...document.querySelectorAll('#calBody > .cal-row')];
  return {
    head: headAll.filter(vis).map(cell),
    headHidden: headAll.filter((e) => !vis(e)).map((e) => e.textContent.trim()),
    rows: bodyRows.map((r) => [...r.children].filter(vis).map(cell)),
    rowsHidden: bodyRows.map((r) => [...r.children].filter((e) => !vis(e)).map((e) => e.className)),
    bodyText: document.getElementById('calBody').textContent.replace(/\\s+/g, ' ').trim().slice(0, 40),
    bodyStyle: document.getElementById('calBody').getAttribute('style'),
    shown: document.getElementById('result').classList.contains('show'),
    resDate: document.getElementById('resDate').textContent.trim(),
    noScroll: document.documentElement.scrollWidth <= window.innerWidth,
    vw: window.innerWidth,
  };
})()`;
const submit = (lmp, cycle) => `(() => {
  document.getElementById('lmp').value = '${lmp}';
  const c = document.getElementById('cycle'); c.value = '${cycle}'; c.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('calc').requestSubmit();
  return document.getElementById('cycleVal').textContent;
})()`;

try {
  let tabs;
  for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); break; } catch { await sleep(250); } }
  if (!tabs) throw new Error("크롬 원격 포트가 안 열림");
  const page = tabs.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error("웹소켓 연결 실패")); });
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown") errors.push(d.params?.exceptionDetails?.exception?.description || d.params?.exceptionDetails?.text || "오류");
  };
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; wait.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setBlockedURLs", { urls: BLOCK });

  for (const v of VIEWS) {
    await send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: v.mobile });
    await send("Page.navigate", { url: TARGET });
    await sleep(2500);
    const first = await ev(READ);
    check(first && first.vw === v.width, `[${v.name}] 화면 너비 ${v.width}`, first && first.vw);
    check(first.rows.length === 0 && first.bodyText.includes("LMP를 입력하면") && !first.shown, `[${v.name}] 계산 전 = 안내 글 · 결과 숨김`, { rows: first.rows.length, text: first.bodyText, shown: first.shown });
    check(first.head.length === v.cols && first.head.map((h) => h.text).join("|") === HEAD.slice(0, v.cols).join("|"), `[${v.name}] 머리말 보이는 칸 ${v.cols}개 = ${HEAD.slice(0, v.cols).join(" · ")}`, first.head.map((h) => h.text));
    const headX = first.head.map((h) => h.x);
    check(headX.every((x, i) => i === 0 || x > headX[i - 1]), `[${v.name}] 머리말 칸이 왼쪽 → 오른쪽 순서`, headX);

    for (const [lmp, cycle] of INPUTS) {
      const shownCycle = await ev(submit(lmp, cycle));
      await sleep(700);
      const s = await ev(READ);
      const want = expectRows(lmp, cycle);
      const tag = `[${v.name}] ${lmp}·${cycle}일`;
      check(shownCycle === String(cycle) && s.shown, `${tag} 계산됨(주기 표시 ${cycle})`, { shownCycle, shown: s.shown });
      check(s.rows.length === 6 && s.rows.every((r) => r.length === v.cols), `${tag} 줄 6 · 줄마다 보이는 칸 ${v.cols}`, s.rows.map((r) => r.length));
      // 눈에 보이는 자리(왼쪽 좌표) 순서대로 읽었을 때 칸 종류가 회차 → 배란 → 생리 (→ 가임)
      const byX = s.rows.map((r) => [...r].sort((a, b) => a.x - b.x));
      check(byX.every((r) => r.every((c, i) => c.cls.split(/\s+/).includes(ORDER[i]))), `${tag} 눈에 보이는 칸 순서 = ${ORDER.slice(0, v.cols).join(" → ")}`, byX[0] && byX[0].map((c) => c.cls));
      // 머리말 칸과 줄의 칸이 세로로 맞는다(왼쪽 좌표 ±1)
      const hx = s.head.map((h) => h.x);
      check(byX.every((r) => r.every((c, i) => Math.abs(c.x - hx[i]) <= 1)), `${tag} 머리말과 줄의 칸 자리 일치`, { head: hx, row1: byX[0] && byX[0].map((c) => c.x) });
      // 한 줄의 칸들이 같은 높이(줄바꿈으로 칸이 아래로 밀리지 않음)
      check(byX.every((r) => r.every((c) => Math.abs(c.y - r[0].y) <= 6)), `${tag} 한 줄의 칸이 같은 높이`, byX[0] && byX[0].map((c) => c.y));
      // 값 = 따로 센 기대값
      const got = byX.map((r) => Object.fromEntries(r.map((c, i) => [ORDER[i], c.text])));
      const diff = [];
      want.forEach((w, i) => ORDER.slice(0, v.cols).forEach((k) => { if (!got[i] || got[i][k] !== w[k]) diff.push(`${i + 1}줄 ${k}: ${got[i] && got[i][k]} ↔ ${w[k]}`); }));
      check(diff.length === 0, `${tag} 값 6줄 × ${v.cols}칸 = 기대값`, diff.slice(0, 4));
      // 위쪽 큰 결과(이번 주기 배란일) = 달력 1회차 배란일과 같은 날
      check(s.resDate === kor(parse(lmp) + (cycle - 14) * DAY), `${tag} 위쪽 결과 = 1회차 배란일(${kor(parse(lmp) + (cycle - 14) * DAY)})`, s.resDate);
      check(s.rows.flat().every((c) => !c.clip) && s.noScroll, `${tag} 글 잘림·가로 넘침 없음`, { clipped: s.rows.flat().filter((c) => c.clip).map((c) => c.text), noScroll: s.noScroll });
      check(s.bodyStyle === null, `${tag} 안내 글용 여백 걷힘`, s.bodyStyle);
      if (v.cols === 3) check(s.headHidden.join() === "가임 기간" && s.rowsHidden.every((h) => h.length === 1 && h[0].split(/\s+/).includes("fertile")), `${tag} 폰에서 숨는 칸 = 머리말·줄 모두 가임 기간`, { head: s.headHidden, row1: s.rowsHidden[0] });
    }
    await ev(`document.getElementById('calendar').scrollIntoView({ block: 'center', behavior: 'instant' })`);
    await sleep(400);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = path.join(SHOTS, `ovulation-${v.name}.png`);
    fs.writeFileSync(file, Buffer.from(shot.result.data, "base64"));
    console.log("캡처:", file);
  }
  check(errors.length === 0, "페이지 스크립트 오류 0", errors.slice(0, 3));
  await Promise.race([send("Browser.close"), sleep(1500)]); // 닫히면서 답이 안 올 수 있다
  try { ws.close(); } catch {}
} catch (e) { bad++; console.log("❌ 시험 자체 오류", e.message); }
finally { try { chrome.kill(); } catch {} server.close(); }
console.log(`결과: 통과 ${ok} · 실패 ${bad}`);
process.exitCode = bad ? 1 : 0;
setTimeout(() => process.exit(), 500);
