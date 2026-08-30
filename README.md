# 큐피돈 아이폰 스냅 계약서 자동화

큐피돈 스냅 예약 문의 → 견적 → 계약서 서명까지 원스톱 처리하는 정적 웹앱.

## 특징

- 링크 하나로 고객이 스스로 상담 폼 작성 → 견적 자동 계산 → 서명 → 계약 완료
- 계약서 PDF 자동 다운로드 + 사장님 이메일 자동 발송
- 상품 4종 (스페셜/프리미엄/스튜디오/돌스냅), 할인 5종, 옵션·출장비 자동 반영
- 서버 불필요, 무료 배포 (GitHub Pages)

## 로컬 실행

브라우저에서 `index.html`을 직접 열면 됩니다.
(테스트: `tests/test-runner.html` 열기)

## 배포 (GitHub Pages)

1. GitHub에 새 리포지토리 생성 (예: `cupidon-contract`, Public)
2. 이 폴더에서:
   ```bash
   git remote add origin https://github.com/<사용자명>/cupidon-contract.git
   git push -u origin main
   ```
3. GitHub 웹에서 **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` / root
   - Save
4. 몇 분 후 `https://<사용자명>.github.io/cupidon-contract/`가 활성화됨
5. 이 URL을 카카오톡 문의에 붙여 전달

## EmailJS 세팅 (사장님 이메일 자동 발송)

1. https://www.emailjs.com/ 가입 (무료 200건/월)
2. **Email Services** → Add New Service → Gmail 연결 (OAuth)
   - 생성된 Service ID 복사
3. **Email Templates** → Create New Template:
   - Subject: `[큐피돈 계약] {{customer_name}} - {{product}}`
   - Content (아래 참고):
     ```
     신규 계약이 접수되었습니다.

     고객: {{customer_name}} ({{customer_phone}})
     상품: {{product}}
     행사: {{event_date}} / {{venue}} ({{region}})

     옵션: {{options}}
     즉시할인: {{immediate_discounts}}
     후기약속: {{promise_discounts}}
     짝꿍코드: {{partner_code}}

     총액: {{total_price}}원 (견적: {{is_quote_final}})
     계약금: {{deposit}}원
     잔금: {{balance}}원
     후기 반영 시 잔금: {{balance_after_reviews}}원

     ---
     첨부된 서명 PDF 확인 부탁드립니다.
     ```
   - **Attachments** 섹션에서:
     - Filename: `{{pdf_filename}}`
     - Content: `{{pdf_attachment}}` (Base64 선택)
   - To Email: `{{to_email}}` (또는 사장님 이메일 직접 입력)
   - 저장 → Template ID 복사
4. **Integration** → Public Key 복사
5. `js/config.js` 하단 `EMAILJS_CONFIG` 값 교체:
   ```javascript
   export const EMAILJS_CONFIG = {
     publicKey: '<복사한 Public Key>',
     serviceId: '<복사한 Service ID>',
     templateId: '<복사한 Template ID>',
     toEmail: 'chaejin.park@myrealtrip.com',
   };
   ```
6. 커밋 & 푸시 → GitHub Pages 자동 재배포

## 가격/옵션 변경 방법

- `js/config.js`만 수정 → 커밋 → 푸시 → 즉시 반영
- 계약서 문구 변경: `js/templates.js` 수정
- 계좌·카톡 정보 변경: `js/config.js`의 `OWNER_INFO` 수정

## 파일 구조

```
├── index.html          # 진입점 (SPA)
├── css/style.css
├── js/
│   ├── config.js       # 상품·할인·옵션 상수
│   ├── pricing.js      # 금액 계산 (순수 함수)
│   ├── validators.js   # 스텝별 유효성 검사
│   ├── templates.js    # 계약서 HTML 템플릿
│   ├── form.js         # 폼 UI 및 상태 관리
│   ├── pdf.js          # PDF 생성
│   ├── email.js        # 이메일 발송
│   └── app.js          # 진입점
└── tests/
    ├── test-runner.html
    ├── test-pricing.js
    └── test-validators.js
```

## 라이선스

Private / 큐피돈 스냅 전용.
