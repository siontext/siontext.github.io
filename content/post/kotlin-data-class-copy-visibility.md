---
title: "[Kotlin] data class copy()의 가시성 불일치 문제"
date: 2026-05-13
tags: ["Kotlin", "data class", "copy", "ConsistentCopyVisibility"]
categories: ["개발"]
---

# [Kotlin] data class copy()의 가시성 불일치 문제

> 경고를 그냥 넘기지 말아야 하는 이유

## copy() 메서드란?

Kotlin data class가 자동으로 생성해주는 메서드로, 객체를 복사하면서 일부 프로퍼티만 변경할 수 있게 해줍니다.

data class는 아래 5가지 메서드를 자동 생성합니다.

- `equals()`
- `hashCode()`
- `toString()`
- `componentN()`
- `copy()`

```kotlin
val original = CreatePostCommand(title = "제목", content = "내용")
val modified = original.copy(title = "새 제목") // content는 그대로, title만 변경
```

---

## 원인

주 생성자를 `private` 또는 `internal`로 제한해도, 컴파일러가 자동 생성하는 `copy()` 메서드는 항상 `public`으로 생성됩니다. 생성자를 막아 생성 로직을 제어하려는 의도가 `copy()`로 인해 무력화됩니다.

```kotlin
data class CreatePostCommand private constructor(
    val title: String,
    val content: String
) {
    companion object {
        fun of(title: String, content: String) = CreatePostCommand(title, content)
    }
}

// 문제: 외부에서 copy()로 우회 가능
val cmd = CreatePostCommand.of("title", "content")
val copied = cmd.copy(title = "hacked") // copy()는 public이라 접근 가능!
```

---

## 해결 방법

### 1. @ConsistentCopyVisibility 어노테이션 추가 (권장)

`copy()`의 가시성을 생성자와 동일하게 맞춰줍니다. Kotlin 2.0+에서 정식 지원.

```kotlin
@ConsistentCopyVisibility
data class CreatePostCommand private constructor(
    val title: String,
    val content: String
) {
    companion object {
        fun of(title: String, content: String) = CreatePostCommand(title, content)
    }
}
```

### 2. 일반 class로 변경

`copy()`, `equals()`, `hashCode()` 등 자동 생성이 필요 없다면 일반 class를 사용합니다.

```kotlin
class CreatePostCommand private constructor(
    val title: String,
    val content: String
) {
    companion object {
        fun of(title: String, content: String) = CreatePostCommand(title, content)
    }
}
```

### 3. copy()를 직접 private으로 재정의 (구식)

```kotlin
data class CreatePostCommand private constructor(
    val title: String,
    val content: String
) {
    private fun copy() = Unit // 명시적으로 외부 접근 차단
}
```

---

## @ConsistentCopyVisibility가 해결하는 방식

어노테이션을 붙이면 컴파일러가 `copy()` 생성 시 주 생성자와 동일한 가시성을 적용합니다.

- 주 생성자가 `private` → `copy()`도 `private`
- 주 생성자가 `internal` → `copy()`도 `internal`

```kotlin
// 어노테이션 없을 때
data class Foo private constructor(val x: Int)
Foo(1).copy(x = 2) // 컴파일 OK → copy()가 public이므로

// 어노테이션 있을 때
@ConsistentCopyVisibility
data class Foo private constructor(val x: Int)
Foo(1).copy(x = 2) // 컴파일 에러! → copy()도 private이므로 외부 접근 불가
```

팩토리 메서드를 통해서만 객체를 생성하도록 강제한 설계 의도가 `copy()`로 우회되는 것을 컴파일 타임에 차단해줍니다.

---

## 결론

`CreatePostCommand`처럼 생성 로직을 팩토리 메서드로 제어하는 경우, `@ConsistentCopyVisibility`를 붙여 생성자 가시성과 `copy()` 가시성을 일치시키는 것이 가장 명확한 해결책입니다.
