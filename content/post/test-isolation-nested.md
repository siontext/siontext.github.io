---
title: "단위 테스트 격리 — @Nested로 케이스 단위로 완전 격리하라"
date: 2026-06-30T00:01:00+09:00
tags: ["Kotlin", "Testing", "JUnit5", "Nested", "백엔드"]
categories: ["개발"]
---

# 단위 테스트 격리 — @Nested로 케이스 단위로 완전 격리하라

---

> 💡 **핵심**: 단위 테스트는 기능 단위로 케이스가 완전히 격리되어야 한다.
>
> `@Nested`를 활용하면 create / getById / update / delete 케이스가 명확히 분리되고, 각 그룹이 독립적인 `@BeforeEach`를 가질 수 있어 다른 케이스에 영향을 주지 않는다.

---

## 피드백 요약

> 단위 테스트는 케이스 단위로 완전 격리되어야 합니다. 현재 그렇지 않은 듯 보입니다.

---

## 문제

기존 `PostServiceTest`는 create / getById / getAll / update / delete 테스트가 한 클래스에 평평하게 나열되어 있었다.

```kotlin
// Before — 10개 테스트가 한 클래스에 나열
class PostServiceTest {

    @Test fun `정상 생성 시 CreatePostResult를 반환한다`() { ... }
    @Test fun `정상 단건 조회 시 GetPostResult를 반환한다`() { ... }
    @Test fun `존재하지 않는 게시글 조회 시 NOT_FOUND 예외를 던진다`() { ... }
    // ... 7개 더
}
```

케이스 구분이 주석에만 의존하고 있었다. `// ─── create ───` 같은 주석으로만 기능 단위를 구분해, create 케이스와 delete 케이스가 같은 레벨에 섞여 있다.

---

## 해결 — @Nested로 케이스 단위 격리

```kotlin
@ExtendWith(MockitoExtension::class)
class PostServiceTest {

    @Mock private lateinit var postPort: PostPort
    @Mock private lateinit var userQueryPort: UserQueryPort

    @InjectMocks
    private lateinit var sut: PostService

    @Nested
    @DisplayName("create")
    inner class Create {
        @Test fun `정상 생성 시 CreatePostResult를 반환한다`() { ... }
    }

    @Nested
    @DisplayName("getById")
    inner class GetById {
        @Test fun `정상 단건 조회 시 GetPostResult를 반환한다`() { ... }
        @Test fun `존재하지 않는 게시글 조회 시 NOT_FOUND 예외를 던진다`() { ... }
        @Test fun `작성자가 존재하지 않으면 NOT_FOUND 예외를 던진다`() { ... }
    }

    @Nested @DisplayName("getAll") inner class GetAll { ... }
    @Nested @DisplayName("update") inner class Update { ... }
    @Nested @DisplayName("delete") inner class Delete { ... }
}
```

---

## 핵심 원칙 — @Nested로 케이스 단위 격리

- `getById` 안의 케이스 3개(정상 / 게시글 없음 / 작성자 없음)가 `delete` 케이스와 완전히 분리된다.
- 나중에 `GetById`에만 필요한 공통 셋업이 생기면 `GetById` 안에 `@BeforeEach`를 추가하면 된다. 다른 그룹에는 영향이 없다.
- 테스트 실행 결과가 계층 구조로 출력되어 가독성이 향상된다.

```text
PostServiceTest
├── Create
│   └── 정상 생성 → CreatePostResult 반환
├── GetById
│   ├── 정상 단건 조회 → GetPostResult 반환
│   ├── 게시글 없음 → NOT_FOUND
│   └── 작성자 없음 → NOT_FOUND
├── GetAll
│   ├── 정상 목록 조회 → List 반환
│   └── 빈 목록 → 빈 리스트 반환
├── Update
│   ├── 정상 수정 → UpdatePostResult 반환
│   └── 게시글 없음 → NOT_FOUND
└── Delete
    ├── 정상 삭제 → save 호출
    └── 게시글 없음 → NOT_FOUND
```

---

## 결론

단위 테스트는 기능 단위로 케이스를 격리해야 한다. `@Nested`를 활용하면 create / getById / update / delete 케이스가 명확히 분리되고, 각 그룹이 독립적인 `@BeforeEach`를 가질 수 있어 다른 케이스에 영향을 주지 않는다. 테스트 결과도 계층 구조로 출력되어, 어떤 기능의 어떤 케이스가 깨졌는지 한눈에 파악할 수 있다.
