# English Master

Kho lưu trữ trung tâm cho ứng dụng **English Master**.

- Mã ứng dụng web/PWA: `app.js`, `index.html`, `styles.css`, `sw.js`
- Dữ liệu học: thư mục `data/` (từ vựng, câu, tam ngữ, giao tiếp, ngữ pháp, câu hỏi)
- Phiên bản ứng dụng: `app-version.json`
- Nhánh lưu trữ các bản phát hành thử nghiệm: `archive/vX.Y.Z`

Repo này được dùng làm nguồn lưu trữ và cập nhật dữ liệu cho English Master.

## V9.2.0
- Stability hardening for speech recognition, quiz input validation, and lifecycle progress persistence.

## V9.3.0
- Logic hardening for listening double-tap scoring, malformed practice/quiz input, and daily-goal history synchronization.

## Final QA gate — V9.3.0
- Full repository regression suite executed against the final V9.3.0 application commit.

## V9.3.1
- Fixed the Settings daily-goal selector to use the validated history-synchronizing setter.
- Hardened sentence-order practice against invalid and duplicate token indexes.
- Hardened progress imports against duplicate vocabulary states, out-of-range daily goals, and invalid review timestamps.

## Final QA gate — V9.3.1
- Full repository regression suite is required against the final V9.3.1 application commit.

## V9.3.2
- Memoized the large standalone-sentence and communication practice pools.
- Added bounded audio caching/preload, Audio element reuse, voice caching, and long-text TTS chunking.
- Improved speech recognition with one-shot timeout, up to three alternatives, clearer microphone errors, and order-aware transcript scoring.
- Polished desktop/mobile navigation, active-route state, touch/keyboard focus, responsive spacing, and reduced-motion behavior.

## Final QA gate — V9.3.2
- Full repository regression suite is required against the final V9.3.2 application commit.

## V9.3.3
- Fixed false-positive speech normalization for real words such as “were”, “well”, and “its”.
- Microphone cancellation now clears pending recognition timeouts immediately.
- Failed audio cache entries are evicted before fallback/retry.
- Voice selection now prefers exact language/region matches before broader fallbacks.
- Online content files download in parallel while validation and replacement remain atomic.
- Added accessibility feedback for the toast status region and regression tests for speech/audio edge cases.

## Final QA gate — V9.3.3
- Full repository regression suite is required against the final V9.3.3 application commit.
