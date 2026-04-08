"use client";

import { Suspense, useState, useLayoutEffect, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE, apiFetch } from "../../components/api";
import { getClientUser } from "../../hooks/useAuthStatus";
import { useModal } from "../../components/ModalProvider";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "bullet",
  "link",
  "image",
  "code-block"
];

function rewriteLegacyMediaUrl(value) {
  const html = String(value || "");
  return html.replace(
    /https?:\/\/localhost:9000\/media\/([^"'()\s<]+)/g,
    (_m, objectPath) => `${API_BASE}/api/media/file/${objectPath}`
  );
}

function ComposeForm() {
  const router = useRouter();
  const { alert, confirm } = useModal();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const quillRef = useRef(null);
  const imageInputRef = useRef(null);

  const [allowed, setAllowed] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [loadingPost, setLoadingPost] = useState(Boolean(editId));
  const [uploadingImage, setUploadingImage] = useState(false);
  /** 发布/保存成功后的页内提示（不用 Modal） */
  const [formHint, setFormHint] = useState("");

  useLayoutEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setAllowed(true);
  }, [router]);

  useEffect(() => {
    if (!editId || !allowed) return;
    let cancelled = false;
    (async () => {
      setLoadingPost(true);
      try {
        const post = await apiFetch(`/api/posts/${editId}`);
        const me = getClientUser();
        if (post.userId && me?.id && post.userId !== me.id) {
          if (!cancelled) await alert({ message: "无权编辑此文章" });
          if (!cancelled) router.push("/");
          return;
        }
        if (!cancelled) {
          setTitle(post.title || "");
          setContent(rewriteLegacyMediaUrl(post.content || ""));
          setVisibility(post.visibility || "public");
          setTags(
            (post.tags || [])
              .map((t) => t.tag?.name)
              .filter(Boolean)
              .join(", "),
          );
        }
      } catch (e) {
        if (!cancelled) await alert({ message: e.message || "加载失败" });
        if (!cancelled) router.push("/");
      } finally {
        if (!cancelled) setLoadingPost(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, allowed, alert, router]);

  useEffect(() => {
    if (editId) setFormHint("");
  }, [editId]);

  const quillModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"]
        ],
        handlers: {
          image: () => imageInputRef.current?.click()
        }
      }
    }),
    []
  );

  function isEditorEmpty(html) {
    const plain = String(html || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    return plain.length === 0;
  }

  async function onPickImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    console.info("[compose] image picked", {
      name: file.name,
      type: file.type,
      size: file.size,
      editId: editId || null
    });
    const token = localStorage.getItem("token");
    if (!token) {
      await alert({ message: "请先登录后再上传图片" });
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      if (editId) fd.append("postId", editId);
      fd.append("filename", file.name);
      fd.append("file", file, file.name);
      const resp = await fetch(`${API_BASE}/api/media/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      console.info("[compose] upload response", {
        status: resp.status,
        ok: resp.ok
      });
      const txt = await resp.text();
      console.info("[compose] upload payload", txt?.slice(0, 300));
      if (!resp.ok) {
        let msg = txt || `Request failed: ${resp.status}`;
        try {
          const json = JSON.parse(txt);
          if (json?.message) msg = json.message;
        } catch {}
        throw new Error(msg);
      }
      const json = txt ? JSON.parse(txt) : null;
      const imageUrl = json?.url
        ? json.url.startsWith("http")
          ? json.url
          : `${API_BASE}${json.url}`
        : null;
      if (!imageUrl) throw new Error("上传返回缺少图片地址");
      console.info("[compose] image url", imageUrl);

      // 主动验证图片 URL 是否可访问，避免“上传成功但资源不可读”难排查
      await new Promise((resolve, reject) => {
        const probe = new Image();
        probe.onload = () => {
          console.info("[compose] image probe ok", {
            width: probe.naturalWidth,
            height: probe.naturalHeight
          });
          resolve();
        };
        probe.onerror = () => {
          console.error("[compose] image probe failed", imageUrl);
          reject(new Error("图片地址不可访问"));
        };
        probe.src = `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}probe=${Date.now()}`;
      });

      const editor = quillRef.current?.getEditor?.();
      if (!editor) {
        console.warn("[compose] editor not ready, fallback to append html");
        setContent((prev) => `${prev || ""}<p><img src="${imageUrl}" alt="image" /></p>`);
        return;
      }
      const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
      editor.focus();
      editor.insertEmbed(range.index, "image", imageUrl, "user");
      editor.insertText(range.index + 1, "\n", "user");
      editor.setSelection(range.index + 2, 0);

      // ReactQuill 受控模式下，手动同步一次 state，避免插入后被旧值覆盖
      setContent(editor.root.innerHTML);

      // 某些场景 insertEmbed 不落地，回退为直接插入 HTML，保证可见
      queueMicrotask(() => {
        const inserted = editor.root.querySelector(`img[src="${imageUrl}"]`);
        if (!inserted) {
          console.warn("[compose] insertEmbed missed, fallback to HTML insert");
          editor.clipboard.dangerouslyPasteHTML(
            range.index,
            `<p><img src="${imageUrl}" alt="image" /></p>`
          );
          setContent(editor.root.innerHTML);
        }
        console.info("[compose] image inserted to editor", {
          ok: Boolean(editor.root.querySelector(`img[src="${imageUrl}"]`)),
          htmlLength: editor.root.innerHTML.length
        });
      });
    } catch (error) {
      console.error("[compose] upload failed", error);
      await alert({ message: `上传失败: ${error.message}` });
    } finally {
      setUploadingImage(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setFormHint("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        await alert({ message: "请先登录后再发布" });
        return;
      }
      if (isEditorEmpty(content)) {
        await alert({ message: "正文不能为空" });
        return;
      }
      const body = {
        title: title.trim() || undefined,
        content,
        visibility,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      console.info("[compose] submit diagnostics", {
        contentLength: String(content || "").length,
        hasImg: /<img/i.test(String(content || ""))
      });
      if (editId) {
        await apiFetch(`/api/posts/${editId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        setFormHint("保存成功");
        window.setTimeout(() => router.push(`/posts/${editId}`), 800);
        return;
      }
      const created = await apiFetch("/api/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      setFormHint("发布成功");
      setTimeout(() => {
        setContent("");
        setTitle("");
        setTags("");
        if (created?.id) {
          router.push(`/posts/${created.id}`);
        }
      }, 800);
    } catch (error) {
      setFormHint("");
      await alert({ message: `${editId ? "保存" : "发布"}失败: ${error.message}` });
    }
  }

  async function onCancel() {
    const dirty =
      title.trim() !== "" ||
      content.trim() !== "" ||
      tags.trim() !== "" ||
      visibility !== "public";
    if (dirty && !(await confirm({ message: "确定放弃当前编辑？" }))) {
      return;
    }
    router.push("/");
  }

  if (!allowed) {
    return (
      <main className="card">
        <p style={{ margin: 0 }}>校验登录状态…</p>
      </main>
    );
  }

  if (editId && loadingPost) {
    return (
      <main className="card">
        <p style={{ margin: 0 }}>加载文章…</p>
      </main>
    );
  }

  return (
    <main>
      <form className="card" onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>{editId ? "编辑文章" : "发布内容"}</h2>
        <div className="toolbar">
          <input
            data-testid="compose-title"
            placeholder="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            data-testid="compose-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="public">公开</option>
            <option value="password">密码保护</option>
            <option value="private">私密</option>
          </select>
        </div>
        <div className="compose-editor-wrap" data-testid="compose-content">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={setContent}
            modules={quillModules}
            formats={quillFormats}
            placeholder="记录此刻..."
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onPickImage}
            disabled={uploadingImage}
          />
        </div>
        <input
          data-testid="compose-tags"
          style={{ width: "100%", marginTop: 10 }}
          placeholder="标签，逗号分隔"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <div
          className="compose-actions toolbar"
          style={{ marginTop: 12, alignItems: "center" }}
        >
          <button data-testid="compose-submit" type="submit">
            {editId ? "保存" : "发布"}
          </button>
          <button
            data-testid="compose-cancel"
            type="button"
            className="btn-secondary"
            onClick={onCancel}
          >
            取消
          </button>
          <small style={{ marginLeft: "auto", color: "#6b7280" }}>
            Cmd/Ctrl + Enter 可提交
          </small>
        </div>
        {formHint ? (
          <p className="compose-form-message" role="status">
            {formHint}
          </p>
        ) : null}
      </form>
    </main>
  );
}

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <main className="card">
          <p style={{ margin: 0 }}>加载中…</p>
        </main>
      }
    >
      <ComposeForm />
    </Suspense>
  );
}
