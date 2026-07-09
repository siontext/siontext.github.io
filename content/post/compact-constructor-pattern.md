---
title: "Compact Constructor Pattern — 생성자 보일러플레이트 제거하고 '생성 = 검증' 보장하기"
date: 2026-07-09T00:01:00+09:00
tags: ["OOP", "값 객체 VO", "정적 팩토리 메서드", "캡슐화", "도메인 주도 설계", "Kotlin", "백엔드"]
categories: ["객체지향"]
---

# Compact Constructor Pattern — 생성자 보일러플레이트 제거하고 '생성 = 검증' 보장하기

---

> 💡 **핵심**: Compact Constructor Pattern은 **필드 선언 · 파라미터 선언 · 할당** 세 단계를 하나로 압축하여, 생성자에 **검증 로직만** 남기는 패턴이다.

> 📎 값 객체(VO)의 개념과 구분은 [도메인 엔티티 · 값 객체(VO) · DB 엔티티](/post/domain-entity-vo-db-entity/)에서 다뤘다. 이 글은 그 VO를 **어떻게 간결하게 생성·검증할지**를 다룬다.

---

## ① 이름의 유래

Java 16의 **Record**에서 공식적으로 도입된 용어다. Record는 생성자 파라미터를 다시 선언하지 않고 검증 로직만 쓰는 "compact canonical constructor"를 지원한다.

```java
// Java Record — compact canonical constructor
public record Title(String value) {
    public Title {  // 파라미터 선언 없이 바로 검증만
        if (value.isBlank()) throw new IllegalArgumentException();
    }
}
```

Kotlin의 `data class` + `init` 블록이 이와 동일한 효과를 낸다.

---

## ② 어떤 문제를 해결하나

### 전통적 방식의 문제

```kotlin
class TitleVO {
    val value: String              // 1. 필드 선언

    constructor(value: String) {   // 2. 파라미터 선언
        if (value.isBlank()) throw ...
        if (value.length > 255) throw ...
        this.value = value         // 3. 필드에 할당
    }
}
```

필드 선언, 파라미터 선언, 할당 — 세 가지가 분리되어 있다. 필드가 늘어날수록 이 보일러플레이트가 반복된다.

---

## ③ 어떻게 해결하나 — 세 단계를 하나로 압축

### 필드가 하나일 때

```kotlin
data class TitleVO private constructor(val value: String) {
//                                     ^^^^^^^^^^^^^^^^
//                        파라미터 선언 = 필드 선언 = 자동 할당 (한 줄)
    init {
        // 검증만 남음. 할당 코드 없음.
        if (value.isBlank()) throw BaseException(ErrorCode.TITLE_BLANK)
        if (value.length > MAX_LENGTH) throw BaseException(ErrorCode.TITLE_TOO_LONG)
    }

    companion object {
        private const val MAX_LENGTH = 255

        fun from(value: String): TitleVO = TitleVO(value)
    }
}
```

| 전통적 방식 | Compact Constructor |
| --- | --- |
| 필드 선언 따로 | `val value: String`이 필드이자 파라미터 |
| 파라미터 선언 따로 | 위와 동일 (하나로 합쳐짐) |
| `this.value = value` 할당 필요 | Kotlin이 자동 할당 |
| init에 검증 + 할당 섞임 | init에 **검증만** 존재 |

> 📌 "선언 · 검증 · 할당"을 "선언 · 검증"으로 줄인 것이 compact constructor pattern이 문제를 해결하는 방식이다.

### 필드가 여러 개일 때

필드가 여러 개여도 패턴은 동일하다. 오히려 필드가 많을수록 전통적 방식의 보일러플레이트가 늘어나기 때문에 이점이 더 커진다.

```kotlin
data class MoneyVO private constructor(
    val amount: BigDecimal,
    val currency: String
) {
    init {
        if (amount < BigDecimal.ZERO) throw BaseException(ErrorCode.INVALID_AMOUNT)
        if (currency.isBlank()) throw BaseException(ErrorCode.INVALID_CURRENCY)
    }

    companion object {
        fun of(amount: BigDecimal, currency: String): MoneyVO = MoneyVO(amount, currency)
    }
}
```

`amount`, `currency` 두 필드 모두 **파라미터 선언 = 필드 선언 = 자동 할당**이고, `init`에는 검증만 남는다.

---

## ④ 패턴의 구성 요소

| 요소 | 역할 |
| --- | --- |
| `private constructor(val value: String)` | 파라미터 = 필드, 외부 생성 차단 |
| `init { ... }` | 검증만 담당 (할당 코드 불필요) |
| `from()` / `of()` | 유일한 생성 진입점 |

---

## ⑤ 검증 용도인가? — 생성 + 검증이다

"compact"는 생성자의 세 단계(선언 · 검증 · 할당)를 압축했다는 뜻이지, **검증만 한다는 뜻이 아니다.**

`TitleVO(value)` 호출 한 번으로 **객체 생성과 검증이 동시에** 일어난다. 검증을 통과해야만 객체가 존재할 수 있고, 검증에 실패하면 객체 자체가 만들어지지 않는다.

> ✅ 핵심은 **"생성 = 검증"**을 보장하는 것이다. 검증 없이 생성되는 경로가 없다는 게 이 패턴의 가치다.

---

## ⑥ 언제 사용하는가

| 상황 | 적합 여부 | 이유 |
| --- | --- | --- |
| 값 객체(VO) 생성 | ✅ 적합 | 불변 + 생성 시 검증 강제가 핵심 |
| 도메인 엔티티 생성 | ✅ 적합 | 생성 시점에 불변식 검증이 필요한 경우 |
| Command / Result 객체 | ✅ 적합 | 필드 수가 적고 생성 시 검증이 필요한 경우 |
| 필드가 많고 검증이 없는 단순 DTO | ❌ 불필요 | 검증이 없으면 `init` 블록이 비어 있어 의미 없음 |

> 💡 핵심 기준: **객체 생성 시점에 검증이 필요한가?** 필요하다면 compact constructor로 검증을 생성자에 압축하라.

---

## ⑦ 이 프로젝트에서 해당하는 코드

`TitleVO`와 `ContentVO`가 이 패턴을 사용하고 있다. 생성자에서 **검증 + 불변 + 캡슐화**가 군더더기 없이 한 곳에 모여 있다.

> ✅ Compact Constructor Pattern은 생성자 보일러플레이트를 제거하면서도, 객체 생성 시점에 유효성을 강제하는 간결한 방식이다.
