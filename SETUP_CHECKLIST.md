# EatsRun API 로컬 실행 체크리스트

## 사전 준비사항

### 1. Node.js 버전 확인
```bash
node --version
# Node.js 18 이상 필요
```

### 2. PostgreSQL 설치 및 실행 확인
```bash
# PostgreSQL이 설치되어 있고 실행 중인지 확인
# Windows: 서비스 관리자에서 PostgreSQL 서비스 확인
# 또는 psql 명령어로 확인
psql --version
```

### 3. PostgreSQL 데이터베이스 생성
```bash
# PostgreSQL에 접속하여 데이터베이스 생성
psql -U postgres

# PostgreSQL 콘솔에서:
CREATE DATABASE eatsrun;
\q
```

---

## 실행 순서

### Step 1: 프로젝트 디렉토리 이동
```bash
cd eatsrun-api
```

### Step 2: 의존성 설치
```bash
npm install
```

### Step 3: 환경 변수 파일 생성
```bash
# .env.example을 복사하여 .env 파일 생성
cp .env.example .env

# Windows PowerShell의 경우:
Copy-Item .env.example .env
```

**⚠️ 중요:** `.env` 파일을 열어서 다음 항목을 실제 값으로 수정:
- `DATABASE_URL`: PostgreSQL 연결 정보 (사용자명, 비밀번호, 호스트, 포트, 데이터베이스명)
- `JWT_SECRET`: 강력한 시크릿 키로 변경
- `JWT_REFRESH_SECRET`: 강력한 시크릿 키로 변경

### Step 4: Prisma 클라이언트 생성
```bash
npm run db:generate
```

### Step 5: 데이터베이스 스키마 적용
```bash
# 방법 1: db:push (마이그레이션 파일 없이 스키마 직접 적용 - 개발용)
npm run db:push

# 또는 방법 2: db:migrate (마이그레이션 파일 생성 및 적용 - 프로덕션 권장)
npm run db:migrate
```

### Step 6: 시드 데이터 삽입 (선택사항)
```bash
npm run db:seed
```

**시드 데이터 내용:**
- 관리자 계정: `admin@eatsrun.kr` / `admin1234`
- 상점 계정: `makguksu@store.com` / `store1234` 등
- 테스트 행사, 상점, 포스트, 쿠폰 템플릿 등

### Step 7: 개발 서버 실행
```bash
npm run dev
```

**서버 실행 확인:**
- 서버가 `http://localhost:3000`에서 실행됩니다
- Health Check: `http://localhost:3000/health`
- API Base: `http://localhost:3000/v1`

---

## 실행 순서 요약 (명령어 블록)

```bash
# 1. 프로젝트 디렉토리 이동
cd eatsrun-api

# 2. 의존성 설치
npm install

# 3. 환경 변수 파일 생성 (Windows PowerShell)
Copy-Item .env.example .env
# 또는 수동으로 .env 파일 생성 후 .env.example 내용 복사

# 4. .env 파일 수정 (에디터로 열어서 DATABASE_URL, JWT_SECRET 등 수정)

# 5. Prisma 클라이언트 생성
npm run db:generate

# 6. 데이터베이스 스키마 적용
npm run db:push

# 7. 시드 데이터 삽입 (선택사항)
npm run db:seed

# 8. 개발 서버 실행
npm run dev
```

---

## 문제 해결

### PostgreSQL 연결 오류
- PostgreSQL 서비스가 실행 중인지 확인
- `.env` 파일의 `DATABASE_URL` 형식 확인
- 데이터베이스 `eatsrun`이 생성되었는지 확인
- 사용자 권한 확인

### 포트 충돌
- 다른 애플리케이션이 3000번 포트를 사용 중인 경우
- `.env` 파일에서 `PORT=3001` 등으로 변경

### Prisma 오류
```bash
# Prisma 클라이언트 재생성
npm run db:generate

# 데이터베이스 스키마 재적용
npm run db:push
```

### TypeScript 컴파일 오류
```bash
# 타입 체크만 실행
npx tsc --noEmit
```

---

## 유용한 명령어

### Prisma Studio (데이터베이스 GUI)
```bash
npm run db:studio
# 브라우저에서 http://localhost:5555 열림
```

### 프로덕션 빌드
```bash
npm run build
npm start
```











