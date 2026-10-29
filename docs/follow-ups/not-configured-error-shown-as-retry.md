# 서버에 API 키가 없는 오류가 "다시 시도" 안내로 보인다

**Symptom**: `GEMINI_API_KEY`가 없으면 서버는 500 `not_configured`를 돌려주지만, 화면에는 일반 실패 문구("다시 시도해 주세요")만 나온다.

**Observed evidence**: `.env.local` 없이 `bun run dev`로 띄우고 작성하기를 눌렀을 때 `POST /api/learning-notes`가 `{"error":{"code":"not_configured"}}`를 돌려줬고, 화면 문구는 일반 실패 문구였다(로컬 개발 서버).

**Suspected cause**: `requestNotes`가 `rate_limited` 외 모든 코드를 같은 문구로 바꾼다.

**What was tried**: 수정하지 않았다. 스펙 수용 기준 10은 이유를 알리라고만 하며, 키 누락은 배포 때 한 번 잡히는 설정 오류다.

**Proposed next step**: `not_configured`일 때 "서비스 설정이 끝나지 않았습니다. 관리자에게 알려 주세요" 문구를 보이고 테스트를 추가한다.
