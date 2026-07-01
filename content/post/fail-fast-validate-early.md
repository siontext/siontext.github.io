---
title: "Fail Fast 원칙 — 사전 검증을 먼저 수행하라"
date: 2026-06-22T00:01:00+09:00
tags: ["OOP", "Fail Fast", "도메인 주도 설계", "레이어드 아키텍처", "Kotlin", "백엔드"]
categories: ["객체지향"]
---

# Fail Fast 원칙 — 사전 검증을 먼저 수행하라

---

> 💡 **핵심 원칙**: 오류가 발생할 가능성이 있는 조건은 가능한 한 빨리 검증한다.
>
> 모든 조건이 충족된 경우에만 수정·저장 같은 핵심 비즈니스 로직을 실행한다.

---

## 피드백 요약

`update` 메서드에서 `val author = userQueryPort.findById(saved.authorId)` 조회가 저장 **이후**에 위치해 있었다.

> 멘토 피드백: "이 메서드가 위로 올라가야 되지 않을까요?"

---

## 문제

기존 코드 순서:

1. 게시글 조회
2. 게시글 수정 (`post.update()`)
3. 게시글 저장 (`postPort.save()`)
4. 작성자 조회 → **없으면 NOT_FOUND 예외**

작성자가 존재하지 않으면 **이미 데이터가 변경된 상태에서 예외가 던져진다.**

---

## Fail Fast 원칙

> 오류가 발생할 가능성이 있는 조건은 가능한 한 빨리 검증하고, 조건이 충족되지 않으면 즉시 실패해야 한다.

사전 검증을 먼저 수행하고, 모든 조건이 충족된 경우에만 수정·저장 등 핵심 비즈니스 로직을 실행하는 것이 바람직하다.

---

## 수정 후 코드 순서

1. 게시글 조회
2. **작성자 조회 → 없으면 즉시 NOT_FOUND 예외** ← 사전 검증
3. 게시글 수정 (`post.update()`)
4. 게시글 저장 (`postPort.save()`)

```kotlin
val post = postPort.findByIdAndDeletedFalse(command.postId)
    ?: throw BaseException(ErrorCode.NOT_FOUND)
val author = userQueryPort.findById(post.authorId)  // 먼저 검증
    ?: throw BaseException(ErrorCode.NOT_FOUND)
post.update(title = command.title, content = command.content, userId = command.userId)
val saved = postPort.save(post)
return UpdatePostResult.from(saved, author)
```

---

## 핵심

- `author`는 응답에 작성자 이름(`authorName`)을 포함시키기 위해 조회하는 것
- 권한 검증은 `Post.update()` 내부에서 별도로 처리됨 (Tell, Don't Ask 원칙)
- Fail Fast는 TDA 위반이 아님 — DB 존재 여부 확인은 인프라 레벨의 검증
