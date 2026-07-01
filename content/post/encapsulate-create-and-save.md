---
title: "도메인 생성과 저장의 캡슐화 — postPort.save를 Post.create 내부로"
date: 2026-06-22T00:00:00+09:00
tags: ["OOP", "캡슐화", "도메인 주도 설계", "레이어드 아키텍처", "Kotlin", "백엔드"]
categories: ["OOP 객체지향"]
---

# 도메인 생성과 저장의 캡슐화 — postPort.save를 Post.create 내부로

---

> 💡 **핵심 한 줄 요약**: 항상 함께 일어나는 동작은 하나로 묶어 캡슐화한다.
>
> 사용하는 측은 세부 단계를 몰라도 된다.

---

## 피드백 요약

> "postPort.save가 Post.create 메서드 내부에 존재해도 될 것 같습니다."

---

## 문제가 된 코드

```kotlin
// PostService.kt
@Transactional
override fun create(command: CreatePostCommand): CreatePostResult {
    val post = Post.create(          // 1단계: 객체 생성
        title = command.title,
        content = command.content,
        authorId = command.userId
    )
    val saved = postPort.save(post)  // 2단계: 저장
    return CreatePostResult.from(saved)
}
```

`PostService`가 "객체 생성"과 "저장" 두 단계를 직접 관리하고 있다. 게시글 생성과 저장은 **항상 함께 일어나는 하나의 동작**인데, 서비스가 세부 단계를 알고 있는 것이 문제다.

---

## 해결 방법

`Post.create()` 안에 저장까지 포함시킨다.

```kotlin
// Post.kt — 수정 후
fun create(title: String, content: String, authorId: Long, postPort: PostPort): Post {
    val post = Post(
        title = TitleVO.from(title),
        content = ContentVO.from(content),
        authorId = authorId
    )
    return postPort.save(post)
}
```

```kotlin
// PostService.kt — 수정 후
@Transactional
override fun create(command: CreatePostCommand): CreatePostResult {
    val saved = Post.create(
        title = command.title,
        content = command.content,
        authorId = command.userId,
        postPort = postPort
    )
    return CreatePostResult.from(saved)
}
```

`PostService`는 이제 "생성해줘" 한 마디로 끝난다. 저장까지의 세부 과정은 `Post` 내부에 캡슐화된다.

---

## PostPort를 도메인에서 써도 되는 이유

`PostPort`는 **도메인 레이어에 정의된 인터페이스**다. 구현체는 인프라에 있지만, 인터페이스 자체는 도메인에 속한다.

```text
도메인 레이어
├── Post.kt
└── port/
    └── PostPort.kt  ← 인터페이스가 도메인에 있음

인프라 레이어
└── PostPersistenceAdapter.kt  ← 구현체는 인프라에 있음
```

`Post`가 `PostPort`(인터페이스)를 아는 것은 같은 레이어 안의 일이라 레이어 위반이 아니다.

---

## 왜 `Post.create(command)`는 안 되나

더 단순해 보이지만 `CreatePostCommand`는 **애플리케이션 레이어**에 속한다.

```text
도메인 레이어 (Post)            ← 하위
애플리케이션 레이어 (Command)    ← 상위
```

하위 레이어(도메인)가 상위 레이어(애플리케이션)를 알면 **의존성이 역전**되어 도메인을 독립적으로 재사용하거나 테스트하기 어려워진다. 타협점은 **원시값(String, Long)** 을 파라미터로 받는 것이다.

---

## 정리

게시글 생성과 저장처럼 **항상 함께 일어나는 동작**은 하나의 메서드로 묶어 캡슐화한다. 사용하는 측(`PostService`)은 "생성"이라는 의도만 표현하고, 그 안에서 객체를 만들고 저장하는 세부 단계는 도메인이 책임진다.
