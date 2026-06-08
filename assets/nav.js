/**
 * beautypang — 햄버거 메뉴 + drawer
 *
 * 모든 페이지에 적용 가능한 재사용 모듈.
 * <script src="/assets/nav.js" defer></script> 한 줄로 동작.
 *
 * 기능:
 * - site-header에 햄버거 아이콘 자동 추가
 * - 우측 슬라이드 drawer (도구 모음 + 소개)
 * - 현재 페이지 active 표시
 * - ESC·배경 클릭으로 닫기
 * - iOS safe-area 대응
 */

(function () {
  if (typeof document === 'undefined') return;

  // ─── 데이터 (도구 목록) ────────────────────────────────
  const TOOLS = [
    { icon: '⚖️', label: 'BMI · 기초대사량 · 일일 권장 칼로리', href: '/bmi-calculator/', cat: '건강' },
    { icon: '💪', label: '체지방률 · 체수분율 · 제지방량', href: '/body-composition/', cat: '건강' },
    { icon: '🏃', label: '운동 칼로리 소모', href: '/exercise-calorie/', cat: '다이어트' },
    { icon: '🌙', label: '수면 시간 (90분 주기)', href: '/sleep-calculator/', cat: '건강' },
    { icon: '🤰', label: '임신 주수 · 출산 예정일', href: '/pregnancy-calculator/', cat: '임신·여성' },
    { icon: '🌷', label: '배란일 · 가임기간', href: '/ovulation-calculator/', cat: '임신·여성' },
    { icon: '💧', label: '하루 물 섭취량', href: '/water-intake/', cat: '건강' },
  ];

  // ─── 스타일 ───────────────────────────────────────────
  const STYLE = `
    .nav-toggle { background: transparent; border: 0; padding: 6px 10px; cursor: pointer; font-size: 24px; color: #475569; font-family: inherit; line-height: 1; border-radius: 8px; transition: background 0.15s, color 0.15s; }
    .nav-toggle:hover { background: #f1f5f9; color: #2563eb; }
    .nav-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(2px); z-index: 99; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
    .nav-backdrop.show { opacity: 1; pointer-events: auto; }
    .nav-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(340px, 88vw); background: #fff; box-shadow: -8px 0 32px rgba(15,23,42,0.12); z-index: 100; transform: translateX(100%); transition: transform 0.25s ease-out; display: flex; flex-direction: column; padding-top: env(safe-area-inset-top, 0); padding-bottom: env(safe-area-inset-bottom, 0); }
    .nav-drawer.show { transform: translateX(0); }
    .nav-drawer-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid #e2e8f0; }
    .nav-drawer-head .nav-brand { font-weight: 800; font-size: 17px; color: #0f172a; text-decoration: none; letter-spacing: -0.3px; }
    .nav-drawer-head .nav-brand span { color: #2563eb; font-weight: 600; }
    .nav-close { background: transparent; border: 0; font-size: 22px; color: #94a3b8; cursor: pointer; padding: 4px 8px; line-height: 1; }
    .nav-close:hover { color: #0f172a; }
    .nav-section { padding: 16px 0 20px; overflow-y: auto; flex: 1; }
    .nav-section-title { padding: 0 20px 8px; font-size: 11px; color: #94a3b8; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; }
    .nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 20px; color: #0f172a; text-decoration: none; font-size: 14px; font-weight: 500; transition: background 0.12s; }
    .nav-link:hover { background: #f8fafc; text-decoration: none; }
    .nav-link.active { background: #dbeafe; color: #1d4ed8; font-weight: 700; border-right: 3px solid #2563eb; }
    .nav-link .nav-icon { font-size: 18px; width: 24px; text-align: center; }
    .nav-link .nav-label { flex: 1; line-height: 1.4; }
    .nav-link .nav-cat { font-size: 10px; color: #94a3b8; background: #f1f5f9; padding: 2px 6px; border-radius: 999px; font-weight: 600; }
    .nav-section-foot { padding: 16px 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
    .nav-section-foot a { color: #475569; display: inline-block; }
    body.nav-open { overflow: hidden; }
    .nav-injected-foot { padding: 36px 24px; margin-top: 32px; border-top: 1px solid #e2e8f0; background: #fff; text-align: center; }
    .nav-injected-foot .foot-nav { display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 18px; font-size: 13px; }
    .nav-injected-foot .foot-nav a { color: #475569; font-weight: 600; text-decoration: none; transition: color 0.15s; }
    .nav-injected-foot .foot-nav a:hover { color: #2563eb; }
    .nav-injected-foot .copy { display: block; margin-top: 14px; font-size: 11px; color: #94a3b8; max-width: 700px; margin-left: auto; margin-right: auto; line-height: 1.6; }
  `;

  // ─── 공통 푸터 (법적 링크) — 자체 footer가 없는 페이지에만 주입 ───
  const LEGAL_LINKS = `
    <a href="/legal/privacy.html">개인정보 처리방침</a>
    <a href="/legal/terms.html">이용약관</a>
    <a href="/legal/disclaimer.html">면책 고지</a>`;

  const FOOT_HTML = `
      <div class="foot-nav">
        <a href="/">홈</a>${LEGAL_LINKS}
      </div>
      <span class="copy">© <span data-foot-year></span> beautypang.co.kr — 계산 결과는 참고용이며 의료 전문가의 진단·처방을 대체하지 않습니다.</span>`;

  function injectFooter() {
    const existing = document.querySelector('footer.site');
    // 이미 법적 링크가 있는 푸터(홈 등)는 건드리지 않음
    if (existing && existing.querySelector('a[href*="/legal/"]')) return;
    let foot;
    if (existing) {
      // 비어있는 footer.site 껍데기(도구 페이지)를 채움
      foot = existing;
      foot.classList.add('nav-injected-foot');
      foot.innerHTML = FOOT_HTML;
    } else {
      // 푸터 자체가 없는 페이지에 새로 주입
      foot = document.createElement('footer');
      foot.className = 'site nav-injected-foot';
      foot.innerHTML = FOOT_HTML;
      document.body.appendChild(foot);
    }
    const y = foot.querySelector('[data-foot-year]');
    if (y) y.textContent = new Date().getFullYear();
  }

  function init() {
    // 스타일 주입
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);

    // 공통 푸터 주입 (헤더 유무와 무관하게 실행)
    injectFooter();

    const header = document.querySelector('header.site');
    if (!header) return;

    // 햄버거 버튼 — nav에 추가
    const nav = header.querySelector('.nav');
    if (!nav) return;

    // 기존 "← 도구 모음" 링크가 nav-link 클래스로 있으면 햄버거 옆에 둠
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'nav-toggle';
    toggleBtn.setAttribute('aria-label', '메뉴 열기');
    toggleBtn.innerHTML = '☰';

    // 기존 우측 링크 제거 + 햄버거 추가
    const existingLink = nav.querySelector('.nav-link');
    if (existingLink) existingLink.remove();
    nav.appendChild(toggleBtn);

    // 백드롭
    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);

    // Drawer
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const isActive = (href) => {
      const h = href.replace(/\/$/, '');
      return h === path || (h !== '/' && path.startsWith(h));
    };

    const drawer = document.createElement('aside');
    drawer.className = 'nav-drawer';
    drawer.setAttribute('aria-label', '도구 메뉴');
    drawer.setAttribute('aria-hidden', 'true');

    drawer.innerHTML = `
      <div class="nav-drawer-head">
        <a href="/" class="nav-brand">beautypang<span>.tools</span></a>
        <button type="button" class="nav-close" aria-label="메뉴 닫기">✕</button>
      </div>
      <nav class="nav-section">
        <div class="nav-section-title">홈</div>
        <a class="nav-link${path === '/' ? ' active' : ''}" href="/">
          <span class="nav-icon">🏠</span>
          <span class="nav-label">도구 모음</span>
        </a>
        <div class="nav-section-title" style="margin-top:14px;">도구</div>
        ${TOOLS.map(t => `
          <a class="nav-link${isActive(t.href) ? ' active' : ''}" href="${t.href}">
            <span class="nav-icon">${t.icon}</span>
            <span class="nav-label">${t.label}</span>
            <span class="nav-cat">${t.cat}</span>
          </a>
        `).join('')}
        <div class="nav-section-title" style="margin-top:14px;">정보</div>
        <a class="nav-link" href="/#about">
          <span class="nav-icon">ℹ️</span>
          <span class="nav-label">사이트 소개</span>
        </a>
      </nav>
      <div class="nav-section-foot">
        <a href="/legal/privacy.html">개인정보 처리방침</a> ·
        <a href="/legal/terms.html">이용약관</a> ·
        <a href="/legal/disclaimer.html">면책 고지</a><br>
        © <span data-year></span> beautypang.tools<br>
        <a href="https://jr-j.com/" rel="noopener">주려줌 — URL 단축 · QR 코드</a>
      </div>
    `;
    document.body.appendChild(drawer);
    drawer.querySelector('[data-year]').textContent = new Date().getFullYear();

    function open() {
      drawer.classList.add('show');
      backdrop.classList.add('show');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('nav-open');
    }
    function close() {
      drawer.classList.remove('show');
      backdrop.classList.remove('show');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('nav-open');
    }

    toggleBtn.addEventListener('click', open);
    drawer.querySelector('.nav-close').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('show')) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
