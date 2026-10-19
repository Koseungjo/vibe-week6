# 승조의 시작페이지 · URL2QR · QRnShort

바이브코딩 6주차 GitHub Pages 과제용 정적 웹사이트입니다.

## 페이지

- 시작 홈페이지: https://koseungjo.github.io/vibe-week6/
- QRnShort: https://koseungjo.github.io/vibe-week6/qrnshort/
- URL2QR: https://koseungjo.github.io/vibe-week6/url2qr/

시작 홈페이지에는 Google 검색, 즐겨찾기, 오늘의 한 가지 저장 기능이 있습니다. 오늘의 기록은 현재 브라우저에만 저장됩니다.

URL2QR은 입력한 웹 주소의 QR 코드를 브라우저에서 생성합니다. QRnShort는 공개 단축 URL을 만들고 해당 단축 URL을 QR 코드로 변환합니다. 두 도구는 메뉴와 이동 링크로 연결됩니다.

## 실행 및 배포

빌드나 패키지 설치가 필요하지 않습니다.

```sh
python3 -m http.server 8766
```

GitHub Pages는 `main` 브랜치의 `/`에서 배포합니다. `.nojekyll`을 포함하므로 정적 파일이 그대로 제공됩니다. 모든 내부 경로는 프로젝트 하위 경로에서도 동작하는 상대 경로입니다.

## 외부 서비스와 라이선스

- 단축 URL: [is.gd API](https://is.gd/apishorteningreference.php). 사용자가 변환을 요청하면 입력한 URL을 is.gd로 전달합니다. 서비스의 응답과 이용 제한에 따라 단축이 일시적으로 실패할 수 있으며 화면에 실패 상태를 표시합니다.
- QR 생성: 로컬에 포함한 [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), MIT 라이선스. 라이선스 전문은 `assets/vendor/LICENSE-qrcode-generator.txt`에 있습니다.
- QR 생성에는 서버, 로그인, API 키가 필요하지 않습니다.

제출 PDF와 학번 등 제출자 정보는 이 공개 저장소에 포함하지 않습니다.
