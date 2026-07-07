---
title: "정적 팩토리 메서드 네이밍 — of() vs from()의 기준은 방향이 아니라 파라미터 형태"
date: 2026-07-07T00:01:00+09:00
tags: ["OOP", "네이밍 컨벤션", "정적 팩토리 메서드", "레이어드 아키텍처", "헥사고날", "Java", "백엔드"]
categories: ["객체지향"]
---

# 정적 팩토리 메서드 네이밍 — of() vs from()의 기준은 방향이 아니라 파라미터 형태

---

> 💡 **핵심**: 기준은 **레이어 방향이 아니라 파라미터 형태**다. 낱개 원시값이면 `of()`, 객체 한 덩어리면 `from()`.

---

## 비교표

| 메서드 | 파라미터 형태 | 예시 |
| --- | --- | --- |
| `of()` | `String`, `int` 등 낱개 원시값 여러 개 | `SendMessageCommand.of(userId, sessionId, msg)` |
| `from()` | 다른 타입의 객체 한 덩어리 | `ChatResponseDto.from(result)` |

---

## of() — 낱개 원시값 조합

파라미터가 `String`, `int`, `Long` 등 원시값·기본형 여러 개일 때 사용한다.

```java
// of() — 낱개 값 조합
SendMessageCommand.of(userId, sessionId, message);
ResolveSessionCommand.of(userId, svcType, sessionId, message);
SuccessLogCommand.of(chtngSeonId, userId, locgovCd, svcType, ...);
```

---

## from() — 객체 통째 변환

파라미터가 도메인 객체, DTO, 인프라 응답 객체 등 **단일 객체**일 때 사용한다.

```java
// from() — 객체 변환
ChatResponseDto.from(sendMessageResult);   // Application → Presentation
RagChatResponse.from(fabrixResponse);      // Infrastructure → Domain
SendMessageCommand.from(requestDto);       // DTO 통째로 넘길 때
```

---

## 레이어 방향별 패턴

방향이 기준처럼 보이지만, 실제로는 각 방향에서 **파라미터 형태가 자연스럽게 결정되는 파생 결과**다.

| 방향 | 파라미터 형태 | 메서드 |
| --- | --- | --- |
| Presentation → Application | RequestDto에서 값을 꺼내 낱개로 넘김 | `of()` |
| Application → Presentation | Result 객체를 통째로 변환 | `from()` |
| Infrastructure → Domain | 인프라 응답 객체를 도메인 타입으로 변환 | `from()` |

---

## 방향에 속지 마라

> ⚠️ 방향이 Presentation → Application이어도 **객체를 통째로 넘기면 `from()`**이 맞다.

```java
// 방향은 Presentation → Application 이지만,
// requestDto를 통째로 넘기므로 from()
SendMessageCommand.from(requestDto);
```

방향은 어디까지나 판단을 돕는 힌트일 뿐, 최종 기준은 언제나 **넘기는 파라미터가 낱개 값인가, 객체 한 덩어리인가**다.

---

## 결론

`of()`와 `from()`을 가르는 기준은 레이어 방향이 아니라 파라미터 형태다.

- **낱개 원시값 여러 개** → `of()`
- **객체 한 덩어리** → `from()`

방향별 패턴(`of()`는 Presentation → Application, `from()`은 Application → Presentation / Infrastructure → Domain)은 유용한 경험칙이지만, 방향이 아니라 **파라미터 형태로 판단**해야 예외 상황(`SendMessageCommand.from(requestDto)`)에서도 흔들리지 않는다.
