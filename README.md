# 큐피돈 아이폰 스냅 계약서 자동화

큐피돈 스냅 예약 문의 → 견적 → 계약서 서명까지 원스톱 처리하는 정적 웹앱.

## 특징

- 링크 하나로 고객이 스스로 상담 폼 작성 → 견적 자동 계산 → 서명 → 계약 완료
- 계약서 PDF 자동 다운로드 + **카카오톡 채널로 사장님께 바로 전달**
- 상품 4종 (스페셜/프리미엄/스튜디오/돌스냅), 할인 5종, 옵션·출장비 자동 반영
- 서버 불필요, 무료 배포 (GitHub Pages)
- **복잡한 세팅 없음** — 계좌번호와 카카오톡 채널 URL만 입력하면 끝

---

## 🚀 세팅 (딱 2가지만!)

`js/config.js` 파일을 열어서 아래 두 부분만 실제 정보로 교체하시면 됩니다.

### 1. 계좌·카카오톡 정보 입력

`js/config.js` 파일에서 `OWNER_INFO` 부분을 찾아 아래 값들을 채워주세요:

```javascript
export const OWNER_INFO = {
  bankName: '카카오뱅크',                                    // ← 실제 은행명
  bankAccount: '3333-01-1234567',                             // ← 실제 계좌번호
  accountHolder: '큐피돈 스냅',                                // 예금주
  kakaoChannelUrl: 'https://pf.kakao.com/_abcdef',             // ← 카카오톡 채널 홈 URL
  kakaoDisplayName: '큐피돈 스냅 카카오톡',                     // 화면 표시명
};
```

**카카오톡 채널 URL 찾는 법:**
- 카카오톡 채널 관리자(https://center-pf.kakao.com) 접속
- 관리하는 채널 선택 → 좌측 "관리" → "관리자 채널 관리" → "채널 홈 URL" 복사
- 형태: `https://pf.kakao.com/_XXXXXX`
- 오픈채팅 또는 오픈프로필 URL로 대체 가능 (`https://open.kakao.com/o/XXX`)

**2. GitHub Pages 배포 (아래 절차)**

이것만 하시면 됩니다. 다른 세팅(EmailJS 등) 필요 없습니다.

---

## 로컬 실행 (테스트용)

브라우저에서 `index.html`을 직접 열면 됩니다.
자동 테스트 실행: `tests/test-runner.html` 열기 (17개 테스트가 자동 실행)

---

## 배포 (GitHub Pages, 무료)

1. GitHub 웹에서 새 리포지토리 생성 (예: `cupidon-contract`, **Public**으로)
2. 이 폴더에서 터미널로:
   ```bash
   git remote add origin https://github.com/<본인아이디>/cupidon-contract.git
   git push -u origin main
   ```
3. GitHub 리포지토리 페이지 → **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` / `/root`
   - Save
4. 몇 분 후 `https://<본인아이디>.github.io/cupidon-contract/` 활성화
5. 이 URL을 카카오톡 문의에 복사해서 보내주시면 됩니다.

---

## 사용 흐름

1. 고객이 카톡으로 문의 → 사장님이 배포된 URL 전달
2. 고객이 링크 클릭 → 8단계 폼 진행 (기본정보 → 행사정보 → 상품 → 옵션 → 할인 → 견적 → 서명)
3. 서명 완료 → **PDF 자동 다운로드** + "카카오톡으로 계약서 보내기" 버튼 표시
4. 고객이 버튼 클릭 → 카톡 채널이 열림 → 방금 다운로드된 PDF를 채팅창에 첨부 전송
5. 사장님은 카톡 채널에서 서명 완료 PDF 수신 → 계약금 100,000원 입금 확인 → 예약 확정

---

## 가격/옵션 변경 방법

- **가격/할인/옵션 변경:** `js/config.js`만 수정 → 커밋 → 푸시 → 즉시 반영
- **계약서 문구 변경:** `js/templates.js` 수정
- **계좌·카톡 정보 변경:** `js/config.js`의 `OWNER_INFO` 수정

---

## 파일 구조

```
├── index.html          # 진입점 (SPA)
├── css/style.css
├── js/
│   ├── config.js       # 상품·할인·옵션 상수 (⭐ 여기만 수정하면 됨)
│   ├── pricing.js      # 견적 계산 (순수 함수)
│   ├── validators.js   # 스텝별 유효성 검사
│   ├── templates.js    # 계약서 HTML 템플릿
│   ├── form.js         # 폼 UI 및 상태 관리
│   ├── pdf.js          # PDF 생성 (html2canvas + jsPDF)
│   └── app.js          # 진입점
└── tests/
    ├── test-runner.html
    ├── test-pricing.js  (7개 테스트)
    └── test-validators.js  (10개 테스트)
```

---

## 라이선스

Private / 큐피돈 스냅 전용.
