// 카카오톡 공유 SDK 로더 + 자동 버튼 핸들러
(function () {
  const KAKAO_KEY = '2ca86d27b652814e62a23d90b9870d58';
  const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

  function loadSDK(cb) {
    if (window.Kakao) return cb();
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.crossOrigin = 'anonymous';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function init() {
    if (window.Kakao && !Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
  }

  function attach() {
    const btn = document.getElementById('share-kakao');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!window.Kakao || !Kakao.isInitialized()) {
        alert('카카오 SDK 로드 중입니다.');
        return;
      }
      const title = document.title || 'beautypang';
      const desc = document.querySelector('meta[name="description"]')?.content || '일상의 무료 계산기 모음';
      const img = (document.querySelector('meta[property="og:image"]')?.content) || (location.origin + '/og-image.svg');
      try {
        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title, description: desc, imageUrl: img,
            link: { mobileWebUrl: location.href, webUrl: location.href },
          },
          buttons: [{ title: '계산기 사용하기', link: { mobileWebUrl: location.href, webUrl: location.href } }],
        });
      } catch (e) {
        console.error('카카오 공유 실패:', e);
      }
    });

    const cp = document.getElementById('share-copy-kakao');
    if (cp) {
      cp.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          const orig = cp.innerHTML;
          cp.innerHTML = '<span>✓</span> 복사됨';
          setTimeout(() => cp.innerHTML = orig, 1500);
        } catch (e) {}
      });
    }
  }

  loadSDK(init);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
