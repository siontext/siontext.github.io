---
title: "UseCase 설계 원칙 — Action 단위가 아닌 비즈니스 시나리오 단위로 묶어라"
date: 2026-06-24T00:00:00+09:00
tags: ["OOP", "UseCase", "레이어드 아키텍처", "응집도", "Kotlin", "백엔드"]
categories: ["개발"]
---

# UseCase 설계 원칙 — Action 단위가 아닌 비즈니스 시나리오 단위로 묶어라

---

> 💡 **핵심 원칙**: UseCase는 비즈니스 시나리오 단위로 묶는다.
>
> CRUD Action 단위로 쪼개면 서로 연관된 기능이 분리되어 응집도가 낮아진다.

---

## 피드백 요약

`CreatePostUseCase`, `GetPostUseCase`, `UpdatePostUseCase`, `DeletePostUseCase`가 각각 분리되어 있었다.

> 멘토 피드백: "UseCase가 아닌 Action 단위로 쪼개진 것 같습니다. 각 UseCase는 독립적이어야 하며 서로가 없어도 동작하여야 하나 현재는 그렇지 않은 듯합니다."

---

## 문제

Create, Get, Update, Delete는 각각 독립된 UseCase가 아니라 **게시글이라는 하나의 비즈니스 시나리오를 구성하는 Action들**이다.

- `CreatePostUseCase`만 있고 `DeletePostUseCase`가 없다면? 의미가 불완전하다.
- 서로 없어도 동작해야 하는 독립적인 UseCase가 아니라, 서로 연관된 기능들이다.

즉 CRUD Action 기준으로 인터페이스를 쪼갠 것이지, 비즈니스 유즈케이스 기준으로 나눈 것이 아니다.

---

## UseCase란?

> **사용자(액터)가 시스템에 요청하는 하나의 비즈니스 시나리오**

게시글에 대한 생성, 조회, 수정, 삭제는 모두 **게시글 관리**라는 하나의 유즈케이스에 속한다.

---

## 수정 방향

4개의 UseCase 인터페이스를 `PostUseCase` 하나로 통합한다.

```kotlin
interface PostUseCase {
    fun create(command: CreatePostCommand): CreatePostResult
    fun getById(command: GetPostCommand): GetPostResult
    fun getAll(): List<GetPostListResult>
    fun update(command: UpdatePostCommand): UpdatePostResult
    fun delete(command: DeletePostCommand)
}
```

- `PostService`는 `PostUseCase` 하나만 구현
- `PostController`는 `PostUseCase` 하나만 주입받음

---

## 핵심

- UseCase는 **비즈니스 시나리오 단위**로 묶어야 한다
- CRUD Action 단위로 쪼개면 서로 연관된 기능이 분리되어 오히려 응집도가 낮아진다
- 관련 기능은 하나의 UseCase 인터페이스에 모아 **높은 응집도**를 유지한다
