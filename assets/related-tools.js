/**
 * beautypang — 관련 도구 자동 삽입
 *
 * 사용법: 페이지 어디든 <div data-related-tools></div> 를 박으면
 * 현재 페이지를 제외한 다른 도구 카드 그리드가 자동 렌더링됨.
 *
 * 페이지 끝 또는 share 섹션 다음에 두는 게 자연스러움.
 */

(function () {
  if (typeof document === 'undefined') return;

  const TOOLS = [
    { icon: '⚖️', name: 'BMI · 기초대사량', desc: '체질량지수·BMR·일일 권장 칼로리', href: '/bmi-calculator/' },
    { icon: '💪', name: '체지방률 · 체수분율', desc: 'Deurenberg·Watson 공식 종합 체성분', href: '/body-composition/' },
    { icon: '🏃', name: '운동 칼로리', desc: '운동별 칼로리 소모량 계산', href: '/exercise-calorie/' },
    { icon: '🌙', name: '수면 시간', desc: '90분 수면 주기 기반 최적 기상', href: '/sleep-calculator/' },
    { icon: '🤰', name: '임신 주수 · 출산 예정일', desc: 'LMP+280일 주차별 가이드', href: '/pregnancy-calculator/' },
    { icon: '🌷', name: '배란일 · 가임기간', desc: '황체기 14일 + 6개월 캘린더', href: '/ovulation-calculator/' },
    { icon: '💧', name: '하루 물 섭취량', desc: '체중·활동량 기반 권장 수분량', href: '/water-intake/' },
    { icon: '🥩', name: '하루 단백질 섭취량', desc: '목표별 권장 단백질 + 식품 환산', href: '/protein-calculator/' },
    { icon: '🔥', name: '칼로리 계산기', desc: '기초대사량·하루 권장 칼로리 + 탄단지 매크로', href: '/calorie-calculator/' },
    { icon: '📏', name: '예상 키 계산기', desc: '부모 키로 자녀 성인 키 예측 (중간부모키)', href: '/height-predictor/' },
    { icon: '📐', name: '복부비만 계산기', desc: '허리둘레·BMI·WHtR·WHR 종합 비만도 진단', href: '/obesity-check/' },
    { icon: '🎂', name: '만 나이 계산기', desc: '만 나이·연 나이·띠·별자리·생일 D-day', href: '/age-calculator/' },
    { icon: '🎯', name: '디데이 계산기', desc: 'D-day·100일·기념일·날짜 더하기/빼기', href: '/d-day/' },
    { icon: '☕', name: '카페인 계산기', desc: '하루 카페인 한도·섭취량·취침 전 마지노선', href: '/caffeine/' },
    { icon: '🏋️', name: '1RM 계산기', desc: '1회 최대 중량 추정 + 훈련강도 %1RM 환산표', href: '/one-rep-max/' },
  ];

  const STYLE = `
    .related-tools-section { margin: 56px auto 24px; max-width: 960px; padding: 0 20px; }
    .related-tools-section h3 { font-size: 18px; margin: 0 0 6px; color: #0f172a; font-weight: 800; letter-spacing: -0.3px; }
    .related-tools-section .rt-sub { margin: 0 0 18px; font-size: 13px; color: #94a3b8; }
    .related-tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .related-tool-card { display: flex; flex-direction: column; gap: 6px; padding: 18px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; transition: all 0.15s ease; text-decoration: none; color: #0f172a; }
    .related-tool-card:hover { border-color: #2563eb; box-shadow: 0 4px 16px rgba(37,99,235,0.10); transform: translateY(-2px); text-decoration: none; }
    .related-tool-card .rt-icon { font-size: 22px; line-height: 1; }
    .related-tool-card .rt-name { font-weight: 700; font-size: 14px; color: #0f172a; }
    .related-tool-card .rt-desc { font-size: 12px; color: #64748b; line-height: 1.5; }
    .related-tool-card .rt-cta { margin-top: auto; font-size: 12px; color: #2563eb; font-weight: 700; padding-top: 6px; }
    .related-tool-card .rt-cta::after { content: ' →'; transition: transform 0.15s; display: inline-block; }
    .related-tool-card:hover .rt-cta::after { transform: translateX(3px); }
    .related-back { display: inline-flex; align-items: center; gap: 6px; margin-top: 20px; padding: 12px 22px; background: #f1f5f9; color: #475569; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; transition: all 0.15s; }
    .related-back:hover { background: #2563eb; color: #fff; text-decoration: none; }
  `;

  function init() {
    const slots = document.querySelectorAll('[data-related-tools]');
    if (!slots.length) return;

    // 스타일 주입 (1번만)
    if (!document.getElementById('related-tools-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'related-tools-style';
      styleEl.textContent = STYLE;
      document.head.appendChild(styleEl);
    }

    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const others = TOOLS.filter(t => !currentPath.startsWith(t.href.replace(/\/$/, '')));

    // 최대 5개 표시 (전체 사이트 일관성 위해)
    const show = others.slice(0, 5);

    slots.forEach(slot => {
      slot.innerHTML = `
        <section class="related-tools-section">
          <h3>함께 보면 좋은 도구</h3>
          <p class="rt-sub">한 번에 다 끝내세요 — beautypang의 다른 무료 계산기들</p>
          <div class="related-tools-grid">
            ${show.map(t => `
              <a href="${t.href}" class="related-tool-card">
                <div class="rt-icon">${t.icon}</div>
                <div class="rt-name">${t.name}</div>
                <div class="rt-desc">${t.desc}</div>
                <div class="rt-cta">사용하기</div>
              </a>
            `).join('')}
          </div>
          <a href="/" class="related-back">🏠 도구 모음으로 돌아가기</a>
        </section>
      `;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
