# 백엔드 API 실행 가이드

## 빠른 시작

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Database (개발용 SQLite 또는 PostgreSQL)
# SQLite 사용 (간단한 개발용)
DATABASE_URL="file:./dev.db"

# 또는 PostgreSQL 사용
# DATABASE_URL="postgresql://user:password@localhost:5432/eatsrun?schema=public"

# JWT
JWT_SECRET="eatsrun-dev-secret-key-2024"
JWT_REFRESH_SECRET="eatsrun-dev-refresh-secret-key-2024"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="*"
```

### 2. 데이터베이스 설정

#### SQLite 사용 (간단한 개발용)

1. `prisma/schema.prisma` 파일에서 datasource를 수정:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

2. Prisma 클라이언트 생성 및 마이그레이션:
```bash
npm run db:generate
npm run db:push
```

#### PostgreSQL 사용 (권장)

1. PostgreSQL 설치 및 데이터베이스 생성
2. `.env` 파일에 PostgreSQL 연결 정보 설정
3. 마이그레이션 실행:
```bash
npm run db:generate
npm run db:migrate
```

### 3. 시드 데이터 삽입 (선택사항)

```bash
npx ts-node prisma/seed.ts
```

### 4. 서버 실행

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 프로덕션 모드
npm run build
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

## API 엔드포인트 확인

서버가 실행되면 다음 엔드포인트로 확인할 수 있습니다:

- Health Check: `http://localhost:3000/health`
- API Base: `http://localhost:3000/v1`

## 문제 해결

### 데이터베이스 연결 오류

1. `.env` 파일의 `DATABASE_URL` 확인
2. PostgreSQL이 실행 중인지 확인
3. SQLite를 사용하는 경우 파일 권한 확인

### 포트 충돌

다른 포트를 사용하려면 `.env` 파일에서 `PORT` 변경:
```env
PORT=3001
```

### Prisma 오류

```bash
# Prisma 클라이언트 재생성
npm run db:generate

# 데이터베이스 스키마 재적용
npm run db:push
```

## 개발 팁

- Prisma Studio로 데이터베이스 확인: `npm run db:studio`
- 로그는 콘솔에 자동으로 출력됩니다
- 개발 모드에서는 자동으로 파일 변경 감지 및 재시작됩니다




