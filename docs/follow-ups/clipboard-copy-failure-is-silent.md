# 클립보드 복사가 실패해도 화면에 아무 안내가 없다

**Symptom**: 복사 버튼을 눌렀을 때 클립보드 쓰기가 거부되면 "복사했습니다"도 오류도 나오지 않는다.

**Observed evidence**: `features/learning-notes/learning-notes-form.tsx`의 `copy()`가 `navigator.clipboard.writeText`의 거부를 잡지 않는다. 코드 리뷰(low)에서 발견했고, 실제로 거부를 재현하지는 않았다.

**Suspected cause**: 권한 거부나 비보안 컨텍스트(https가 아닌 비 localhost)에서 writeText가 reject되는 것으로 추정한다.

**What was tried**: 수정하지 않았다. 스펙 수용 기준 7은 성공 경로만 정한다.

**Proposed next step**: `copy()`에서 reject를 잡아 "복사하지 못했습니다. 직접 선택해 복사해 주세요" 안내를 보이고, 실패 테스트를 추가한다.
