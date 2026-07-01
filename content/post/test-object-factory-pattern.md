---
title: "Test Object Factory Pattern — 프로덕션 코드를 오염시키지 않고 테스트 객체 만들기"
date: 2026-06-15
tags: ["Kotlin", "Testing", "FixtureMonkey", "Test Object Factory", "백엔드"]
categories: ["테스트"]
---

# Test Object Factory Pattern — 프로덕션 코드를 오염시키지 않고 테스트 객체 만들기

---

> 💡 **테스트를 위해 프로덕션 코드에 `of()`를 추가하고 있다면, 의존성 방향이 거꾸로 된 것이다.**
>
> 테스트가 프로덕션에 의존해야지, 프로덕션이 테스트에 의존해서는 안 된다.

---

## 문제 상황

`UpdatePostResult`에 테스트 코드에서 객체를 생성하기 위한 목적으로 `of()` 메서드를 추가했다. 프로덕션 코드가 테스트를 위해 오염된 것이다.

```kotlin
// 잘못된 방법 — 프로덕션 코드에 테스트용 메서드 추가
data class UpdatePostResult private constructor(
    val id: Long,
    val title: String,
    // ...
) {
    companion object {
        fun from(post: Post, author: User): UpdatePostResult = ...

        // 테스트만을 위해 추가 → 프로덕션 코드 오염
        fun of(id: Long, title: String, ...): UpdatePostResult = ...
    }
}
```

---

## `of()` 추가가 왜 나쁜가?

- **프로덕션 코드 오염**: 실제 서비스에서 잘못 호출될 수 있는 진입점이 생긴다.
- **캡슐화 훼손**: `private constructor`로 막아놓은 의도를 `of()`로 우회한다.
- **유지보수 부담**: 필드가 추가되면 `of()`도 같이 수정해야 한다.
- **의존성 역전**: 테스트가 프로덕션에 의존해야 하는데, 프로덕션이 테스트에 의존하는 구조가 된다.

---

## 원칙

프로덕션 코드는 테스트를 위해 변경되어선 안 된다. 테스트 픽스처(객체 생성)는 **테스트 전용 라이브러리**로 해결해야 한다.

대표적인 Test Object Factory Pattern 라이브러리:

- **FixtureMonkey** (Kotlin/Java 모두 지원)
- **Instancio** (Java)
- **KotlinFixture** (Kotlin)

---

## FixtureMonkey가 어떻게 해결하나?

리플렉션(Reflection)으로 `private` 생성자를 직접 호출해서 객체를 만든다. 명시하지 않은 필드는 랜덤 값으로 채워주기 때문에 필드가 추가되어도 테스트가 깨지지 않는다.

```kotlin
// testImplementation에만 추가
private val fixtureMonkey = FixtureMonkey.builder()
    .plugin(KotlinPlugin())
    .build()

// 랜덤 값으로 자동 생성
val result = fixtureMonkey.giveMeOne<UpdatePostResult>()

// 검증에 필요한 필드만 명시, 나머지는 자동 생성
val result = fixtureMonkey.giveMeKotlinBuilder<UpdatePostResult>()
    .set(UpdatePostResult::title, "수정제목")
    .sample()
```

---

## `private constructor`까지 다루기 — `PrimaryConstructorArbitraryIntrospector`

`fixture-monkey-kotlin`의 `PrimaryConstructorArbitraryIntrospector`를 사용하면 `private constructor`도 Kotlin 리플렉션으로 직접 호출할 수 있다. FixtureMonkey는 기본적으로 non-blank 문자열을 생성하므로 `TitleVO`, `ContentVO`의 `init` 블록 검증도 통과한다.

```kotlin
private val fixtureMonkey = FixtureMonkey.builder()
    .objectIntrospector(PrimaryConstructorArbitraryIntrospector.INSTANCE)
    .build()

// 필요한 필드만 지정, 나머지는 자동 생성
val post = fixtureMonkey.giveMeKotlinBuilder<Post>()
    .set(Post::id, 1L)
    .set(Post::authorId, 10L)
    .sample()
```

---

## 장점

- 프로덕션 코드에 테스트용 코드가 섞이지 않는다.
- 랜덤 값으로 **특정 값에 의존하는 버그**를 잡기 쉽다.
- 필드 추가 시 픽스처 코드를 수동으로 수정할 필요가 없다.
- 테스트 코드가 간결해진다.

---

## 결론

테스트를 위해 프로덕션 코드에 `of()` 같은 진입점을 만들고 있다면, **의존성 방향이 거꾸로 된 것**이다. FixtureMonkey 같은 Test Object Factory 라이브러리를 도입하면, 프로덕션의 캡슐화를 깨뜨리지 않고도 테스트에 필요한 객체를 자유롭게 만들 수 있다.
