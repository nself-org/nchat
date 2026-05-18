/**
 * Knowledge Base Service Tests
 *
 * Comprehensive tests for the knowledge base service including
 * articles, categories, FAQs, and search functionality.
 *
 * @module services/knowledge/__tests__/knowledge-base.service.test
 */

import {
  KnowledgeBaseService,
  createKnowledgeBaseService,
  resetKnowledgeBaseService,
} from "../knowledge-base.service";

describe("KnowledgeBaseService", () => {
  let service: KnowledgeBaseService;

  beforeEach(() => {
    resetKnowledgeBaseService();
    service = createKnowledgeBaseService();
  });

  afterEach(() => {
    service.clearAll();
  });

  // ==========================================================================
  // CATEGORY TESTS
  // ==========================================================================

  describe("Categories", () => {
    describe("createCategory", () => {
      it("should create a category with required fields", async () => {
        const result = await service.createCategory(
          { name: "Getting Started" },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.name).toBe("Getting Started");
        expect(result.data?.slug).toBe("getting-started");
        expect(result.data?.isActive).toBe(true);
      });

      it("should create a category with custom slug", async () => {
        const result = await service.createCategory(
          {
            name: "FAQ",
            slug: "frequently-asked-questions",
          },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.slug).toBe("frequently-asked-questions");
      });

      it("should reject duplicate slugs", async () => {
        await service.createCategory(
          { name: "Test", slug: "test-cat" },
          "user-1",
        );
        const result = await service.createCategory(
          { name: "Test 2", slug: "test-cat" },
          "user-1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("CONFLICT");
      });

      it("should create category with parent", async () => {
        const parent = await service.createCategory(
          { name: "Parent" },
          "user-1",
        );
        const child = await service.createCategory(
          {
            name: "Child",
            parentId: parent.data?.id,
          },
          "user-1",
        );

        expect(child.success).toBe(true);
        expect(child.data?.parentId).toBe(parent.data?.id);
      });
    });

    describe("getCategory", () => {
      it("should get a category by ID", async () => {
        const created = await service.createCategory(
          { name: "Test" },
          "user-1",
        );
        const result = await service.getCategory(created.data!.id);

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe("Test");
      });

      it("should return null for non-existent category", async () => {
        const result = await service.getCategory("non-existent");

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe("getCategoryBySlug", () => {
      it("should get a category by slug", async () => {
        await service.createCategory({ name: "Test Category" }, "user-1");
        const result = await service.getCategoryBySlug("test-category");

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe("Test Category");
      });
    });

    describe("updateCategory", () => {
      it("should update category fields", async () => {
        const created = await service.createCategory(
          { name: "Original" },
          "user-1",
        );
        const result = await service.updateCategory(
          created.data!.id,
          {
            name: "Updated",
            description: "A description",
          },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe("Updated");
        expect(result.data?.description).toBe("A description");
      });

      it("should reject non-existent category", async () => {
        const result = await service.updateCategory(
          "non-existent",
          { name: "Test" },
          "user-1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("NOT_FOUND");
      });
    });

    describe("deleteCategory", () => {
      it("should delete an empty category", async () => {
        const created = await service.createCategory(
          { name: "To Delete" },
          "user-1",
        );
        const result = await service.deleteCategory(created.data!.id);

        expect(result.success).toBe(true);
        expect(result.data?.deleted).toBe(true);

        const check = await service.getCategory(created.data!.id);
        expect(check.data).toBeNull();
      });

      it("should reject deleting category with articles", async () => {
        const cat = await service.createCategory(
          { name: "With Articles" },
          "user-1",
        );
        await service.createArticle(
          {
            title: "Article",
            excerpt: "Test",
            content: "Content",
            categoryId: cat.data!.id,
          },
          "user-1",
        );

        const result = await service.deleteCategory(cat.data!.id);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("CONFLICT");
      });
    });

    describe("listCategories", () => {
      it("should list all categories", async () => {
        await service.createCategory({ name: "Cat 1" }, "user-1");
        await service.createCategory({ name: "Cat 2" }, "user-1");
        await service.createCategory({ name: "Cat 3" }, "user-1");

        const result = await service.listCategories();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(3);
      });

      it("should filter by active status", async () => {
        await service.createCategory({ name: "Active" }, "user-1");
        const inactive = await service.createCategory(
          { name: "Inactive" },
          "user-1",
        );
        await service.updateCategory(
          inactive.data!.id,
          { isActive: false },
          "user-1",
        );

        const result = await service.listCategories({ isActive: true });

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].name).toBe("Active");
      });
    });
  });

  // ==========================================================================
  // ARTICLE TESTS
  // ==========================================================================

  describe("Articles", () => {
    describe("createArticle", () => {
      it("should create an article with required fields", async () => {
        const result = await service.createArticle(
          {
            title: "How to Get Started",
            excerpt: "A quick guide to getting started",
            content: "# Getting Started\n\nThis is the content.",
          },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.title).toBe("How to Get Started");
        expect(result.data?.slug).toBe("how-to-get-started");
        expect(result.data?.status).toBe("draft");
        expect(result.data?.version).toBe(1);
      });

      it("should create article with all fields", async () => {
        const category = await service.createCategory(
          { name: "Guides" },
          "user-1",
        );

        const result = await service.createArticle(
          {
            title: "Complete Guide",
            excerpt: "Everything you need to know",
            content: "Full content here...",
            contentType: "guide",
            status: "published",
            visibility: "public",
            categoryId: category.data?.id,
            tags: ["guide", "beginner"],
            keywords: ["start", "setup", "install"],
            isFeatured: true,
            isPinned: false,
          },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.contentType).toBe("guide");
        expect(result.data?.status).toBe("published");
        expect(result.data?.tags).toEqual(["guide", "beginner"]);
        expect(result.data?.isFeatured).toBe(true);
        expect(result.data?.publishedAt).toBeDefined();
      });

      it("should reject duplicate slugs", async () => {
        await service.createArticle(
          {
            title: "Test",
            slug: "my-article",
            excerpt: "Test",
            content: "Test",
          },
          "user-1",
        );

        const result = await service.createArticle(
          {
            title: "Test 2",
            slug: "my-article",
            excerpt: "Test",
            content: "Test",
          },
          "user-1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("CONFLICT");
      });

      it("should strip content to plain text", async () => {
        const result = await service.createArticle(
          {
            title: "Test",
            excerpt: "Test",
            content: "<h1>Header</h1><p><strong>Bold</strong> text</p>",
          },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.contentPlain).not.toContain("<h1>");
        expect(result.data?.contentPlain).not.toContain("<strong>");
      });
    });

    describe("getArticle", () => {
      it("should get an article by ID", async () => {
        const created = await service.createArticle(
          {
            title: "Test Article",
            excerpt: "Test",
            content: "Content",
          },
          "user-1",
        );

        const result = await service.getArticle(created.data!.id);

        expect(result.success).toBe(true);
        expect(result.data?.title).toBe("Test Article");
      });

      it("should return null for non-existent article", async () => {
        const result = await service.getArticle("non-existent");

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe("getArticleBySlug", () => {
      it("should get an article by slug", async () => {
        await service.createArticle(
          {
            title: "My Test Article",
            excerpt: "Test",
            content: "Content",
          },
          "user-1",
        );

        const result = await service.getArticleBySlug("my-test-article");

        expect(result.success).toBe(true);
        expect(result.data?.title).toBe("My Test Article");
      });
    });

    describe("updateArticle", () => {
      it("should update article fields", async () => {
        const created = await service.createArticle(
          {
            title: "Original Title",
            excerpt: "Original excerpt",
            content: "Original content",
          },
          "user-1",
        );

        const result = await service.updateArticle(
          created.data!.id,
          {
            title: "Updated Title",
            tags: ["new", "tags"],
          },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.title).toBe("Updated Title");
        expect(result.data?.tags).toEqual(["new", "tags"]);
        expect(result.data?.version).toBe(2);
      });

      it("should save version history", async () => {
        const created = await service.createArticle(
          {
            title: "Version Test",
            excerpt: "Test",
            content: "Original",
          },
          "user-1",
        );

        await service.updateArticle(
          created.data!.id,
          { content: "Updated" },
          "user-1",
        );

        const versions = await service.getArticleVersions(created.data!.id);

        expect(versions.success).toBe(true);
        expect(versions.data?.length).toBe(1);
        expect(versions.data?.[0].content).toBe("Original");
      });

      it("should set publishedAt when publishing", async () => {
        const created = await service.createArticle(
          {
            title: "Draft",
            excerpt: "Test",
            content: "Content",
            status: "draft",
          },
          "user-1",
        );

        expect(created.data?.publishedAt).toBeUndefined();

        const result = await service.updateArticle(
          created.data!.id,
          {
            status: "published",
          },
          "user-1",
        );

        expect(result.data?.status).toBe("published");
        expect(result.data?.publishedAt).toBeDefined();
      });
    });

    describe("publishArticle", () => {
      it("should publish a draft article", async () => {
        const created = await service.createArticle(
          {
            title: "Draft Article",
            excerpt: "Test",
            content: "Content",
          },
          "user-1",
        );

        const result = await service.publishArticle(created.data!.id, "user-1");

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("published");
      });
    });

    describe("archiveArticle", () => {
      it("should archive an article", async () => {
        const created = await service.createArticle(
          {
            title: "To Archive",
            excerpt: "Test",
            content: "Content",
          },
          "user-1",
        );

        const result = await service.archiveArticle(created.data!.id, "user-1");

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("archived");
      });
    });

    describe("deleteArticle", () => {
      it("should delete an article", async () => {
        const created = await service.createArticle(
          {
            title: "To Delete",
            excerpt: "Test",
            content: "Content",
          },
          "user-1",
        );

        const result = await service.deleteArticle(created.data!.id);

        expect(result.success).toBe(true);
        expect(result.data?.deleted).toBe(true);

        const check = await service.getArticle(created.data!.id);
        expect(check.data).toBeNull();
      });

      it("should remove from related articles", async () => {
        const article1 = await service.createArticle(
          {
            title: "Article 1",
            excerpt: "Test",
            content: "Content",
          },
          "user-1",
        );

        const article2 = await service.createArticle(
          {
            title: "Article 2",
            excerpt: "Test",
            content: "Content",
            relatedArticleIds: [article1.data!.id],
          },
          "user-1",
        );

        await service.deleteArticle(article1.data!.id);

        const check = await service.getArticle(article2.data!.id);
        expect(check.data?.relatedArticleIds).not.toContain(article1.data!.id);
      });
    });

    describe("listArticles", () => {
      beforeEach(async () => {
        const cat = await service.createCategory(
          { name: "Test Category" },
          "user-1",
        );

        await service.createArticle(
          {
            title: "Article 1",
            excerpt: "First article",
            content: "Content 1",
            status: "published",
            categoryId: cat.data?.id,
            tags: ["tag1"],
          },
          "user-1",
        );

        await service.createArticle(
          {
            title: "Article 2",
            excerpt: "Second article",
            content: "Content 2",
            status: "draft",
            tags: ["tag2"],
          },
          "user-1",
        );

        await service.createArticle(
          {
            title: "Article 3",
            excerpt: "Third article",
            content: "Content 3",
            status: "published",
            isFeatured: true,
          },
          "user-1",
        );
      });

      it("should list all articles", async () => {
        const result = await service.listArticles({});

        expect(result.success).toBe(true);
        expect(result.data?.items.length).toBe(3);
      });

      it("should filter by status", async () => {
        const result = await service.listArticles({ status: "published" });

        expect(result.success).toBe(true);
        expect(result.data?.items.length).toBe(2);
      });

      it("should filter by tags", async () => {
        const result = await service.listArticles({ tags: ["tag1"] });

        expect(result.success).toBe(true);
        expect(result.data?.items.length).toBe(1);
        expect(result.data?.items[0].title).toBe("Article 1");
      });

      it("should filter by featured", async () => {
        const result = await service.listArticles({ isFeatured: true });

        expect(result.success).toBe(true);
        expect(result.data?.items.length).toBe(1);
        expect(result.data?.items[0].title).toBe("Article 3");
      });

      it("should search by query", async () => {
        const result = await service.listArticles({ query: "Second" });

        expect(result.success).toBe(true);
        expect(result.data?.items.length).toBe(1);
        expect(result.data?.items[0].title).toBe("Article 2");
      });

      it("should paginate results", async () => {
        const result = await service.listArticles({ limit: 2, offset: 0 });

        expect(result.success).toBe(true);
        expect(result.data?.items.length).toBe(2);
        expect(result.data?.hasMore).toBe(true);
        expect(result.data?.totalCount).toBe(3);
      });
    });

    describe("searchArticles", () => {
      beforeEach(async () => {
        await service.createArticle(
          {
            title: "How to Reset Password",
            excerpt: "Guide to resetting your password",
            content: "Follow these steps to reset your password...",
            keywords: ["password", "reset", "security"],
            status: "published",
          },
          "user-1",
        );

        await service.createArticle(
          {
            title: "Getting Started Guide",
            excerpt: "Everything you need to get started",
            content: "Welcome! Here is how to begin...",
            keywords: ["start", "begin", "setup"],
            status: "published",
          },
          "user-1",
        );

        await service.createArticle(
          {
            title: "Account Settings",
            excerpt: "Manage your account settings",
            content: "Here you can change your password and profile...",
            keywords: ["account", "settings", "profile"],
            status: "published",
          },
          "user-1",
        );
      });

      it("should search by title", async () => {
        const result = await service.searchArticles("password");

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
        expect(result.data![0].article.title).toBe("How to Reset Password");
      });

      it("should search by keywords", async () => {
        const result = await service.searchArticles("setup");

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
        expect(result.data![0].article.title).toBe("Getting Started Guide");
      });

      it("should search by content", async () => {
        const result = await service.searchArticles("profile");

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should rank exact matches higher than partial", async () => {
        const result = await service.searchArticles("password reset");

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
        // The exact match should be ranked first
        expect(result.data![0].article.title).toContain("Password");
      });

      it("should respect limit option", async () => {
        const result = await service.searchArticles("account", { limit: 1 });

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeLessThanOrEqual(1);
      });

      it("should only search published by default", async () => {
        await service.createArticle(
          {
            title: "Draft About Password",
            excerpt: "Draft content",
            content: "Draft about password reset",
            status: "draft",
          },
          "user-1",
        );

        const result = await service.searchArticles("password");

        // Should not include the draft
        const titles = result.data!.map((r) => r.article.title);
        expect(titles).not.toContain("Draft About Password");
      });
    });
  });

  // ==========================================================================
  // FEEDBACK TESTS
  // ==========================================================================

  describe("Feedback", () => {
    let articleId: string;

    beforeEach(async () => {
      const article = await service.createArticle(
        {
          title: "Test Article",
          excerpt: "Test",
          content: "Content",
        },
        "user-1",
      );
      articleId = article.data!.id;
    });

    describe("submitFeedback", () => {
      it("should submit positive feedback", async () => {
        const result = await service.submitFeedback({
          articleId,
          isHelpful: true,
        });

        expect(result.success).toBe(true);
        expect(result.data?.isHelpful).toBe(true);

        // Check analytics updated
        const article = await service.getArticle(articleId);
        expect(article.data?.analytics.helpfulCount).toBe(1);
      });

      it("should submit negative feedback with comment", async () => {
        const result = await service.submitFeedback({
          articleId,
          isHelpful: false,
          comment: "Not clear enough",
        });

        expect(result.success).toBe(true);
        expect(result.data?.isHelpful).toBe(false);
        expect(result.data?.comment).toBe("Not clear enough");

        // Check analytics updated
        const article = await service.getArticle(articleId);
        expect(article.data?.analytics.notHelpfulCount).toBe(1);
      });

      it("should reject feedback for non-existent article", async () => {
        const result = await service.submitFeedback({
          articleId: "non-existent",
          isHelpful: true,
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("NOT_FOUND");
      });
    });

    describe("getArticleFeedback", () => {
      it("should get all feedback for an article", async () => {
        await service.submitFeedback({ articleId, isHelpful: true });
        await service.submitFeedback({ articleId, isHelpful: false });
        await service.submitFeedback({ articleId, isHelpful: true });

        const result = await service.getArticleFeedback(articleId);

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(3);
      });
    });
  });

  // ==========================================================================
  // FAQ TESTS
  // ==========================================================================

  describe("FAQs", () => {
    describe("createFAQ", () => {
      it("should create an FAQ with required fields", async () => {
        const result = await service.createFAQ(
          {
            question: "How do I reset my password?",
            answer: "Click on Forgot Password link on the login page.",
          },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.question).toBe("How do I reset my password?");
        expect(result.data?.isActive).toBe(true);
      });

      it("should create FAQ with all fields", async () => {
        const result = await service.createFAQ(
          {
            question: "Main question?",
            answer: "The answer.",
            alternativeQuestions: ["Alternative 1?", "Alternative 2?"],
            keywords: ["key1", "key2"],
            category: "account",
            priority: 10,
          },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.alternativeQuestions).toHaveLength(2);
        expect(result.data?.keywords).toHaveLength(2);
        expect(result.data?.category).toBe("account");
        expect(result.data?.priority).toBe(10);
      });
    });

    describe("getFAQ", () => {
      it("should get an FAQ by ID", async () => {
        const created = await service.createFAQ(
          {
            question: "Test question?",
            answer: "Test answer.",
          },
          "user-1",
        );

        const result = await service.getFAQ(created.data!.id);

        expect(result.success).toBe(true);
        expect(result.data?.question).toBe("Test question?");
      });
    });

    describe("updateFAQ", () => {
      it("should update FAQ fields", async () => {
        const created = await service.createFAQ(
          {
            question: "Original?",
            answer: "Original.",
          },
          "user-1",
        );

        const result = await service.updateFAQ(
          created.data!.id,
          {
            answer: "Updated answer.",
            keywords: ["new", "keywords"],
          },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.answer).toBe("Updated answer.");
        expect(result.data?.keywords).toEqual(["new", "keywords"]);
      });

      it("should deactivate an FAQ", async () => {
        const created = await service.createFAQ(
          {
            question: "Test?",
            answer: "Test.",
          },
          "user-1",
        );

        const result = await service.updateFAQ(
          created.data!.id,
          {
            isActive: false,
          },
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.isActive).toBe(false);
      });
    });

    describe("deleteFAQ", () => {
      it("should delete an FAQ", async () => {
        const created = await service.createFAQ(
          {
            question: "To delete?",
            answer: "Delete me.",
          },
          "user-1",
        );

        const result = await service.deleteFAQ(created.data!.id);

        expect(result.success).toBe(true);
        expect(result.data?.deleted).toBe(true);

        const check = await service.getFAQ(created.data!.id);
        expect(check.data).toBeNull();
      });
    });

    describe("listFAQs", () => {
      beforeEach(async () => {
        await service.createFAQ(
          {
            question: "FAQ 1?",
            answer: "Answer 1.",
            category: "general",
            priority: 1,
          },
          "user-1",
        );

        await service.createFAQ(
          {
            question: "FAQ 2?",
            answer: "Answer 2.",
            category: "billing",
            priority: 5,
          },
          "user-1",
        );

        const faq3 = await service.createFAQ(
          {
            question: "FAQ 3?",
            answer: "Answer 3.",
            category: "general",
            priority: 3,
          },
          "user-1",
        );

        await service.updateFAQ(faq3.data!.id, { isActive: false }, "user-1");
      });

      it("should list all FAQs", async () => {
        const result = await service.listFAQs();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(3);
      });

      it("should filter by category", async () => {
        const result = await service.listFAQs({ category: "general" });

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
      });

      it("should filter by active status", async () => {
        const result = await service.listFAQs({ isActive: true });

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
      });

      it("should sort by priority descending", async () => {
        const result = await service.listFAQs({ isActive: true });

        expect(result.success).toBe(true);
        expect(result.data?.[0].question).toBe("FAQ 2?"); // Priority 5
        expect(result.data?.[1].question).toBe("FAQ 1?"); // Priority 1
      });
    });

    describe("searchFAQs", () => {
      beforeEach(async () => {
        await service.createFAQ(
          {
            question: "How do I reset my password?",
            answer: "Click Forgot Password on the login page.",
            alternativeQuestions: [
              "I forgot my password",
              "Password reset help",
            ],
            keywords: ["password", "reset", "forgot"],
          },
          "user-1",
        );

        await service.createFAQ(
          {
            question: "How do I change my email?",
            answer: "Go to Settings > Account to change your email.",
            keywords: ["email", "change", "account"],
          },
          "user-1",
        );

        await service.createFAQ(
          {
            question: "What payment methods do you accept?",
            answer: "We accept credit cards, PayPal, and bank transfers.",
            keywords: ["payment", "credit card", "paypal"],
            category: "billing",
          },
          "user-1",
        );
      });

      it("should find FAQ by exact question match", async () => {
        const result = await service.searchFAQs("reset password");

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
        expect(result.data![0].question).toContain("password");
      });

      it("should find FAQ by alternative question", async () => {
        const result = await service.searchFAQs("forgot password");

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should find FAQ by keyword", async () => {
        const result = await service.searchFAQs("paypal");

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
        expect(result.data![0].question).toContain("payment");
      });

      it("should filter by category", async () => {
        const result = await service.searchFAQs("payment", {
          category: "billing",
        });

        expect(result.success).toBe(true);
        expect(result.data!.length).toBe(1);
      });

      it("should only return active FAQs", async () => {
        const faq = await service.createFAQ(
          {
            question: "Unique Inactive FAQ 12345?",
            answer: "Should not appear.",
            keywords: ["uniquekeyword12345"],
          },
          "user-1",
        );
        await service.updateFAQ(faq.data!.id, { isActive: false }, "user-1");

        const result = await service.searchFAQs("uniquekeyword12345");

        expect(result.success).toBe(true);
        // Should not contain the inactive FAQ
        const questions = result.data!.map((f) => f.question);
        expect(questions).not.toContain("Unique Inactive FAQ 12345?");
      });
    });
  });

  // ==========================================================================
  // VIEW TRACKING TESTS
  // ==========================================================================

  describe("View Tracking", () => {
    it("should record article views", async () => {
      const article = await service.createArticle(
        {
          title: "View Test",
          excerpt: "Test",
          content: "Content",
        },
        "user-1",
      );

      await service.recordView(article.data!.id);
      await service.recordView(article.data!.id);
      await service.recordView(article.data!.id, "session-1");

      const updated = await service.getArticle(article.data!.id);

      expect(updated.data?.analytics.viewCount).toBe(3);
      expect(updated.data?.analytics.uniqueViewCount).toBe(1);
    });
  });

  // ==========================================================================
  // EVENT SUBSCRIPTION TESTS
  // ==========================================================================

  describe("Event Subscription", () => {
    it("should emit events on article creation", async () => {
      const events: unknown[] = [];
      const unsubscribe = service.subscribe((event) => events.push(event));

      await service.createArticle(
        {
          title: "Event Test",
          excerpt: "Test",
          content: "Content",
        },
        "user-1",
      );

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty("type", "article.created");

      unsubscribe();
    });

    it("should emit events on article publish", async () => {
      const events: unknown[] = [];

      const article = await service.createArticle(
        {
          title: "Publish Event Test",
          excerpt: "Test",
          content: "Content",
        },
        "user-1",
      );

      const unsubscribe = service.subscribe((event) => events.push(event));

      await service.publishArticle(article.data!.id, "user-1");

      expect(
        events.some((e: { type?: string }) => e.type === "article.published"),
      ).toBe(true);

      unsubscribe();
    });

    it("should unsubscribe correctly", async () => {
      const events: unknown[] = [];
      const unsubscribe = service.subscribe((event) => events.push(event));

      await service.createArticle(
        {
          title: "Test 1",
          excerpt: "Test",
          content: "Content",
        },
        "user-1",
      );

      unsubscribe();

      await service.createArticle(
        {
          title: "Test 2",
          excerpt: "Test",
          content: "Content",
        },
        "user-1",
      );

      // Should only have events from before unsubscribe
      expect(events.length).toBe(1);
    });
  });

  // ==========================================================================
  // STORE MANAGEMENT TESTS
  // ==========================================================================

  describe("Store Management", () => {
    it("should report store sizes", async () => {
      await service.createCategory({ name: "Test" }, "user-1");
      await service.createArticle(
        {
          title: "Test",
          excerpt: "Test",
          content: "Content",
        },
        "user-1",
      );
      await service.createFAQ(
        {
          question: "Test?",
          answer: "Test.",
        },
        "user-1",
      );

      const sizes = service.getStoreSizes();

      expect(sizes.categories).toBe(1);
      expect(sizes.articles).toBe(1);
      expect(sizes.faqs).toBe(1);
    });

    it("should clear all data", async () => {
      await service.createCategory({ name: "Test" }, "user-1");
      await service.createArticle(
        {
          title: "Test",
          excerpt: "Test",
          content: "Content",
        },
        "user-1",
      );

      service.clearAll();

      const sizes = service.getStoreSizes();

      expect(sizes.categories).toBe(0);
      expect(sizes.articles).toBe(0);
      expect(sizes.faqs).toBe(0);
    });
  });
});
