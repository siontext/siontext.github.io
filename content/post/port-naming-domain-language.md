---
title: "Port 네이밍 — JPA Hibernate Naming Convention을 도메인 Port에 쓰지 마라"
date: 2026-07-02T00:01:00+09:00
tags: ["OOP", "레이어드 아키텍처", "헥사고날", "Port Adapter", "도메인 주도 설계", "Kotlin", "백엔드"]
categories: ["객체지향"]
---

# Port 네이밍 — JPA Hibernate Naming Convention을 도메인 Port에 쓰지 마라

---

> 💡 **핵심**: Port는 도메인의 아웃바운드 인터페이스다. **도메인이 무엇을 원하는지**를 표현해야 하고, **어떻게 구현되는지**(JPA 쿼리 유도 네이밍)는 Adapter가 담당한다.

---

## 피드백 요약

> Port는 도메인 객체이기 때문에 JPA Hibernate Naming Convention을 지양하는 게 좋다.

---

## 문제

`PostPort`의 메서드명이 JPA 쿼리 유도(Query Derivation) 스타일로 작성되어 있었다.

```kotlin
interface PostPort {
    fun save(post: Post): Post
    fun findByIdAndDeletedFalse(id: Long): Post?
    fun findAllByDeletedFalse(): List<Post>
}
```

`findByIdAndDeletedFalse`, `findAllByDeletedFalse`는 Spring Data JPA가 메서드명으로 쿼리를 자동 생성할 때 쓰는 네이밍이다.

Port는 **도메인 계층**에 위치한 인터페이스다. 도메인은 JPA를 모른다. 그런데 Port 이름에 JPA 구현 상세(`And`, `DeletedFalse`)가 드러나면 계층 간 경계가 무너진다.

---

## 왜 나쁜가

| 문제 | 설명 |
| --- | --- |
| 구현 상세 노출 | `deleted = false` 조건은 인프라(JPA) 구현 상세인데 도메인 Port 이름에 드러남 |
| 계층 경계 위반 | 도메인이 JPA 네이밍 규칙에 의존하게 됨 |
| 응집도 저하 | Port가 도메인 개념이 아닌 쿼리 조건을 표현 |

---

## 해결 — 도메인 언어로 네이밍

도메인 관점에서 "삭제된 게시글"은 존재하지 않는 것과 같다. 그 의미를 **도메인 언어**로 표현한다.

```kotlin
interface PostPort {
    fun store(post: Post): Post          // save → store (JPA 연관 없는 도메인 동사)
    fun getActiveById(id: Long): Post?   // Active = 삭제되지 않은 상태
    fun getAllActive(): List<Post>       // 전체 활성 게시글 조회
}
```

### 네이밍 기준

| 변경 전 | 변경 후 | 이유 |
| --- | --- | --- |
| `save` | `store` | `save`는 JPA `CrudRepository`의 메서드명 |
| `findByIdAndDeletedFalse` | `getActiveById` | `findBy`는 JPA 쿼리 유도 네이밍. `Active`로 도메인 상태 표현 |
| `findAllByDeletedFalse` | `getAllActive` | 동일. `findAll`도 `JpaRepository`의 메서드명 |

---

## 핵심 원칙

Port는 도메인의 아웃바운드 인터페이스다. **도메인이 무엇을 원하는지** 표현해야 하고, **어떻게 구현되는지**는 Adapter(인프라)가 담당한다.

- Port: `getActiveById(id)` → "활성 게시글을 ID로 가져와라"
- Adapter: 내부에서 `postEntityRepository.findByIdAndDeletedFalse(id)` 호출 (JPA 네이밍은 여기서만)

```kotlin
// PostPersistenceAdapter (인프라 계층)
override fun getActiveById(id: Long): Post? =
    postEntityRepository.findByIdAndDeletedFalse(id)?.toDomain()  // JPA 네이밍은 Adapter 내부에만
```

---

## 결론

Port 이름에 JPA 구현 상세가 새어 나오면 도메인 계층이 인프라에 의존하게 되어 헥사고날 아키텍처의 경계가 무너진다. `store`, `getActiveById`, `getAllActive`처럼 **도메인 언어로 의도를 표현**하고, `findByIdAndDeletedFalse` 같은 JPA 네이밍은 Adapter 내부에만 가둬라.
