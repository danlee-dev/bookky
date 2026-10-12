# 북키 (bookky)

만들면서 쓴 책을 파는 서가. 책마다 페이지 하나를 두고, 결제는 Polar 결제 링크로 받는다.

- 운영 주소: https://bookky-beta.vercel.app
- 빌드 도구 없는 정적 사이트다. HTML, CSS, 공통 스크립트 하나로 끝난다.

## 구조

```
index.html                     서가 첫 화면 (책 타일)
books/<slug>/index.html        책 한 권의 판매 페이지 (테마는 책마다 다르게)
assets/bookky.js               공통 스크립트: 구매·알림 버튼, 유입 정보, Meta 픽셀 이벤트
assets/covers/<slug>-3d.webp   서가 타일과 판매 페이지에 쓰는 3D 책 이미지 (1100x1226, 투명)
assets/og/<slug>.jpg           링크 미리보기 이미지 (1200x630)
assets/pages/                  본문 미리 보기 쪽 이미지
assets/fonts/                  페이지에서 쓰는 글자만 남긴 서브셋 글꼴
tools/mockup.py                표지 PNG로 3D 책 이미지를 만드는 스크립트
```

## 새 책 넣기

1. dev에서 브랜치를 딴다. `git checkout dev && git pull && git checkout -b feat/book-<slug>`
2. `books/<slug>/index.html`을 만든다. 테마는 책의 콘셉트에서 가져온다. 다른 책 페이지를 복사해 색만 바꾸지 않는다. 지금 있는 두 권도 교정지(1권)와 커밋 로그(2권)로 서로 다르다.
3. 페이지 맨 아래에 판매 설정을 둔다.

   ```html
   <script>
   window.BOOKKY = { page: "<slug>", book: "책 이름", value: 0, checkoutUrl: "", notifyEmail: "문의 메일", contact: "문의 메일" };
   </script>
   <script src="/assets/bookky.js" defer></script>
   ```

   - `checkoutUrl`이 비어 있으면 `.js-cta` 버튼이 출간 알림 메일 버튼이 된다. Polar 결제 링크를 넣으면 구매 버튼으로 바뀌고, 광고 유입 정보(UTM)와 방문자 id가 결제 링크에 붙는다.
   - `value`는 원 단위 가격이다. 픽셀의 ViewContent·InitiateCheckout 값으로 쓰인다.
   - 버튼 위치는 `data-place="hero"`처럼 적어 둔다. 어느 버튼이 눌렸는지 이벤트에 남는다.
   - 그 밖의 장치: `[data-copy]`는 복사 버튼, `.js-sweep`은 화면에 들어올 때 노란 형광이 칠해지는 강조다.
4. 서가 `index.html`의 `.shelf`에 타일을 하나 더 넣는다. 타일 색은 그 책 페이지의 색에서 가져온다.

   ```html
   <a class="book b3" href="/books/<slug>/" data-book-link="책 이름"> ... </a>
   ```

5. 이미지를 넣는다. 3D 책은 `python3 tools/mockup.py cover.png "책등 제목" "저자" assets/covers/<slug>-3d.webp`로 만든다(글꼴은 `MOCKUP_TITLE_FONT`, `MOCKUP_AUTHOR_FONT` 환경 변수). 링크 미리보기 이미지(`og:image`)는 `https://bookky-beta.vercel.app/...` 절대 주소로 적는다.
6. 로컬에서 확인한다.

   ```bash
   python3 -m http.server 4777
   ```

   - 휴대폰(375), 태블릿(768), 데스크톱(1280) 폭에서 가로 스크롤이 생기지 않는지 본다.
   - 개발자도구 콘솔에 에러가 없는지 본다.
   - 서브셋 글꼴을 쓴다면 문구를 바꾼 뒤 다시 만든다. 빠진 글자는 다른 글꼴로 섞여 나온다.
7. PR은 dev로 연다. dev에서 main으로 합치는 것이 배포다.

## 지키는 것

- 책 소개에 쓰는 사례와 숫자는 실제 기록에서 확인한 것만 쓴다. 서가 첫 화면에 적어 둔 약속과 같다.
- 실제 구매자 후기가 생기기 전에는 후기 자리를 비워 둔다. 마감 타이머, 남은 수량 같은 가짜 긴급성은 넣지 않는다.
- 이 저장소는 공개다. 페이지에 들어간 값은 누구나 볼 수 있다. API 키나 비밀값은 넣지 않는다. 결제는 Polar 결제 링크만 쓴다.
- Meta 픽셀 ID와 이벤트 이름(ViewContent, InitiateCheckout, Lead, BookTileClick, PromptCopy 등)은 모든 책이 같이 쓴다. 이름을 바꾸면 광고 측정이 끊긴다.
- 외부에서 불러오는 것은 jsDelivr(Pretendard)와 Google Fonts까지만 쓴다.
