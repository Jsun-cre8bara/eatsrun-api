# 잇츠Run API Server

잇츠Run 지역 소비 촉진 플랫폼 백엔드 API 서버

## 기술 스택

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Authentication**: JWT

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일을 편집하여 실제 값 입력
```

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:push

# 시드 데이터 삽입
npx ts-node prisma/seed.ts
```

### 4. 개발 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

## API 엔드포인트

### 인증
- `POST /v1/auth/social` - 소셜 로그인 (카카오/네이버)
- `POST /v1/auth/refresh` - 토큰 갱신
- `POST /v1/auth/verify-runner` - 러너 본인 인증

### 사용자
- `GET /v1/users/me` - 내 정보 조회
- `PATCH /v1/users/me` - 내 정보 수정
- `PUT /v1/users/me/fcm-token` - FCM 토큰 등록

### 행사
- `GET /v1/events` - 행사 목록
- `GET /v1/events/:id` - 행사 상세
- `POST /v1/events/:id/join` - 행사 참여
- `GET /v1/events/:id/my-status` - 내 참여 현황
- `POST /v1/events/:id/finish` - 완주 인증

### 포스트
- `GET /v1/posts/:id` - 포스트 상세
- `POST /v1/posts/:id/visit` - 포스트 방문 (QR 스캔)
- `GET /v1/posts/nearby` - 근처 포스트

### 게임
- `POST /v1/games/:id/play` - 게임 플레이
- `POST /v1/games/:id/select-category` - 카테고리 선택 및 쿠폰 발급

### 쿠폰
- `GET /v1/coupons` - 내 쿠폰 목록
- `GET /v1/coupons/:id` - 쿠폰 상세
- `GET /v1/coupons/:id/qr` - 쿠폰 QR
- `POST /v1/coupons/validate` - [상점용] 쿠폰 검증
- `POST /v1/coupons/:id/use` - [상점용] 쿠폰 사용

### 스탬프/교환권
- `GET /v1/stamps/:eventId` - 스탬프 현황
- `GET /v1/stamps/:eventId/rewards` - 교환권 목록
- `POST /v1/stamps/rewards/:id/claim` - 교환권 획득
- `POST /v1/stamps/rewards/:id/redeem` - 교환권 사용

### 상점
- `POST /v1/merchants/register` - 상점 가입 신청
- `POST /v1/merchants/auth/login` - 상점주 로그인
- `GET /v1/merchants/me` - 내 상점 정보
- `GET /v1/merchants/me/dashboard` - 대시보드
- `GET /v1/merchants/me/coupons` - 쿠폰 사용 내역
- `GET /v1/merchants/me/settlements` - 정산 내역

### 어드민
- `POST /v1/admin/auth/login` - 어드민 로그인
- `GET /v1/admin/events` - 행사 관리
- `POST /v1/admin/events` - 행사 생성
- `GET /v1/admin/merchants` - 상점 관리
- `PATCH /v1/admin/merchants/:id/approve` - 상점 승인
- `GET /v1/admin/stats/overview` - 전체 통계

## 테스트 계정

```
Admin: admin@eatsrun.kr / admin1234
Merchant: makguksu@store.com / store1234
```

## 프로젝트 구조

```
eatsrun-api/
├── prisma/
│   ├── schema.prisma     # DB 스키마
│   └── seed.ts           # 시드 데이터
├── src/
│   ├── app.ts            # Express 앱 진입점
│   ├── routes/           # API 라우터
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── event.routes.ts
│   │   ├── post.routes.ts
│   │   ├── game.routes.ts
│   │   ├── coupon.routes.ts
│   │   ├── stamp.routes.ts
│   │   ├── merchant.routes.ts
│   │   └── admin.routes.ts
│   ├── services/         # 비즈니스 로직
│   ├── middlewares/      # 미들웨어
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validate.middleware.ts
│   └── utils/            # 유틸리티
│       ├── prisma.ts
│       ├── jwt.ts
│       ├── response.ts
│       └── errors.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 라이선스

MIT
