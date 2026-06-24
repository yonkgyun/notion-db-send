import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Send } from "lucide-react";
import "./styles.css";

function App() {
  const [content, setContent] = useState("");
  const [type, setType] = useState("");
  const [typeOptions, setTypeOptions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const textareaRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
    loadTypeOptions();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }
  }, []);

  async function loadTypeOptions() {
    try {
      const response = await fetch("/api/database-options");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || "유형 목록을 불러오지 못했습니다.");
      }

      setTypeOptions(payload.options || []);
    } catch (error) {
      showToast(error.message || "유형 목록을 불러오지 못했습니다.", "error");
    }
  }

  function showToast(message, toastType = "success") {
    window.clearTimeout(toastTimerRef.current);
    setToast({ message, type: toastType });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmed = content.trim();
    if (!trimmed || isSaving) {
      textareaRef.current?.focus();
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/create-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content: trimmed, type })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || "저장에 실패했습니다.");
      }

      setContent("");
      showToast("Notion에 저장했습니다.", "success");
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (error) {
      showToast(error.message || "저장 중 오류가 발생했습니다.", "error");
      requestAnimationFrame(() => textareaRef.current?.focus());
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="quick-panel" aria-label="빠른 등록">
        <header className="app-header">
          <p className="eyebrow">Notion quick capture</p>
          <h1>빠른 등록</h1>
        </header>

        <form className="memo-form" onSubmit={handleSubmit}>
          <label className="type-field">
            <span>유형</span>
            <select value={type} onChange={(event) => setType(event.target.value)} disabled={isSaving}>
              <option value="">선택 안 함</option>
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="내용을 입력하세요"
            aria-label="내용"
            rows={8}
            disabled={isSaving}
          />

          <button className="save-button" type="submit" disabled={isSaving || !content.trim()}>
            <Send size={22} strokeWidth={2.3} aria-hidden="true" />
            <span>{isSaving ? "저장 중" : "저장"}</span>
          </button>
        </form>
      </section>

      {toast && (
        <div className={`toast ${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
