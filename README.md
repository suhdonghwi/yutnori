# 한판 윷놀이

Vite, React, Three.js, React Three Fiber로 만든 로컬 2인용 3D 윷놀이입니다.

## 개발 실행

Node.js 22 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:5174`를 열면 됩니다. 파일을 수정하면 Vite가 바로 반영합니다.

## 정적 빌드

```bash
npm run build
```

빌드 결과는 `dist/`에 생성됩니다. 배포할 때는 `dist/` 폴더 안의 파일 전체를 정적 웹 호스팅에 올리면 됩니다. 하위 경로에서도 동작하도록 자산 경로가 상대 경로로 생성됩니다.

로컬에서 빌드 결과를 확인하려면 다음 명령을 사용합니다.

```bash
npm run preview
```

`dist/index.html`을 `file://`로 직접 여는 방식은 브라우저의 ES 모듈 보안 제한 때문에 권장하지 않습니다. 별도 서버 기능은 필요 없지만, 확인할 때는 `npm run preview` 또는 간단한 정적 파일 서버를 사용하세요.

## 확인 명령

```bash
npm run typecheck
npm test
```
