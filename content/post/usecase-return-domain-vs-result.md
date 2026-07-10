---
title: "UseCase 반환 타입 — 도메인 vs Result, 기준은 '호출자가 어느 계층인가'"
date: 2026-07-10T00:01:00+09:00
tags: ["OOP", "레이어드 아키텍처", "헥사고날", "UseCase", "계층 누수", "Kotlin", "백엔드"]
categories: ["객체지향"]
---

# UseCase 반환 타입 — 도메인 vs Result, 기준은 '호출자가 어느 계층인가'

---

> 💡 **한 줄 요약**: Controller가 직접 호출하는 **외부 경계 메서드**는 Application Result 반환, 유스케이스 **내부에서만** 쓰이는 메서드는 도메인 그대로 반환. **호출자가 어느 계층인지**가 판단 기준.

> 📎 UseCase를 어떻게 묶을지는 [UseCase 설계 원칙 — Action 단위가 아닌 비즈니스 시나리오 단위](/post/usecase-by-business-scenario/)에서 다뤘다. 이 글은 그 UseCase가 **무엇을 반환할지**를 다룬다.

---

## 판단 기준 — 호출자가 누구인가

반환 타입 결정의 단 하나의 기준: **호출자가 어느 계층인지**. 호출자가 Presentation(Controller)이면 도메인이 계층을 넘어가므로 Result로 감싸야 하고, Application 내부(다른 UseCase · Service)면 같은 계층끼리 주고받는 것이라 도메인이 자연스럽다.

> 📌 **호출자가 Presentation(Controller)인가?**
> - **YES** → 반환: Application Result (또는 `Unit`)
> - **NO** → 반환: 도메인 그대로

---

## ① 내부 메서드 — 도메인 반환이 정답

UseCase끼리, 또는 같은 Service 안에서 재사용되는 메서드는 도메인(엔티티/VO)을 그대로 반환한다. 같은 Application 계층이므로 누수가 아니다.

### 왜 도메인이어야 하나

- **내부 호출자도 같은 Application 계층** — 계층을 건너뛰지 않음
- **받은 쪽이 도메인 메서드를 그대로 호출해야 함** — `session.verifyOwnedBy(userId)`, `session.toggleFixgYn()` 같은 행동이 필요. Result로 감싸면 도메인 행동을 잃는다.
- **변환 비용 낭비** — 중간 단계마다 Result로 쌌다 풀었다 반복하면 정보 손실 + 보일러플레이트

---

## ② 외부 메서드 — Result 반환 필수

Presentation(Controller)이 직접 호출하는 메서드는 도메인 대신 Application DTO(Result)를 반환해야 한다. 그렇지 않으면 도메인이 Presentation까지 새어나가 **계층 누수(layer leak)**가 발생한다.

### 왜 Result여야 하나

- 도메인이 Presentation에 노출되면 **도메인 필드 변경이 HTTP 응답 변환 로직까지 연쇄 영향**
- `fixgYn == "Y"` 같은 도메인 지식이 Controller에 드러남 — **매직 스트링 누수**
- UseCase 인터페이스 시그니처가 도메인 타입에서 자유로워짐 — **Web/CLI/gRPC 등 다른 어댑터에서도 같은 계약 재사용**

---

## 실제 분류 — ChatSessionUseCase 7개 메서드

| 메서드 | 호출자 | 분류 | 반환 타입 |
| --- | --- | --- | --- |
| `createSession` | `resolveSession` 내부 | 내부 | `ChatSession` (도메인) |
| `resolveSession` | `AdminChatService.sendMessage` | 내부 | `ChatSession` (도메인) |
| `getSession` | 같은 서비스 내부 재사용 | 내부 | `ChatSession` (도메인) |
| `getSessions` | Controller (GET /sessions) | 외부 | `List<SessionResult>` |
| `updateTitle` | Controller (PATCH) | 외부 | `Unit` |
| `togglePin` | Controller (PATCH /pin) | 외부 | `TogglePinResult` |
| `deleteSession` | Controller (DELETE) | 외부 | `Unit` |

---

## 혼용 예시 — AdminChatService.sendMessage

같은 메서드 안에서도 **"내부 호출에는 도메인을 받고, 외부 반환 시점에 Result로 번역"**한다. 하나의 유스케이스에서 이 두 규칙이 자연스럽게 공존한다.

```kotlin
fun sendMessage(command: SendMessageCommand): SendMessageResult {
    // 내부 호출 — 도메인 받음
    val session = chatSessionUseCase.resolveSession(...)

    // 받은 도메인의 메서드/프로퍼티를 그대로 사용
    llmChatLogUseCase.saveSuccessLog(
        SuccessLogCommand(
            chtngSeonId = session.chtngSeonId,
            // ...
        )
    )

    val response = fabrixChatPort.chatAdmin(contents)

    // 외부 반환 시점 — 도메인 2개를 Result로 조립
    return SendMessageResult.from(session, response)
}
```

`resolveSession`이 도메인을 주기 때문에 내부에서는 `session.chtngSeonId` 등으로 자유롭게 쓰고, 맨 마지막에 `SendMessageResult.from(session, response)`로 **외부 경계를 넘길 때만** 번역한다.

---

## 왜 이 규칙이 좋은가

- **계층 경계가 명확** — UseCase 인터페이스의 외부 메서드 시그니처만 보면 도메인이 전혀 안 보이므로 Presentation이 도메인을 건드릴 수 없음
- **유연성** — 같은 UseCase를 Web/CLI/gRPC 등 다른 어댑터에서 동일한 Command/Result 계약으로 재사용
- **오버엔지니어링 회피** — 내부 오케스트레이션까지 Result로 전부 감싸면 변환 비용 + 도메인 행동 상실. 내부는 도메인 그대로가 실용적

---

## 안티패턴

- Controller가 `List<ChatSession>`을 받아 `s.fixgYn == "Y"` 같은 도메인 지식을 직접 사용 — **계층 누수 + 매직 스트링 노출**
- UseCase 인터페이스의 외부 메서드가 도메인 타입을 반환 — 인터페이스 시그니처에 도메인이 드러나 **계약이 도메인 변경에 민감**
- 반대로 내부 메서드까지 전부 Result로 감싸기 — **도메인 행동(`verifyOwnedBy` 등) 상실 + 중간 변환 비용**

---

> ✅ **기억할 것**: "호출자가 Presentation이면 Result, 아니면 도메인 그대로." `SendMessageResult`가 대표 예시 — 내부에서는 도메인 받고, 외부에 줄 때만 Result로 번역한다.
