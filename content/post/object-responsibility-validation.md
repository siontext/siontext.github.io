---
title: "객체의 책임 — 비즈니스 로직과 검증은 어디서 처리해야 하는가"
date: 2026-06-15
tags: ["OOP", "도메인 주도 설계", "레이어드 아키텍처", "Kotlin", "백엔드"]
categories: ["OOP 객체지향"]
---

# 객체의 책임 — 비즈니스 로직과 검증은 어디서 처리해야 하는가

---

> 💡 **핵심 원칙**: 검증 로직은 **검증 대상 데이터를 소유한 객체**가 책임진다.
>
> 객체는 자신의 데이터에 대한 책임을 스스로 져야 한다.
> 외부에서 데이터를 꺼내 검증하지 말고, 객체에게 직접 위임한다.

---

## 레이어별 책임 범위

### 1. 도메인 (Domain)

- **자신의 상태에 대한 비즈니스 규칙 검증**을 담당한다.
- 외부에서 꺼내서 비교하지 않고, 도메인이 직접 판단한다.

**예시 — 작성자 검증**

```kotlin
// 나쁜 예: 서비스에서 꺼내서 비교
if (post.authorId != userId) throw BaseException(ErrorCode.ACCESS_DENIED)

// 좋은 예: 도메인이 스스로 검증
fun delete(userId: Long) {
    validateAuthor(userId)
    ...
}

private fun validateAuthor(userId: Long) {
    if (authorId != userId) throw BaseException(ErrorCode.ACCESS_DENIED)
}
```

**예시 — ID null 검증**

```kotlin
// 나쁜 예: Result 클래스에서 검증
id = requireNotNull(post.id) { "Post ID must not be null" }

// 좋은 예: 도메인이 스스로 책임
fun getId(): Long = id ?: throw BaseException(ErrorCode.INVALID_STATE)
```

---

### 2. 서비스 (Application / Service)

- **유스케이스 흐름 제어**와 **외부 데이터 존재 여부 검증**을 담당한다.
- 비즈니스 규칙 자체를 판단하지 않고, 도메인에 위임한다.

**예시 — 게시글 존재 여부 검증**

```kotlin
val post = postPort.findByIdAndDeletedFalse(command.postId)
    ?: throw BaseException(ErrorCode.NOT_FOUND)  // 서비스 책임

post.delete(command.userId)  // 비즈니스 규칙은 도메인에 위임
```

---

### 3. Result / DTO 클래스

- **값을 담는 역할만** 한다.
- 검증 로직이 들어가면 안 된다.
- 서비스에서 이미 검증된 값을 받아서 변환만 수행한다.

**나쁜 예**

```kotlin
fun from(post: Post, author: User?): GetPostListResult =
    GetPostListResult(
        id = requireNotNull(post.id),                          // 검증이 Result에 있음 (X)
        authorName = author?.username?.value ?: "알 수 없음"   // 존재 검증이 Result에 있음 (X)
    )
```

**좋은 예**

```kotlin
fun from(post: Post): GetPostListResult =
    GetPostListResult(
        id = post.getId(),   // 도메인이 검증 책임
        title = post.title.value,
        createdAt = post.createdAt
    )
```

---

## 관심사 분리 — 유스케이스의 책임 범위

메서드의 책임은 **그 메서드의 이름과 목적**에 맞아야 한다.

**나쁜 예 — `getAll()`이 작성자 존재 여부까지 검증**

```kotlin
override fun getAll(): List<GetPostListResult> {
    val posts = postPort.findAllByDeletedFalse()
    val authorIds = posts.map { it.authorId }.distinct()
    val authorMap = userQueryPort.findByIds(authorIds)  // 관심사 벗어남
    return posts.map { post ->
        val author = authorMap[post.authorId]
            ?: throw BaseException(ErrorCode.NOT_FOUND)  // 관심사 벗어남
        GetPostListResult.from(post, author)
    }
}
```

**좋은 예 — `getAll()`은 게시글 목록만 반환**

```kotlin
override fun getAll(): List<GetPostListResult> {
    return postPort.findAllByDeletedFalse().map { post -> GetPostListResult.from(post) }
}
```

> `getAll()`의 관심사는 "삭제되지 않은 게시글 목록"이다.
> 작성자 존재 여부는 이 유스케이스의 책임이 아니다.

---

## 정리

| 레이어 | 책임 |
| --- | --- |
| **도메인** | 자신의 상태·규칙 검증 (작성자 확인, ID null 여부 등) |
| **서비스** | 외부 데이터 존재 여부 확인, 유스케이스 흐름 제어 |
| **Result / DTO** | 값을 담는 역할만, 검증 로직 없음 |

**핵심 원칙**: 검증 로직은 **검증 대상 데이터를 소유한 객체**가 책임진다.
