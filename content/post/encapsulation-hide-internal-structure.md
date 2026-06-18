---
title: "캡슐화 — 사용하는 측은 내부 구조를 알면 안 된다"
date: 2026-06-19T00:00:00+09:00
tags: ["OOP", "캡슐화", "도메인 주도 설계", "레이어드 아키텍처", "Kotlin", "백엔드"]
categories: ["개발"]
---

# 캡슐화 — 사용하는 측은 내부 구조를 알면 안 된다

---

> 💡 **핵심 원칙**: 사용하는 측은 상위 도메인(`Post`)만 알면 된다.
>
> 그 안에 어떤 VO가 있는지는 `Post`만 알면 된다.

---

## 피드백 요약

> "Post라는 상위 도메인의 하위 요소인 TitleVO, ContentVO를 Post를 사용하는 측(PostService)에서 알면 안 됩니다. 캡슐화 위반입니다."

---

## 문제가 된 코드

```kotlin
// PostService.kt
val post = Post.create(
    title = TitleVO.from(command.title),       // ← PostService가 TitleVO를 직접 생성
    content = ContentVO.from(command.content), // ← ContentVO도 직접 생성
    authorId = command.userId
)

post.update(
    title = TitleVO.from(command.title),
    content = ContentVO.from(command.content),
    userId = command.userId
)
```

`PostService`는 `Post`를 사용하는 측인데, `Post` 내부 구현 세부사항인 `TitleVO`와 `ContentVO`를 직접 알고 있다.

---

## 왜 문제인가

**캡슐화(Encapsulation)** 란 객체의 내부 구현을 숨기고 외부에는 필요한 인터페이스만 노출하는 것이다.

`TitleVO`, `ContentVO`는 `Post`가 제목과 내용을 안전하게 다루기 위한 **내부 구현 세부사항**이다. 그런데 `PostService`가 이것을 직접 꺼내 조립하고 있으면:

- `TitleVO`의 생성 방식이 바뀌면 `PostService`도 수정해야 한다
- `Post`의 내부 구조가 외부로 새어나온다 (캡슐화 깨짐)
- `PostService`가 `Post`뿐만 아니라 `TitleVO`, `ContentVO`에도 의존하게 된다

---

## 해결 방법

`Post`가 `String`을 직접 받아서 내부에서 VO로 변환한다.

```kotlin
// Post.kt — 수정 후
fun create(title: String, content: String, authorId: Long): Post =
    Post(
        title = TitleVO.from(title),       // VO 변환은 Post 내부에서
        content = ContentVO.from(content),
        authorId = authorId
    )

fun update(title: String, content: String, userId: Long) {
    validateAuthor(userId)
    this.title = TitleVO.from(title)
    this.content = ContentVO.from(content)
    this.updatedAt = LocalDateTime.now()
}
```

```kotlin
// PostService.kt — 수정 후
val post = Post.create(
    title = command.title,    // String만 넘김
    content = command.content,
    authorId = command.userId
)

post.update(
    title = command.title,
    content = command.content,
    userId = command.userId
)
```

`PostService`에서 `TitleVO`, `ContentVO` import가 완전히 사라진다.

---

## 왜 `Post.create(command)`는 안 되나

직관적으로 `Post.create(command)`처럼 커맨드 객체를 통째로 넘기고 싶을 수 있다. 하지만 `CreatePostCommand`는 **애플리케이션 레이어**에 속하고, `Post`는 **도메인 레이어**에 속한다.

```text
도메인 레이어 (Post)                                ← 하위
애플리케이션 레이어 (PostService, CreatePostCommand)  ← 상위
```

하위 레이어가 상위 레이어를 알게 되면 **의존성이 역전**된다. 도메인이 애플리케이션에 종속되어 독립적인 재사용과 테스트가 불가능해진다.

그래서 타협점은 **원시값(String, Long)** 을 파라미터로 받는 것이다.

---

## 계층별 역할 정리

| 계층 | 역할 |
| --- | --- |
| `PostService` | `Command`에서 원시값을 꺼내 `Post`에 전달 |
| `Post.create()` | 원시값을 받아 VO로 변환하고 검증까지 수행 |
| `TitleVO`, `ContentVO` | `Post` 내부에서만 존재하는 구현 세부사항 |

---

## 캡슐화 위반 기준

### 위반이 아닌 경우

- DTO / Command 객체에서 getter로 값을 꺼내는 것 — 데이터 전달이 목적인 객체이므로 상태 노출이 설계 의도임
- getter 값을 다른 메서드의 파라미터로 전달하는 것 — 값을 전달할 뿐, 그 값으로 의사결정을 내리는 게 아님

### 위반인 경우

- 객체의 내부 상태를 꺼내서 외부에서 if/switch로 분기해 비즈니스 결정을 내리는 경우
- 객체 자신만 알아야 하는 불변식/상태 전이 로직이 외부로 새어나오는 경우 (Tell, Don't Ask 원칙 위반)

**나쁜 예**

```java
// 객체 상태를 꺼내 외부에서 분기 → 캡슐화 위반
if (session.getFixgYn().equals("Y")) {
    session.setFixgYn("N");
} else {
    session.setFixgYn("Y");
}
```

**좋은 예**

```java
// 객체에게 행위를 위임 → Tell, Don't Ask
String newFixgYn = session.toggleFixgYn();
chatSessionPort.updatePinned(sessionId, newFixgYn);
```

### 핵심 판단 기준

- "이 결정이 객체 안에 있어야 하는가, 밖에 있어도 되는가?"로 판단한다.
- Command/DTO는 데이터 묶음이므로 getter 사용이 위반이 아니지만, 그 값으로 외부에서 도메인 규칙을 구현하면 위반이다.

---

## 정리

**사용하는 측은 상위 도메인만 알면 된다.** 그 안에 어떤 VO가 있고 어떻게 검증하는지는 도메인 객체 스스로의 책임이다. 내부 구조가 외부로 새어나가는 순간, 사용하는 측은 불필요한 의존성을 떠안고 변경에 취약해진다.
