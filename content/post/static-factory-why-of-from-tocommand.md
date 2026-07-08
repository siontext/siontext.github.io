---
title: "정적 팩토리를 왜 쓰나 — of() · from() · toCommand()로 변환 캡슐화와 생성 책임 지키기"
date: 2026-07-08T00:01:00+09:00
tags: ["OOP", "정적 팩토리 메서드", "변환 캡슐화", "네이밍 컨벤션", "레이어드 아키텍처", "헥사고날", "Kotlin", "백엔드"]
categories: ["객체지향"]
---

# 정적 팩토리를 왜 쓰나 — of() · from() · toCommand()로 변환 캡슐화와 생성 책임 지키기

---

> 💡 **핵심**: `of()` · `from()` · `toCommand()` 세 패턴은 **변환 캡슐화**와 **객체 생성 책임을 본인에게 돌려주는 원칙**을 동시에 실현하는 정적 팩토리 스타일이다. 정적 팩토리는 *"외부 입력으로 새 객체를 만들 때"* 쓴다.

> 📎 이 글은 [of() vs from() — 기준은 방향이 아니라 파라미터 형태](/post/static-factory-of-vs-from/)의 심화편이다. **어떤 이름을 고를지**(of/from)는 그 글에서 다뤘고, 이번엔 **왜 정적 팩토리를 쓰는가**를 다룬다.

---

## ① 네이밍 기준 — of() vs from()

이름 선택 기준은 '방향'(어느 레이어가 호출하는가)이 아니라 **'파라미터 형태'**다. 받는 값이 낱개 원시값인지, 단일 객체인지를 보고 고른다.

- `of()` — 낱개 원시값 여러 개를 조합해 자신을 생성
- `from()` — 단일 객체(DTO · 도메인 · 응답 객체)로부터 자신을 변환 생성

```kotlin
// 낱개 원시값 → of()
SendMessageCommand.of(userId, sessionId, message)

// 단일 객체 → from()
SendMessageResult.from(session, response)
RagChatResponse.from(fabrixResponse)
```

---

## ② 왜 쓰나 — 변환 캡슐화

### 변환 캡슐화란?

레이어를 넘나드는 변환 로직을 호출부에 직접 쓰지 않고, Command · Result · DTO의 팩토리 메서드 안에 숨겨두는 것이다. 호출부는 **무엇을** 변환하는지만 알고, **어떻게** 변환하는지는 모른다.

```kotlin
// 호출부 — 변환 방법을 몰라도 됨
val command = SendMessageCommand.of(dto.userId, dto.sessionId, dto.message)

// SendMessageCommand 내부 — 변환 방법이 여기에만 있음
companion object {
    fun of(userId: String, sessionId: String, message: String): SendMessageCommand {
        // dto 구조가 바뀌어도 여기만 수정
        return SendMessageCommand(userId, sessionId, message)
    }
}
```

### 캡슐화 효과가 있는 경우

단일 객체(DTO, Result, 인프라 응답 등)를 다른 레이어 타입으로 변환할 때 효과가 크다. 해당 타입이 바뀌어도 팩토리 메서드 내부만 수정하면 호출부는 그대로 유지된다.

- **Presentation → Application**: RequestDto 구조가 바뀌어도 서비스는 `of()` 호출만 유지하면 됨
- **Application → Presentation**: Result 구조가 바뀌어도 컨트롤러는 `from()` 호출만 유지하면 됨
- **Infrastructure → Domain**: 인프라 응답 타입이 바뀌어도 도메인 변환 로직만 수정하면 됨

```kotlin
// Presentation → Application
// dto.userId → dto.user.id 로 바뀌어도 서비스는 그대로
SendMessageCommand.of(dto.userId, dto.sessionId, dto.message)

// Application → Presentation
// result 내부가 바뀌어도 컨트롤러는 그대로
ChatResponseDto.from(result)

// Infrastructure → Domain
// FabrixResponse 필드가 바뀌어도 어댑터는 그대로
RagChatResponse.from(fabrixResponse)
```

---

## ③ 왜 쓰나 — 책임 원칙

> 📌 객체 생성은 그 객체 스스로가 책임진다. 서비스나 컨트롤러가 외부에서 직접 조립하는 것은 그 책임을 가로채는 것이다.

### 책임 침범 예시

```kotlin
// 서비스가 SendMessageResult 생성 방법을 알고 있음 → 책임 침범
// 내부 구조(sessionId, answer, references...)가 외부에 노출됨
return SendMessageResult(
    sessionId = session.chtngSeonId,
    answer = response.content,
    references = response.referenceTitles,
    filterBlocked = response.isFilterBlocked,
)
```

### 책임을 돌려준 예시

```kotlin
// SendMessageResult가 자신의 생성을 책임짐
companion object {
    fun from(session: ChatSession, response: RagChatResponse): SendMessageResult {
        return SendMessageResult(
            sessionId = session.chtngSeonId,
            answer = response.content,
            references = response.referenceTitles,
            filterBlocked = response.isFilterBlocked,
        )
    }
}

// 서비스는 생성 방법을 모름
return SendMessageResult.from(session, response)
```

### 세 패턴의 공통 동기

`of()` · `from()` · `toCommand()` 세 패턴 모두 같은 원칙에서 비롯된다.

- `of()` — 낱개 원시값으로 자신을 생성하는 책임
- `from()` — 다른 객체로부터 자신을 변환 생성하는 책임
- `toCommand()` — DTO가 자신을 Command로 변환하는 책임

> ✅ 서비스나 컨트롤러가 직접 조립하는 것은 내부 구조를 외부에 노출하는 동시에, 생성 책임을 스스로 지지 못하는 설계다. `of()` · `from()` · `toCommand()`는 그 책임을 **객체 본인에게 돌려주는** 패턴이다.

---

## ④ Presentation 확장 — toCommand() 패턴

> 💡 `toCommand()`는 `of()`의 대체가 아니라 **함께 쓰는** 관계다. `of()`는 Command 생성을, `toCommand()`는 DTO→Command 변환을 담당한다.

Presentation Request DTO에 `toCommand()` 메서드를 두면, 컨트롤러가 DTO 내부 필드명을 전혀 모른다. DTO가 바뀌어도 컨트롤러 코드는 그대로 유지된다.

### of() vs toCommand() 비교

| | `of()` | `toCommand()` |
| --- | --- | --- |
| 위치 | Application Command 안 | Presentation Request DTO 안 |
| 종류 | companion object 팩토리 | 인스턴스 메서드 |
| 역할 | Command 생성 | DTO → Command 변환 |
| 컨트롤러 | `request.x` 직접 접근 필요 | DTO 내부 구조 몰라도 됨 |

### toCommand()를 안 쓰면?

```kotlin
// 컨트롤러가 ChatMessageRequest 내부를 직접 알아야 함
// request.message → request.content 로 바뀌면 컨트롤러도 수정
adminChatUseCase.sendMessage(
    SendMessageCommand.of(userId, request.sessionId, request.message)
)
```

### toCommand()를 쓰면?

```kotlin
// ChatMessageRequest — DTO 내부에서만 스스로를 알고 있음
fun toCommand(userId: String): SendMessageCommand {
    return SendMessageCommand.of(userId, sessionId, message)
}

// 컨트롤러 — DTO 내부 구조를 전혀 모름
// request 필드가 바뀌어도 컨트롤러는 그대로
adminChatUseCase.sendMessage(request.toCommand(userId))
```

### of()와 toCommand()의 협력 구조

```kotlin
// 컨트롤러
request.toCommand(userId)          // toCommand가 변환 담당
     └─→ SendMessageCommand.of(...) // of()가 생성 담당
```

> ✅ `toCommand()`는 Presentation → Application 의존 방향은 유지하면서, 컨트롤러가 DTO 내부를 모르게 하는 패턴이다.

---

## ⑤ 예외 — 서비스가 직접 조립해도 되는 경우

단일 객체를 변환하는 게 아니라, **여러 소스에서 값을 조립**해서 만드는 경우다. 이때는 변환할 '외부 타입'이 없으므로 캡슐화 이점이 생기지 않는다. 파라미터 수와 타입 안전성 관점에서만 판단하면 된다.

```kotlin
// session, response, timing 등 여러 소스에서 조립 → 캡슐화 이점 없음
// 단일 타입이 바뀌어도 어차피 호출부를 수정해야 함
SuccessLogCommand.of(
    session.chtngSeonId, userId, locgovCd, SVC_TYPE,
    userMessage, response.content, response.modelType,
    response.referenceTitlesAsJson(),
    arrivalTime, elapsedMs,
)

// 이 경우 선택 기준은 캡슐화가 아닌 '파라미터 안전성'
// → 같은 타입(String)이 많으면 순서 실수 위험 → named arguments 추천
```

> 💡 오케스트레이션 과정에서 각 단계마다 서비스가 생산한 값들을 모아 커맨드에 넣는 것은 **서비스의 고유 역할**이다. 책임 침범이 아니다.

`SuccessLogCommand`의 파라미터들은 Command 안에 원래 있던 값이 아니라, 오케스트레이션 각 단계에서 서비스가 직접 생산한 값들이다. 서비스가 이것들을 모아 커맨드에 넣는 것 자체가 오케스트레이션의 역할이다.

Kotlin에서는 Builder 대신 **named arguments(명명된 인자)**로 조립하면, 같은 타입이 많아도 순서 실수를 컴파일 시점에 막을 수 있다.

```kotlin
// 각 단계에서 서비스가 생산한 값들
val locgovCd = userOgnzPort.findLocgovCdByUserId(userId)   // 1단계 산출
val session = chatSessionUseCase.resolveSession(...)        // 3단계 산출
val response = fabrixChatPort.chatAdmin(...)                // 5단계 산출
val arrivalTime = OffsetDateTime.now()                      // 5단계 산출
val elapsedMs = ...                                         // 5단계 산출

// 서비스가 생산한 값들을 모아 커맨드를 조립 → 서비스의 고유 역할
// named arguments로 순서 실수 방지
llmChatLogUseCase.saveSuccessLog(
    SuccessLogCommand(
        chtngSeonId = session.chtngSeonId,
        userId = userId,
        locgovCd = locgovCd,
        chtngType = SVC_TYPE,
        qstnCn = userMessage,
        ansCn = response.content,
        mdlType = response.modelType,
        ragRfrncDataList = response.referenceTitlesAsJson(),
        lrlmRspnsArvlHr = arrivalTime,
        wholDmndRspnsReqHr = elapsedMs,
    )
)
```

### SendMessageResult.from() vs SuccessLogCommand(...)

| | `SendMessageResult.from(session, response)` | `SuccessLogCommand(...)` (named args) |
| --- | --- | --- |
| 입력 소스 | 도메인 객체 2개 | 오케스트레이션 각 단계에서 산출된 여러 값 |
| 생성 책임 | `SendMessageResult` 본인 | 서비스 (오케스트레이션 역할) |
| 패턴 | `from()`으로 객체가 자신 생성 | named arguments로 서비스가 조립 |
| 책임 침범? | X (객체가 제역할) | X (서비스가 제역할) |

> ✅ 단일 객체를 변환하는 것이면 객체 본인이 `from()`으로 생성 책임을 진다. 오케스트레이션 과정에서 산출된 여러 값을 조립하는 것이면 서비스가 named arguments로 직접 조립하는 것이 정답이다.

---

## ⑥ 정리 표

| 상황 | 선택 | 이유 |
| --- | --- | --- |
| 단일 객체 → Command/Result | `from()` | 변환 캡슐화 + 생성 책임 |
| 낱개 원시값 조합 (소수) | `of()` | 간결함 |
| 낱개 원시값 조합 (다수 · 동일타입) | `named arguments` | 순서 실수 방지 |
| Request DTO → Command | `toCommand()` | 컨트롤러가 DTO 내부 모르게 |
| 오케스트레이션 중 조립 | `서비스 named arguments` | 서비스의 고유 역할 |

---

## 결론

정적 팩토리(`of()` · `from()` · `toCommand()`)를 쓰는 이유는 두 가지다 — **변환 로직을 호출부에서 감추는 캡슐화**, 그리고 **객체 생성 책임을 객체 본인에게 돌려주는 것**. 단, 단일 객체 변환이 아니라 오케스트레이션 중 여러 값을 모으는 경우엔 서비스가 named arguments로 직접 조립하는 것이 오히려 제 역할이다. 기준은 언제나 *"변환할 단일 외부 타입이 있는가"*다.
