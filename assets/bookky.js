/* 북키 공통 스크립트: 판매 링크 설정 + Meta 픽셀 이벤트 + Polar 결제 링크에 유입 정보 넘기기
   페이지마다 <script>window.BOOKKY = {...}</script> 로 설정을 먼저 둔다.
   1권 판매 페이지와 같은 저장 키(vg_utm, vg_vid)를 써서 광고 유입이 서가를 거쳐도 이어진다. */
(function () {
  var C = window.BOOKKY || {};
  var track = function (ev, data, custom) { try { if (window.fbq) fbq(custom ? "trackCustom" : "track", ev, data || {}); } catch (e) {} };
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var now = new Date();
  var when = { visit_hour: now.getHours(), visit_weekday: now.getDay() };

  var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var q = new URLSearchParams(location.search);
  var utm = {};
  KEYS.forEach(function (k) { if (q.get(k)) utm[k] = q.get(k).slice(0, 200); });
  if (Object.keys(utm).length) set("vg_utm", JSON.stringify(utm));
  else { try { utm = JSON.parse(get("vg_utm") || "{}") || {}; } catch (e) { utm = {}; } }
  var vid = get("vg_vid");
  if (!vid) { vid = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); set("vg_vid", vid); }

  var product = C.book ? { content_name: C.book, content_type: "product", value: C.value || 0, currency: "KRW" } : null;
  if (product) track("ViewContent", Object.assign({}, product, when, utm));

  // 판매 버튼: 결제 링크가 있으면 구매, 없으면 출간 알림(메일)
  document.querySelectorAll(".js-cta").forEach(function (a) {
    var placement = a.getAttribute("data-place") || "body";
    if (C.checkoutUrl) {
      try {
        var u = new URL(C.checkoutUrl);
        KEYS.forEach(function (k) { if (utm[k]) u.searchParams.set(k, utm[k]); });
        u.searchParams.set("reference_id", vid);
        a.href = u.toString();
      } catch (e) { a.href = C.checkoutUrl; }
      a.rel = "noopener";
      a.textContent = a.getAttribute("data-buy") || "PDF 구매하기";
      a.addEventListener("click", function (e) {
        track("InitiateCheckout", Object.assign({}, product, when, utm, { num_items: 1, placement: placement }));
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        var href = a.href;
        setTimeout(function () { location.href = href; }, 300);
      });
    } else if (C.notifyEmail) {
      var subject = encodeURIComponent((C.book || "북키") + " 출간 알림 신청");
      var body = encodeURIComponent("출간되면 이 메일로 알려 주세요.");
      a.href = "mailto:" + C.notifyEmail + "?subject=" + subject + "&body=" + body;
      a.textContent = a.getAttribute("data-notify") || "출간 알림 받기";
      a.addEventListener("click", function () { track("Lead", Object.assign({}, product, utm, { placement: placement })); });
    }
  });

  // 서가에서 책을 고를 때
  document.querySelectorAll("[data-book-link]").forEach(function (a) {
    a.addEventListener("click", function () { track("BookTileClick", { book: a.getAttribute("data-book-link") }, true); });
  });

  // 문의 메일
  document.querySelectorAll(".js-contact").forEach(function (s) {
    if (!C.contact) return;
    var a = document.createElement("a"); a.href = "mailto:" + C.contact; a.textContent = C.contact; s.appendChild(a);
  });

  // 책에서 꺼낸 프롬프트 복사
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    var label = b.textContent;
    b.addEventListener("click", function () {
      var src = document.getElementById(b.getAttribute("data-copy"));
      if (!src) return;
      var text = src.innerText;
      var done = function () { b.textContent = "복사했어요"; setTimeout(function () { b.textContent = label; }, 1600); };
      // 클립보드 API가 막힌 브라우저(앱 안 브라우저 등)는 선택 후 execCommand로, 그것도 안 되면 선택만 해 둔다
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(src);
        var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) {}
        if (ok) { sel.removeAllRanges(); done(); return; }
        b.textContent = "선택했어요. 복사해 쓰세요"; setTimeout(function () { b.textContent = label; }, 2400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
      track("PromptCopy", { prompt: b.getAttribute("data-name") || "", page: C.page || "" }, true);
    });
  });

  // 노란 형광 강조: 화면에 들어오면 칠한다
  var sweeps = document.querySelectorAll(".js-sweep");
  if ("IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("on"); so.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -25% 0px" });
    sweeps.forEach(function (el) { so.observe(el); });
  } else sweeps.forEach(function (el) { el.classList.add("on"); });

  // 스크롤 깊이, 섹션 노출, FAQ·차례 열기, 실제로 본 시간
  var hit = {};
  addEventListener("scroll", function () {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (h <= 0) return;
    var p = scrollY / h * 100;
    [25, 50, 75, 100].forEach(function (m) { if (!hit[m] && p >= m - 1) { hit[m] = 1; track("ScrollDepth", { percent: m, page: C.page || "" }, true); } });
  }, { passive: true });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var h2 = en.target.querySelector("h2");
        track("SectionView", { section: h2 ? h2.innerText.replace(/\s+/g, " ").trim() : "", page: C.page || "" }, true);
      });
    }, { rootMargin: "0px 0px -40% 0px" });
    document.querySelectorAll("section").forEach(function (s) { io.observe(s); });
  }
  document.querySelectorAll("details").forEach(function (d) {
    d.addEventListener("toggle", function () { if (d.open) track(d.closest(".toc") ? "TocOpen" : "FAQOpen", { item: d.querySelector("summary").innerText.replace(/\s+/g, " ").trim(), page: C.page || "" }, true); });
  });
  var secs = 0, sent = {};
  setInterval(function () {
    if (document.visibilityState !== "visible") return;
    secs += 5;
    [15, 30, 60, 120, 300].forEach(function (s) { if (!sent[s] && secs >= s) { sent[s] = 1; track("EngagedTime", { seconds: s, page: C.page || "" }, true); } });
  }, 5000);
})();
