import HomeTimeline from "../components/HomeTimeline";
import { apiFetch } from "../components/api";

export default async function HomePage() {
  let initialPosts = [];
  let tags = [];
  try {
    [initialPosts, tags] = await Promise.all([
      apiFetch("/api/posts?page=1&pageSize=20"),
      apiFetch("/api/tags")
    ]);
  } catch (_error) {
    initialPosts = [];
    tags = [];
  }

  return (
    <main>
      <HomeTimeline initialPosts={initialPosts} tags={tags} />
    </main>
  );
}
