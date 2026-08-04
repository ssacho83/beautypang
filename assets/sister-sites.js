/**
 * 더나무 자매 사이트 상호 링크 — 전 사이트 공용 (단일 소스)
 *
 * 사용법: 각 사이트 푸터 안에 <div data-sister-sites></div> 를 넣고
 *         이 스크립트를 로드하면 현재 사이트를 제외한 카드가 자동 렌더링된다.
 *
 * 원칙
 *  - 현재 호스트는 자동 제외 (자기 자신을 추천하지 않는다)
 *  - 문구는 각 사이트의 실제 도구만 반영 (없는 기능 쓰지 않는다)
 *  - legal · 404 페이지에는 넣지 않는다 (푸터에 마크업을 안 넣으면 자동 미적용)
 *
 * 사이트를 추가·변경할 때는 이 파일 하나만 고치고 4곳에 복사한다.
 */

(function () {
  if (typeof document === 'undefined') return;

  var SITES = [
    {
      host: 'proptax.kr',
      name: '프롭택스',
      desc: '양도세 · 취득세 · 보유세 계산기 7종',
      href: 'https://proptax.kr/'
    },
    {
      host: 'wagelab.kr',
      name: '웨이지랩',
      desc: '연봉 실수령액 · 4대보험 · 퇴직금 계산기 7종',
      href: 'https://wagelab.kr/'
    },
    {
      host: 'beautypang.co.kr',
      name: '뷰티팡',
      desc: 'BMI · 칼로리 · 임신 주수 계산기 17종',
      href: 'https://beautypang.co.kr/'
    },
    {
      host: 'jr-j.com',
      name: '주려줌',
      desc: 'URL 단축 · QR 코드 · UTM · 비밀번호 생성',
      href: 'https://jr-j.com/'
    }
  ];

  var HOME = { name: '더나무', desc: '제작 스튜디오', href: 'https://thenamu.net/' };

  var STYLE = [
    '.sister-sites{margin:28px auto 0;max-width:940px;padding:24px 20px 0;border-top:1px solid rgba(128,128,128,.18);text-align:left}',
    '.sister-sites .ss-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin:0 0 14px}',
    '.sister-sites .ss-title{font-size:13px;font-weight:700;letter-spacing:.01em;opacity:.85;margin:0}',
    '.sister-sites .ss-by{font-size:12px;opacity:.5}',
    '.sister-sites .ss-by a{opacity:.75;text-decoration:none;border-bottom:1px solid rgba(128,128,128,.3)}',
    '.sister-sites .ss-by a:hover{opacity:1}',
    '.sister-sites .ss-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}',
    '.sister-sites .ss-card{display:block;padding:13px 15px;border:1px solid rgba(128,128,128,.22);border-radius:10px;text-decoration:none;transition:border-color .15s,transform .15s,box-shadow .15s}',
    '.sister-sites .ss-card:hover{border-color:rgba(128,128,128,.45);transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.06);text-decoration:none}',
    '.sister-sites .ss-card:focus-visible{outline:2px solid currentColor;outline-offset:2px}',
    '.sister-sites .ss-name{display:block;font-size:14px;font-weight:700;margin-bottom:3px}',
    '.sister-sites .ss-desc{display:block;font-size:12px;line-height:1.5;opacity:.62}',
    '@media (prefers-reduced-motion:reduce){.sister-sites .ss-card{transition:none}.sister-sites .ss-card:hover{transform:none}}'
  ].join('');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    // 아직 렌더되지 않은 마운트만 처리한다 (재호출 시 중복 렌더 방지)
    var mounts = [];
    var found = document.querySelectorAll('[data-sister-sites]');
    for (var k = 0; k < found.length; k++) {
      if (!found[k].querySelector('.ss-grid')) mounts.push(found[k]);
    }
    if (!mounts.length) return;

    if (!document.getElementById('sister-sites-style')) {
      var st = document.createElement('style');
      st.id = 'sister-sites-style';
      st.textContent = STYLE;
      document.head.appendChild(st);
    }

    // 현재 사이트 판별 — 호스트명이 우선이지만, 로컬 프리뷰(127.0.0.1 등)에서는
    // 마운트 지점의 data-sister-sites 값을 자기 식별자로 쓴다.
    // 예: <div data-sister-sites="proptax.kr"></div>
    var here = location.hostname.replace(/^www\./, '');
    var declared = mounts[0].getAttribute('data-sister-sites');
    var self = SITES.some(function (s) { return s.host === here; }) ? here : (declared || here);

    var others = SITES.filter(function (s) { return s.host !== self; });
    if (!others.length) return;

    var cards = others.map(function (s) {
      return '<a class="ss-card" href="' + esc(s.href) + '" rel="noopener">' +
             '<span class="ss-name">' + esc(s.name) + '</span>' +
             '<span class="ss-desc">' + esc(s.desc) + '</span>' +
             '</a>';
    }).join('');

    var html =
      '<div class="ss-head">' +
        '<p class="ss-title">함께 쓰면 편한 무료 계산기</p>' +
        '<span class="ss-by">' + esc(HOME.name) + '가 만든 다른 도구 · ' +
          '<a href="' + esc(HOME.href) + '" rel="noopener">전체 보기</a>' +
        '</span>' +
      '</div>' +
      '<div class="ss-grid">' + cards + '</div>';

    for (var i = 0; i < mounts.length; i++) {
      if (mounts[i].className.indexOf('sister-sites') === -1) {
        mounts[i].className = (mounts[i].className ? mounts[i].className + ' ' : '') + 'sister-sites';
      }
      mounts[i].innerHTML = html;
    }
  }

  // 푸터를 나중에 다시 그리는 사이트(예: 뷰티팡 nav.js)에서 재호출할 수 있게 노출한다.
  window.renderSisterSites = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
