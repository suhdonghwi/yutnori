# 윷놀이

Vite, React, Three.js, React Three Fiber로 만든 로컬 2인용 3D 윷놀이입니다.

## 개발 실행

Node.js 22 이상이 필요합니다.

```bash
pnpm install
pnpm dev
```

브라우저에서 `http://127.0.0.1:5174`를 열면 됩니다. 파일을 수정하면 Vite가 바로 반영합니다.

## 정적 빌드

```bash
pnpm build
```

빌드 결과는 `dist/`에 생성됩니다. 프로덕션 빌드는 `https://jammy.fun/yut/`에 배포되도록 `/yut/` 자산 경로를 사용합니다.

로컬에서 빌드 결과를 확인하려면 다음 명령을 사용합니다.

```bash
pnpm preview
```

`dist/index.html`을 `file://`로 직접 여는 방식은 브라우저의 ES 모듈 보안 제한 때문에 권장하지 않습니다. 별도 서버 기능은 필요 없지만, 확인할 때는 `pnpm preview` 또는 간단한 정적 파일 서버를 사용하세요.

## 컨테이너 배포

프로덕션 web 컨테이너는 루트와 `/yut`을 `/yut/`으로 canonicalize하고 `/yut/`에서 정적 클라이언트를 제공합니다. 향후 multiplayer API routing도 이 application-owned Caddy가 담당합니다. 공개 포트는 컨테이너에서 직접 열지 않으며 독립 게이트웨이는 도메인만 보고 `yutnori_edge` 네트워크의 `yutnori-web:80`으로 모든 요청을 전달합니다.

```bash
docker build -t yutnori:local .
YUTNORI_IMAGE=yutnori:local docker compose up -d --wait
```

## 확인 명령

```bash
pnpm typecheck
pnpm test
```
