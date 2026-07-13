---
title: "Port 반환 타입 — 읽기는 도메인, 쓰기는 void"
date: 2026-07-13T00:01:00+09:00
tags: ["OOP", "레이어드 아키텍처", "헥사고날", "Port Adapter", "CQS", "Kotlin", "백엔드"]
categories: ["객체지향"]
---

# Port 반환 타입 — 읽기는 도메인, 쓰기는 void

---

> 💡 **한 줄 요약**: Port의 읽기(Query) 메서드는 도메인 엔티티를 반환하고, 쓰기(Command) 메서드는 `void` 또는 `int`(affected rows)만 반환한다. 읽기는 **돌려받는 게 목적**이고, 쓰기는 **상태 변경이 목적**이니까.

> 📎 Port를 어떻게 이름 지을지는 [Port 네이밍 — JPA Hibernate Naming Convention을 도메인 Port에 쓰지 마라](/post/port-naming-domain-language/)에서 다뤘다. 이 글은 그 Port가 **무엇을 반환할지**를 다룬다.

---

## 핵심 규칙

| 구분 | 예시 | 반환 타입 | 이유 |
| --- | --- | --- | --- |
| Query (읽기) | `findById`, `findByUserId`, `findAll` | 도메인 / `List<도메인>` / `Optional<도메인>` | 데이터를 가져오는 게 목적 — 반환 없으면 의미 없음 |
| Command (쓰기) | `insert`, `update*`, `delete*` | `Unit`(void) 또는 `Int` (affected rows) | 상태 변경이 목적 — 돌려받을 게 없음 |

---

## 왜 비대칭인가

### 읽기 — "뭔가 돌려받는 게 당연"

```kotlin
fun findById(id: String): ChatSession            // 찾아서 돌려달라
fun findByUserId(id: String): List<ChatSession>  // 목록을 돌려달라
```

- 목적 자체가 **데이터 획득**
- 반환 없으면 조회한 의미 자체가 사라짐

### 쓰기 — "요청만 하고 반환은 덜"

```kotlin
fun insert(session: ChatSession)              // 저장해 달라
fun updatePinned(id: String, yn: String)      // 업데이트해 달라
fun softDelete(id: String)                    // 삭제해 달라
```

- 목적은 **상태 변경**. 이미 바꿀 값을 알고 요청하는 것
- 굳이 엔티티를 돌려받으려면 SELECT 한 번 더 필요 → 낭비
- 관례적으로 `Int`(affected rows) 또는 `Unit`만 반환

---

## 실제 적용 — ChatSessionPort

```kotlin
interface ChatSessionPort {
    // 쓰기 — Unit(void) 반환
    fun insert(vo: ChatSession)
    fun updateTitle(chtngSeonId: String, seonTtl: String)
    fun updatePinned(chtngSeonId: String, fixgYn: String)
    fun softDelete(chtngSeonId: String)

    // 읽기 — 도메인 엔티티 반환
    fun findById(chtngSeonId: String): ChatSession
    fun findByUserId(userId: String): List<ChatSession>
    fun findByUserIdAndSvcType(userId: String, chtngType: String): List<ChatSession>
}
```

쓰기 4개 + 읽기 3개. 구분이 명확하고 모두 규칙을 따른다.

---

## 헷갈리기 쉬운 지점 — 말마디 구분이 중요

| 문장 | 맞나? | 정확한 표현 |
| --- | --- | --- |
| "Port는 도메인을 반환하면 안 된다" | ❌ 틀림 | 읽기는 도메인 반환이 정석 |
| "Port의 **쓰기 메서드는** 도메인을 반환하면 안 된다" | ✅ 맞음 | `Unit`/`Int`만 반환 |
| "Port가 DB-스러운 타입(ResultSet이나 Map)을 반환" | ❌ 틀림 | 도메인을 반환해야 함. 인프라 세부사항이 Application으로 새면 안 됨 |

"Port는 도메인을 반환하면 안 된다"는 흔한 오해다. 핵심은 **읽기냐 쓰기냐**지, 도메인 반환 자체가 아니다.

---

## updatePinned가 ChatSession을 반환하면 안 되는 이유

쓰기 메서드에서 도메인을 반환하려면, 구현 방법 2가지가 **모두** 문제가 있다.

### ① DB에서 다시 SELECT

```sql
UPDATE chat_session SET fixg_yn = ? WHERE chtng_seon_id = ?;
SELECT * FROM chat_session WHERE chtng_seon_id = ?;  -- 추가 쿼리
```

- 쿼리 2번 발생 → 성능 낭비
- 이미 Java에서 새 값을 아는데 굳이 DB에서 다시 조회할 이유 없음

### ② Java에서 조립해서 반환

```kotlin
fun updatePinned(id: String, fixgYn: String): ChatSession {
    commonDAO.update(...)
    return ChatSession(..., fixgYn, ...)  // 조립
}
```

- 도메인 객체 조립은 **Application/Domain의 일** — Port가 하면 책임 경계 위반
- MyBatis/JPA 관례와 충돌 (`update`가 엔티티 반환하는 건 이례적)

---

## CQS 원칙과의 연결

이 규칙은 Bertrand Meyer의 **Command-Query Separation(CQS)** 원칙의 구현체다.

- **Command** = 상태를 바꾸는 메서드. 리턴값 없음 (`Unit`/void)
- **Query** = 상태를 조회하는 메서드. 부작용 없이 값을 반환

이 원칙을 조금 완화해서 — 쓰기 상태 반영이 필요한 경우 `Int`(affected rows) 정도는 허용 — Port에 적용한 게 지금의 규칙이다.

CQS가 **메서드 레벨**이라면, CQRS는 **아키텍처 레벨** 확장이라고 보면 된다. Port가 반환 타입으로 읽기/쓰기 구분을 드러내는 것은 CQS의 자연스러운 적용이다.

---

> ✅ **기억할 것**: 키는 "Port가 도메인을 반환하느냐"가 아니라 "읽기냐 쓰기냐"다. 읽기(`find*`)는 도메인 반환이 정석, 쓰기(`insert`/`update`/`delete`)는 `Unit` 또는 `Int`가 정석. 이게 CQS 원칙의 Port 레벨 구현체다.
