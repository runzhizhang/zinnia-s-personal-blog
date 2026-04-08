import { apiFetch } from "../../components/api";

function groupByMonth(posts) {
  return posts.reduce((acc, p) => {
    const key = new Date(p.createdAt).toISOString().slice(0, 7);
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
}

export default async function ArchivePage() {
  let posts = [];
  let heatmap = [];
  try {
    posts = await apiFetch("/api/posts?page=1&pageSize=200");
    const stats = await apiFetch("/api/stats/heatmap?days=365");
    heatmap = stats.points || [];
  } catch (_e) {
    posts = [];
    heatmap = [];
  }
  const grouped = groupByMonth(posts);
  const months = Object.keys(grouped).sort().reverse();
  return (
    <main>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>归档</h2>
        <p>按年月聚合 + 发文热力图（最近 365 天）。</p>
        <div className="heatmapGrid">
          {heatmap.map((point) => (
            <span
              key={String(point.day)}
              className="heatmapCell"
              title={`${point.day}: ${point.count}`}
              style={{ opacity: Math.min(1, 0.15 + Number(point.count || 0) * 0.2) }}
            />
          ))}
        </div>
      </section>
      {months.map((month) => (
        <section className="card" key={month}>
          <h3 style={{ marginTop: 0 }}>{month}</h3>
          {grouped[month].map((post) => (
            <p key={post.id}>
              {new Date(post.createdAt).toLocaleDateString("zh-CN")} - <a href={`/posts/${post.id}`}>{post.title || post.content.slice(0, 30)}</a>
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
