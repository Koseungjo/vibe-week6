/* Local QR generation: qrcode-generator 1.4.4 (MIT), vendored in assets/vendor.
 * Public short links: https://da.gd/help/ (CORS-enabled /s endpoint).
 * No keys, local redirect mappings, or user URL history are stored. */
(() => {
  'use strict';
  const shortMode = document.body.dataset.tool === 'short';
  const byId = id => document.getElementById(id);
  const form = byId('tool-form');
  const input = byId('url-input');
  const submit = byId('generate-button');
  const label = byId('generate-label');
  const status = byId('status');
  const result = byId('result');
  const empty = byId('empty-state');
  const canvas = byId('qr-canvas');
  const outputLink = byId('result-url');
  const tag = byId('output-tag');
  const initialStatus = status.textContent;
  const initialFootnote = byId('result-footnote').textContent;
  const initialLabel = label.textContent;
  const cache = new Map();
  let busy = false;
  let revision = 0;
  let outputUrl = '';
  let cancelRequest = null;
  let retryAfter = 0;
  let generatedShort = false;

  function announce(message, kind = '') {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function syncGenerateState() {
    submit.disabled = busy || !input.value.trim();
    submit.dataset.busy = String(busy);
  }

  function setBusy(value) {
    busy = value;
    syncGenerateState();
    byId('example-button').disabled = value;
    input.readOnly = value;
    label.textContent = value ? '단축 링크를 만들고 있어요…' : initialLabel;
    byId('output-panel').setAttribute('aria-busy', String(value));
  }

  function normalizeUrl(raw) {
    const value = raw.trim();
    if (!value) throw new Error('변환할 웹 주소를 먼저 입력해 주세요.');
    if (!/^https?:\/\//i.test(value)) throw new Error('https:// 또는 http://로 시작하는 웹 주소를 입력해 주세요.');
    if (/\s/.test(value)) throw new Error('웹 주소에 공백이 있어요. 공백을 제거하고 다시 입력해 주세요.');
    let url;
    try { url = new URL(value); } catch { throw new Error('웹 주소 형식을 확인해 주세요. 예: https://example.com'); }
    if (!url.hostname || url.username || url.password) throw new Error('로그인 정보가 포함되지 않은 올바른 웹 주소를 입력해 주세요.');
    if (url.href.length > 2000) throw new Error('주소가 너무 길어요. 2,000자 이내의 웹 주소를 입력해 주세요.');
    return url.href;
  }

  function drawQr(value) {
    if (typeof window.qrcode !== 'function') throw new Error('QR 생성 파일을 불러오지 못했어요. 페이지를 새로고침해 주세요.');
    const qr = window.qrcode(0, 'M');
    qr.addData(value, 'Byte');
    qr.make();
    const modules = qr.getModuleCount();
    const quietZone = 4;
    const scale = Math.max(4, Math.floor(900 / (modules + quietZone * 2)));
    const size = (modules + quietZone * 2) * scale;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이 브라우저에서 QR 이미지를 생성할 수 없어요. 다른 브라우저를 사용해 주세요.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#193a34';
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        if (qr.isDark(row, col)) ctx.fillRect((col + quietZone) * scale, (row + quietZone) * scale, scale, scale);
      }
    }
    canvas.setAttribute('aria-label', `${value}에 연결되는 QR 코드`);
  }

  function showResult(original, shared, isShort, fallback = false) {
    drawQr(shared);
    outputUrl = shared;
    generatedShort = isShort;
    outputLink.href = shared;
    outputLink.textContent = shared;
    outputLink.dataset.mode = isShort ? 'short' : 'qr';
    outputLink.setAttribute('aria-label', `${isShort ? '단축 URL' : '원본 URL'} 새 탭에서 열기: ${shared}`);
    byId('result-kicker').textContent = isShort ? 'YOUR SHORT LINK' : fallback ? 'ORIGINAL LINK · QR ONLY' : 'YOUR ORIGINAL LINK';
    byId('original-url').textContent = isShort ? `원본: ${original}` : 'QR을 스캔하면 위의 원본 주소로 이동합니다.';
    byId('qr-caption').textContent = isShort ? '단축 링크로 연결되는 QR' : '원본 링크로 연결되는 QR';
    byId('retry-button').hidden = !fallback;
    byId('result-footnote').textContent = fallback ? '단축 URL 생성에 실패했어요. 현재 QR은 원본 URL에 연결됩니다.' : isShort ? '새로 만든 단축 링크는 da.gd의 연결 확인 화면을 거칠 수 있어요.' : '완료! QR 이미지를 저장하거나 원본 링크를 복사하세요.';
    tag.textContent = fallback ? 'QR ONLY' : 'READY TO SHARE';
    tag.dataset.ready = 'true';
    empty.hidden = true;
    result.hidden = false;
  }

  async function shortenUrl(url) {
    const controller = new AbortController();
    const cancelThisRequest = () => controller.abort();
    cancelRequest = cancelThisRequest;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);
    try {
      const api = new URL('https://da.gd/s');
      api.searchParams.set('url', url);
      const response = await fetch(api.href, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        headers: { Accept: 'text/plain' },
        signal: controller.signal
      });
      if (response.status === 429) {
        const header = response.headers.get('Retry-After');
        let waitMs = 60000;
        if (header) {
          const seconds = Number(header);
          const date = Date.parse(header);
          if (Number.isFinite(seconds) && seconds >= 0) waitMs = seconds * 1000;
          else if (Number.isFinite(date)) waitMs = Math.max(0, date - Date.now());
        }
        retryAfter = Date.now() + waitMs;
        throw new Error(`단축 서비스의 요청 한도에 도달했어요. ${Math.ceil(waitMs / 1000)}초 후 다시 시도해 주세요.`);
      }
      if ([400, 403, 422].includes(response.status)) throw new Error('단축 서비스가 이 주소를 처리하지 못했어요. 공개된 웹 주소인지 확인해 주세요.');
      if (!response.ok) throw new Error('단축 서비스가 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.');
      const text = (await response.text()).trim();
      let short;
      try { short = new URL(text); } catch { throw new Error('단축 서비스에서 올바른 링크를 받지 못했어요. 잠시 후 다시 시도해 주세요.'); }
      if (!['http:', 'https:'].includes(short.protocol) || short.hostname !== 'da.gd' || short.username || short.password || short.pathname === '/') {
        throw new Error('단축 서비스에서 올바른 링크를 받지 못했어요.');
      }
      short.protocol = 'https:';
      return short.href;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(timedOut ? '단축 서비스 응답 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.' : 'cancelled');
      }
      if (error instanceof TypeError) throw new Error('단축 서비스에 연결하지 못했어요. 인터넷 연결을 확인한 후 다시 시도해 주세요.');
      throw error;
    } finally {
      clearTimeout(timeout);
      // A reset may already have started another request. Only clear ours.
      if (cancelRequest === cancelThisRequest) cancelRequest = null;
    }
  }

  async function generate(event) {
    if (event) event.preventDefault();
    if (busy) return;
    let original;
    try {
      original = normalizeUrl(input.value);
      input.setAttribute('aria-invalid', 'false');
    } catch (error) {
      input.setAttribute('aria-invalid', 'true');
      announce(error.message, 'error');
      input.focus();
      return;
    }
    input.value = original;
    const current = ++revision;
    if (!shortMode) {
      try {
        showResult(original, original, false);
        announce('QR 코드가 완성됐어요. QR을 누르면 JPG로, PNG 저장 버튼을 누르면 PNG로 저장돼요.', 'success');
      } catch (error) { announce(error.message || 'QR 생성에 실패했어요. 주소를 확인해 주세요.', 'error'); }
      return;
    }
    setBusy(true);
    announce('단축 링크를 생성하고 있어요. 잠시만 기다려 주세요.', 'loading');
    try {
      let short = cache.get(original);
      if (!short) {
        if (Date.now() < retryAfter) throw new Error(`요청 한도에 도달했어요. ${Math.ceil((retryAfter - Date.now()) / 1000)}초 후 다시 시도해 주세요.`);
        short = await shortenUrl(original);
        cache.set(original, short);
      }
      if (revision !== current) return;
      showResult(original, short, true);
      announce('단축 URL과 QR 코드가 완성됐어요. 링크를 눌러 연결을 확인할 수 있어요.', 'success');
    } catch (error) {
      if (revision !== current) return;
      try {
        showResult(original, original, false, true);
        announce(`${error.message} 원본 URL의 QR 코드는 사용할 수 있어요.`, 'error');
      } catch (qrError) { announce(qrError.message || 'QR 생성에 실패했어요. 주소를 확인해 주세요.', 'error'); }
    } finally {
      if (revision === current) setBusy(false);
    }
  }

  form.addEventListener('submit', generate);
  byId('retry-button').addEventListener('click', generate);
  byId('example-button').addEventListener('click', () => {
    input.value = 'https://koseungjo.github.io/vibe-week6/';
    syncGenerateState();
    input.setAttribute('aria-invalid', 'false');
    announce('예시 주소를 넣었어요. 만들기 버튼을 눌러 변환해 보세요.');
    input.focus();
  });
  input.addEventListener('input', () => {
    syncGenerateState();
    input.setAttribute('aria-invalid', 'false');
    if (!busy) announce(result.hidden ? initialStatus : '주소를 변경했어요. 만들기 버튼을 누르면 결과가 갱신됩니다.');
  });
  byId('reset-button').addEventListener('click', () => {
    revision++;
    if (cancelRequest) cancelRequest();
    input.value = '';
    setBusy(false);
    input.setAttribute('aria-invalid', 'false');
    outputUrl = '';
    result.hidden = true;
    empty.hidden = false;
    tag.textContent = 'READY WHEN YOU ARE';
    tag.dataset.ready = 'false';
    byId('result-footnote').textContent = initialFootnote;
    byId('retry-button').hidden = true;
    announce(initialStatus);
    input.focus();
  });
  byId('copy-button').addEventListener('click', async () => {
    if (!outputUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(outputUrl);
      } else {
        const helper = document.createElement('textarea');
        helper.value = outputUrl;
        helper.style.cssText = 'position:fixed;left:-10000px;top:0;';
        document.body.append(helper);
        helper.select();
        const copied = document.execCommand('copy');
        helper.remove();
        if (!copied) throw new Error('clipboard unavailable');
      }
      announce(`${generatedShort ? '단축' : '원본'} 링크를 복사했어요. 원하는 곳에 붙여넣으세요.`, 'success');
    } catch {
      announce('자동 복사를 사용할 수 없어요. 결과의 링크를 길게 누르거나 마우스 오른쪽 버튼으로 복사해 주세요.', 'error');
    }
  });
  function downloadQr(format) {
    if (!outputUrl) return;
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const filename = `${generatedShort ? 'qrnshort' : 'url2qr'}-qr.${format}`;
    canvas.toBlob(blob => {
      if (!blob || blob.type !== mimeType) {
        announce(`${format.toUpperCase()} 이미지를 저장하지 못했어요. 다른 저장 형식을 사용해 주세요.`, 'error');
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = blobUrl;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      announce(`${format.toUpperCase()} QR 이미지 저장을 시작했어요. 다운로드 폴더를 확인해 주세요.`, 'success');
    }, mimeType, format === 'jpg' ? 0.95 : undefined);
  }
  byId('download-button').addEventListener('click', () => downloadQr('png'));
  byId('qr-download-button').addEventListener('click', () => downloadQr('jpg'));

  // Carry the user's original address between the two tools, without
  // performing a third-party request until they explicitly press Generate.
  const otherToolPath = shortMode ? '../url2qr/' : '../qrnshort/';
  document.querySelectorAll(`a[href="${otherToolPath}"]`).forEach(link => {
    link.addEventListener('click', () => {
      try {
        link.href = `${otherToolPath}?url=${encodeURIComponent(normalizeUrl(input.value))}`;
      } catch {
        link.href = otherToolPath;
      }
    });
  });
  const incomingUrl = new URL(window.location.href).searchParams.get('url');
  if (incomingUrl) {
    try {
      input.value = normalizeUrl(incomingUrl);
      announce(`${shortMode ? 'URL2QR' : 'QRnShort'}에서 가져온 주소예요. 만들기 버튼을 눌러 변환해 보세요.`);
    } catch {
      announce('전달된 주소의 형식을 확인할 수 없어요. 웹 주소를 직접 입력해 주세요.', 'error');
    }
  }
  syncGenerateState();
})();
