---
title: "@InjectMocks — Mockito가 의존성을 자동으로 주입한다"
date: 2026-07-01T00:01:00+09:00
tags: ["Kotlin", "Testing", "Mockito", "InjectMocks", "백엔드"]
categories: ["OOP 객체지향"]
---

# @InjectMocks — Mockito가 의존성을 자동으로 주입한다

---

> 💡 **핵심**: `@InjectMocks`는 편리하지만 암묵적이고, `@BeforeEach` 명시적 생성은 다소 번거롭지만 안전하다.
>
> 새 의존성이 추가될 때 전자는 null인 채로 조용히 통과되지만, 후자는 컴파일 에러로 즉시 발견된다.

---

## 개념

`@InjectMocks`는 `@Mock`으로 선언된 가짜 객체들을 SUT(테스트 대상 클래스)의 생성자에 **자동으로 주입**해주는 Mockito 어노테이션이다.

개발자가 직접 `PostService(postPort, userQueryPort)`처럼 생성자를 호출하지 않아도, Mockito가 `@Mock` 객체들을 찾아서 대신 주입해준다.

---

## 코드 비교

### @InjectMocks 사용

```kotlin
@Mock
private lateinit var postPort: PostPort

@Mock
private lateinit var userQueryPort: UserQueryPort

@InjectMocks
private lateinit var sut: PostService
// Mockito가 내부적으로 PostService(postPort, userQueryPort)를 대신 실행
```

### @BeforeEach 명시적 생성

```kotlin
@Mock
private lateinit var postPort: PostPort

@Mock
private lateinit var userQueryPort: UserQueryPort

private lateinit var sut: PostService

@BeforeEach
fun setUp() {
    sut = PostService(postPort, userQueryPort)  // 개발자가 직접 명시
}
```

**동작 결과는 완전히 동일하다.** 차이는 Mockito가 대신 해주냐 vs 개발자가 직접 쓰냐일 뿐이다.

---

## 트레이드오프

| | @InjectMocks | @BeforeEach 명시적 생성 |
| --- | --- | --- |
| 편의성 | 의존성을 직접 안 써도 됨 | 의존성을 직접 써야 함 |
| 의존성 파악 | 코드에서 안 보임 | 코드에서 바로 보임 |
| 새 의존성 추가 시 | null인 채로 조용히 통과될 수 있음 | 컴파일 에러로 즉시 발견 |

### 새 의존성 추가 시 차이

```kotlin
// PostService 생성자에 새 의존성 추가
class PostService(
    private val postPort: PostPort,
    private val userQueryPort: UserQueryPort,
    private val notificationPort: NotificationPort  // 새로 추가
)
```

- `@InjectMocks` → `notificationPort`가 null인 채로 주입되지만 테스트는 통과한다. 런타임에 NPE가 발생할 수 있다.
- `@BeforeEach` 명시적 생성 → **컴파일 에러**. 즉시 발견된다.

---

## 결론

`@InjectMocks`는 편리하지만 암묵적이고, `@BeforeEach` 명시적 생성은 다소 번거롭지만 안전하다. 의존성 관계를 코드에 드러내고 변경을 컴파일 타임에 잡고 싶다면 명시적 생성이, 보일러플레이트를 줄이고 싶다면 `@InjectMocks`가 유리하다. 팀의 컨벤션과 멘토의 선호에 따라 선택하면 된다.
