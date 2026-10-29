# 복사한 뒤 글을 고쳐도 "복사했습니다"가 남는다

**Symptom**: 배움읽기나 배움지원 및 계획을 복사한 뒤 같은 칸을 수정해도 "복사했습니다" 표시가 그대로 남아, 고친 글이 복사된 것처럼 보인다.

**Observed evidence**: `features/learning-notes/learning-notes-form.tsx`에서 `copied` 상태는 새로 생성할 때와 복사할 때만 바뀌고, 칸의 `onChange`에서는 초기화되지 않는다. 코드 리뷰(low)에서 발견했고, 화면에서 재현하지는 않았다.

**Suspected cause**: 칸 수정 시 `copied`를 초기화하는 코드가 없다.

**What was tried**: 수정하지 않았다. 복사 자체는 항상 현재 칸의 글을 쓰므로 수용 기준 8은 깨지지 않는다.

**Proposed next step**: 칸의 `onChange`에서 해당 칸의 `copied`를 비우고, 수정 후 표시가 사라지는 테스트를 추가한다.
