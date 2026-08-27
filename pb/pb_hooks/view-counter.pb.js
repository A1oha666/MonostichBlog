// 文章访问计数：POST /api/monostich/views {"type":"notes"|"thinkings"|"moments","slug":"..."}
//
// 供静态站文章页在浏览器端调用；计数直接用 SQL 自增，故意不走
// record update（否则会命中 content-dispatch 钩子、每次浏览都触发重建）。
// 只统计 published 文章；返回自增后的最新数值供页面即时展示。

routerAdd("POST", "/api/monostich/views", (e) => {
    const body = e.requestInfo().body || {};
    const type = body.type || "";
    const slug = body.slug || "";

    if (!(["notes", "thinkings", "moments"].includes(type)) || !slug) {
        return e.json(400, { message: "invalid type or slug" });
    }

    let rec;
    try {
        rec = e.app.findFirstRecordByFilter(
            "articles",
            "type = {:type} && slug = {:slug} && status = {:status}",
            { type: type, slug: slug, status: "published" },
        );
    } catch {
        return e.json(404, { message: "article not found" });
    }

    const db = e.app.db();
    db.newQuery("UPDATE articles SET views = COALESCE(views, 0) + 1 WHERE id = {:id}")
        .bind({ id: rec.id })
        .execute();

    const row = new DynamicModel({ views: 0 });
    db.newQuery("SELECT views FROM articles WHERE id = {:id}")
        .bind({ id: rec.id })
        .one(row);

    return e.json(200, { views: row.views || 0 });
});
