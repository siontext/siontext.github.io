---
title: "!! 안티패턴 — Kotlin의 null 안전성을 스스로 무너뜨리지 마라"
date: 2026-06-24T00:01:00+09:00
tags: ["Kotlin", "null safety", "안티패턴", "백엔드"]
categories: ["OOP 객체지향"]
---

# !! 안티패턴 — Kotlin의 null 안전성을 스스로 무너뜨리지 마라

---

> 💡 **핵심**: `!!`은 Kotlin의 null 안전망을 스스로 걷어내는 행위다.
>
> null일 수 없는 값은 타입으로 `Long`으로 선언하거나, `getId()`처럼 명시적 예외 처리로 대체하라.

---

## 피드백 요약

`LoginService`의 `user.id!!` 사용에 대해 "`!!` 안티패턴입니다" 피드백을 받았다.

---

## 왜 `!!`이 필요했는가? (근본 원인)

`User.id`는 `Long?`으로 선언되어 있다.

```kotlin
data class User private constructor(
    val id: Long? = null,  // signUp 시점에는 DB 저장 전이라 id가 없음
    ...
)
```

`signUp` 시점에는 DB에 저장 전이라 id가 없어서 `Long?`으로 선언했다. 하지만 `login`은 DB에서 조회해온 사용자이므로 id가 반드시 존재한다.

그런데 `generateToken(userId: Long)`의 파라미터는 `Long`(non-nullable)이므로, `Long?`인 `user.id`를 그대로 넘길 수 없다. 이 타입 불일치를 해결하려고 `!!`을 사용했던 것이 문제의 근본 원인이다.

---

## `!!`이 안티패턴인 이유

Kotlin의 핵심 철학은 **null 안전성을 컴파일 타임에 보장**하는 것이다.

`!!` = "이 값은 절대 null이 아니다"라고 개발자가 컴파일러에게 강제로 단언하는 것

- `Long?`으로 선언하면 컴파일러가 "이 값은 null일 수 있으니 처리하라"고 경고한다.
- `!!`은 그 경고를 **근거 없이 무시**하는 것이다.
- `id`가 실제로 null이면 런타임에 `NullPointerException`이 발생한다.

즉 Java와 똑같이 런타임 NPE가 발생할 수 있는 상태로 되돌아가는 것이기 때문에 안티패턴이다.

---

## 컴파일 타임 null 안전성이란?

코드를 실행하기 전, 컴파일하는 시점에 null 관련 오류를 잡아주는 것이다.

`generateToken`의 두 번째 파라미터는 `Long`(non-nullable)으로 선언되어 있다.

```kotlin
fun generateToken(username: UsernameVO, userId: Long): TokenVO
```

Kotlin은 `Long?`과 `Long`을 다른 타입으로 취급하기 때문에, null일 수 있는 `Long?`을 null을 허용하지 않는 `Long` 자리에 넣으면 타입이 맞지 않아 컴파일이 거부된다.

```kotlin
// 컴파일 에러 — 실행 전에 막힘
jwtHandlerPort.generateToken(user.username, id)  // id가 Long?이므로 Long 자리에 넣을 수 없음
```

`!!`을 붙이면 컴파일은 통과되지만, 실제 null이면 런타임에 NPE가 터진다.

---

## 해결 방법

`Post.getId()`와 동일하게 `User`에도 `getId()` 메서드를 추가한다.

```kotlin
// User.kt
fun getId(): Long = id ?: throw BaseException(ErrorCode.INVALID_STATE)
```

```kotlin
// LoginService.kt
val token = jwtHandlerPort.generateToken(user.username, user.getId())
val refreshToken = refreshTokenHandlerPort.generateRefreshToken(user.username, user.getId())
```

- `!!` 제거 → NPE 위험 없음
- null인 경우 명확한 예외로 처리
- 의도가 코드로 명확하게 표현됨

---

## 핵심

- `!!`은 Kotlin의 null 안전망을 스스로 걷어내는 행위
- null일 수 없는 값은 타입으로 `Long`으로 선언하거나, `getId()`처럼 명시적 예외 처리로 대체하라
