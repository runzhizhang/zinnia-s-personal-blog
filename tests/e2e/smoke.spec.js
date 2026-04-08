import { test, expect } from "@playwright/test";

test("home page renders timeline shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "时间线" })).toBeVisible();
  await expect(page.getByRole("link", { name: "发布", exact: true })).toBeVisible();
});

test("archive page renders heatmap block", async ({ page }) => {
  await page.goto("/archive");
  await expect(page.getByRole("heading", { name: "归档" })).toBeVisible();
  await expect(page.locator(".heatmapGrid")).toBeVisible();
});

test("完整业务流: 登录->发文->评论->反应", async ({ page }) => {
  const title = `E2E-${Date.now()}`;
  const comment = `E2E评论-${Date.now()}`;
  const postId = "post-e2e-1";
  const createdAt = new Date().toISOString();
  const reactions = {};
  const comments = [];

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
    const reactionRows = Object.entries(reactions).map(([emoji, count]) => ({ emoji, count }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ comments, commentTree: comments, reactions: reactionRows })
    });
  });
  await page.route(`**/api/interactions/posts/${postId}/comments`, async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    const item = { id: `c-${comments.length + 1}`, content: payload.content, createdAt, parentId: payload.parentId || null, children: [] };
    comments.push(item);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(item) });
  });
  await page.route(`**/api/interactions/posts/${postId}/reactions`, async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    reactions[payload.emoji || "👍"] = (reactions[payload.emoji || "👍"] || 0) + 1;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/login");
  await page.getByTestId("login-email").fill("admin@personal-blog.local");
  await page.getByTestId("login-password").fill("admin123456");
  await page.getByTestId("login-submit").click();
  await expect(page.getByText("登录成功")).toBeVisible();

  await page.goto("/compose");
  await page.getByTestId("compose-title").fill(title);
  await page.getByTestId("compose-content").fill("这是一条 e2e 自动化测试发布内容。");
  await page.getByTestId("compose-tags").fill("e2e,自动化");
  await page.getByTestId("compose-submit").click();
  await expect(page.getByText("发布成功")).toBeVisible();

  await page.goto(`/posts/${postId}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByTestId("comment-input").fill(comment);
  await page.getByTestId("comment-submit").click();
  await expect(page.getByText(comment)).toBeVisible();

  await page.getByTestId("reaction-up").click();
  await expect(page.getByText("👍 1")).toBeVisible();
});
