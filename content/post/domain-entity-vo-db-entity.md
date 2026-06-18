---
title: "도메인 엔티티 · 값 객체(VO) · DB 엔티티 — 구분과 네이밍"
date: 2026-06-19T00:01:00+09:00
tags: ["OOP", "도메인 주도 설계", "DDD", "값 객체", "레이어드 아키텍처", "Kotlin", "백엔드"]
categories: ["개발"]
---

# 도메인 엔티티 · 값 객체(VO) · DB 엔티티 — 구분과 네이밍

---

> 💡 **핵심**: 도메인 엔티티 · 값 객체(VO) · DB 엔티티는 각각 역할이 다르다.
>
> PK 유무로 엔티티와 VO를 구분하고, VO 접미사는 팀 컨벤션에 따라 선택한다.

---

## ① 세 종류의 객체 — 왜 나뉘는가

이 프로젝트에는 세 종류의 객체가 존재한다.

```text
Post 도메인
├── Post.kt          ← 도메인 엔티티 (ID 있음, 비즈니스 로직)
├── vo/
│   ├── TitleVO.kt   ← 값 객체 (ID 없음, 값 자체가 의미)
│   └── ContentVO.kt ← 값 객체 (ID 없음, 값 자체가 의미)
└── port/
    └── PostPort.kt

infrastructure/
└── PostJpaEntity.kt ← DB 엔티티 (JPA 테이블 매핑)
```

`Post`와 `PostJpaEntity`는 이름이 비슷하지만 전혀 다른 객체다. `TitleVO`/`ContentVO`는 `Post` 도메인 내부에 속한 값 객체다.

---

## ② 도메인 엔티티 vs 값 객체(VO)

### 구분 기준 — PK 유무

| 구분 | 도메인 엔티티 | 값 객체 (VO) |
| --- | --- | --- |
| 식별자 | PK(ID) 있음 | PK 없음 |
| 동등성 비교 | ID로 비교 | 값 자체로 비교 |
| 상태 변경 | 가능 (`update()`) | 불가능 (불변, 새로 생성) |
| 예시 | `Post`, `User` | `TitleVO`, `ContentVO` |

```kotlin
// 엔티티 — ID가 같으면 같은 객체
post1.id == post2.id  // → 같은 게시글

// 값 객체 — 값이 같으면 같은 객체
TitleVO.from("제목") == TitleVO.from("제목")  // → true
```

### VO는 값만 담는 그릇이 아니다

VO는 **그 값에 관한 모든 규칙의 책임자**다. 유효성 검증, 비즈니스 로직 모두 VO 안에 들어갈 수 있다.

```kotlin
data class TitleVO private constructor(val value: String) {
    companion object {
        fun from(value: String): TitleVO {
            if (value.isBlank()) throw BaseException(ErrorCode.TITLE_BLANK)
            if (value.length > 255) throw BaseException(ErrorCode.TITLE_TOO_LONG)
            return TitleVO(value)
        }
    }
}
```

`TitleVO`가 존재한다는 것 자체가 **"이미 검증된 제목"** 을 타입으로 보장한다.

---

## ③ 왜 VO로 분리하나

VO 없이 `Post` 안에 검증 로직을 다 넣으면:

```kotlin
fun create(title: String, content: String, authorId: Long): Post {
    if (title.isBlank()) throw BaseException(ErrorCode.TITLE_BLANK)
    if (title.length > 255) throw BaseException(ErrorCode.TITLE_TOO_LONG)
    if (content.isBlank()) throw BaseException(ErrorCode.CONTENT_BLANK)
    // ...
}

fun update(title: String, content: String, userId: Long) {
    if (title.isBlank()) throw BaseException(ErrorCode.TITLE_BLANK)         // 중복
    if (title.length > 255) throw BaseException(ErrorCode.TITLE_TOO_LONG)   // 중복
    if (content.isBlank()) throw BaseException(ErrorCode.CONTENT_BLANK)     // 중복
    // ...
}
```

`create()`, `update()`마다 동일한 검증 로직이 중복된다. VO로 분리하면:

```kotlin
// Post는 검증 걱정 없이 TitleVO를 그냥 씀
fun create(title: String, content: String, authorId: Long): Post =
    Post(title = TitleVO.from(title), content = ContentVO.from(content), ...)
```

제목 검증은 `TitleVO` 한 곳에만 존재한다.

---

## ④ DB 엔티티 vs 도메인 엔티티

| 구분 | DB 엔티티 | 도메인 엔티티 |
| --- | --- | --- |
| 클래스 | `PostJpaEntity` | `Post` |
| 역할 | JPA 테이블 매핑 | 비즈니스 로직 |
| 위치 | infrastructure 레이어 | domain 레이어 |
| 의존 | JPA, DB 스키마 | 없음 (순수 Kotlin) |

둘은 별개의 객체이며, `PostPersistenceAdapter`가 변환을 담당한다.

```kotlin
class PostPersistenceAdapter : PostPort {
    override fun store(post: Post): Post =
        postEntityRepository.save(PostJpaEntity.fromDomain(post)).toDomain()

    override fun getActiveById(id: Long): Post? =
        postEntityRepository.findByIdAndDeletedFalse(id)?.toDomain()
}
```

> 📌 도메인 엔티티(`Post`)는 JPA를 전혀 모른다. DB가 바뀌어도 domain 레이어는 수정할 필요가 없다.

---

## ⑤ VO 접미사 네이밍 — `TitleVO` vs `Title`

### 접미사 없는 스타일 (`Title`, `Content`)

DDD Ubiquitous Language 관점에서 권장되는 방식이다. 도메인 전문가와 대화할 때 "TitleVO"라고 하지 않기 때문에, 코드도 도메인 언어를 그대로 쓰는 게 자연스럽다는 철학이다. Eric Evans, Vaughn Vernon 등 DDD 원전에서 이 방식을 권장한다.

### 접미사 있는 스타일 (`TitleVO`, `ContentVO`)

코드에서 세 종류의 객체를 명시적으로 구분할 수 있다.

- `PostJpaEntity` → DB 엔티티
- `Post` → 도메인 엔티티
- `TitleVO` → 값 객체

접미사가 없으면 `Title`이 엔티티인지 값 객체인지 이름만으로 바로 알기 어렵다.

### 이 프로젝트의 선택 — 접미사 유지

> ✅ DB 엔티티 / 도메인 엔티티 / 값 객체, 세 종류를 명시적으로 구분하기 위해 VO 접미사를 유지한다. 틀린 방식이 아니며, 팀 컨벤션으로 일관되게 유지하는 것이 중요하다.

---

## ⑥ 정리 표

| 객체 | 식별자 | 역할 | 레이어 | 예시 |
| --- | --- | --- | --- | --- |
| 도메인 엔티티 | PK 있음 | 비즈니스 로직 | domain | `Post`, `User` |
| 값 객체 (VO) | 없음 | 값 + 규칙 책임 | domain | `TitleVO`, `ContentVO` |
| DB 엔티티 | PK 있음 | JPA 테이블 매핑 | infrastructure | `PostJpaEntity` |

> 💡 `TitleVO`, `ContentVO`는 `Post` 도메인에서 분리된 게 아니라, `Post` 안에서 각자 책임을 나눠 가진 값 객체다. VO 접미사는 이 프로젝트에서 세 종류의 객체를 구분하기 위한 컨벤션이다.
