import { test, expect } from "@playwright/test";

test("home page renders timeline shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "欢迎来到我的博客" })).toBeVisible();
  await expect(page.getByRole("link", { name: "登录", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "发布", exact: true })).not.toBeVisible();
});

test("archive page renders heatmap block", async ({ page }) => {
  await page.goto("/archive");
  await expect(page.getByRole("heading", { name: "归档" })).toBeVisible();
  await expect(page.locator(".heatmapGrid")).toBeVisible();
});

test("完整业务流: 登录->发文->点赞", async ({ page }) => {
  const title = `E2E-${Date.now()}`;
  const postId = "post-e2e-1";
  const createdAt = new Date().toISOString();
  const reactionCounts = {};

  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "token-e2e", user: { id: "u1", username: "admin" } })
    });
  });
  await page.route("**/api/posts", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: postId })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route(`**/api/posts/${postId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: postId, title, content: "这是一条 e2e 自动化测试发布内容。", createdAt })
    });
  });
  await page.route(`**/api/interactions/posts/${postId}`, async (route) => {
    const reactionRows = Object.entries(reactionCounts).map(([emoji, count]) => ({ emoji, count }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reactions: reactionRows })
    });
  });
  await page.route(`**/api/interactions/posts/${postId}/reactions`, async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    const emoji = payload.emoji || "👍";
    reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/login");
  await page.getByTestId("login-email").fill("admin@personal-blog.local");
  await page.getByTestId("login-password").fill("admin123456");
  await page.getByTestId("login-submit").click();
  await expect(page.getByText(/登录成功/)).toBeVisible();

  await page.goto("/compose");
  await page.getByTestId("compose-title").fill(title);
  await page.locator('[data-testid="compose-content"] .ql-editor').fill("这是一条 e2e 自动化测试发布内容。");
  await page.getByTestId("compose-tags").fill("e2e,自动化");
  await page.getByTestId("compose-submit").click();
  await expect(page.getByText("发布成功")).toBeVisible();

  await page.goto(`/posts/${postId}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByTestId("reaction-up").click();
  await expect(page.getByTestId("like-count")).toContainText("👍 1");
});
