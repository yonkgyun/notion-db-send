import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Send } from "lucide-react";
import "./styles.css";

const TEXT = {
  title: "\uBE60\uB978 \uB4F1\uB85D",
  subtitle: "Notion quick capture",
  type: "\uC720\uD615",
  typeEmpty: "\uC120\uD0DD",
  typeLoading: "\uC720\uD615 \uBD88\uB7EC\uC624\uB294 \uC911",
  typeNoOptions: "\uC720\uD615 \uC635\uC158 \uC5C6\uC74C",
  titleLabel: "\uC81C\uBAA9",
  titlePlaceholder: "\uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694",
  memoLabel: "\uBA54\uBAA8",
  memoPlaceholder: "\uBA54\uBAA8\uB97C \uC785\uB825\uD558\uC138\uC694",
  saving: "\uC800\uC7A5 \uC911",
  save: "\uC800\uC7A5",
  saved: "Notion\uC5D0 \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.",
  saveFailed: "\uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  typeLoadFailed: "\uC720\uD615 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
  savingError: "\uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
};

function App() {
  const [content, setContent] = useState("");
  const [memo, setMemo] = useState("");
  const [type, setType] = useState("");
  const [typePropertyName, setTypePropertyName] = useState("\uC720\uD615");
  const [typeOptions, setTypeOptions] = useState([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
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
    setIsLoadingTypes(true);

    try {
      const response = await fetch("/api/database-options");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || TEXT.typeLoadFailed);
      }

      setTypeOptions(payload.options || []);
      setTypePropertyName(payload.propertyName || "\uC720\uD615");
    } catch (error) {
      showToast(error.message || TEXT.typeLoadFailed, "error");
    } finally {
      setIsLoadingTypes(false);
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
        body: JSON.stringify({ content: trimmed, memo, type, typePropertyName })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || TEXT.saveFailed);
      }

      setContent("");
      setMemo("");
      showToast(TEXT.saved, "success");
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (error) {
      showToast(error.message || TEXT.savingError, "error");
      requestAnimationFrame(() => textareaRef.current?.focus());
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="quick-panel" aria-label={TEXT.title}>
        <header className="app-header">
          <p className="eyebrow">{TEXT.subtitle}</p>
          <h1>{TEXT.title}</h1>
        </header>

        <form className="memo-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>{TEXT.type}</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              disabled={isSaving || isLoadingTypes || typeOptions.length === 0}
            >
              <option value="">
                {isLoadingTypes ? TEXT.typeLoading : typeOptions.length === 0 ? TEXT.typeNoOptions : TEXT.typeEmpty}
              </option>
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>{TEXT.titleLabel}</span>
            <textarea
              className="title-textarea"
              ref={textareaRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={TEXT.titlePlaceholder}
              aria-label={TEXT.titleLabel}
              rows={8}
              disabled={isSaving}
            />
          </label>

          <label className="form-field">
            <span>{TEXT.memoLabel}</span>
            <textarea
              className="memo-textarea"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder={TEXT.memoPlaceholder}
              aria-label={TEXT.memoLabel}
              rows={4}
              disabled={isSaving}
            />
          </label>

          <button className="save-button" type="submit" disabled={isSaving || !content.trim()}>
            <Send size={22} strokeWidth={2.3} aria-hidden="true" />
            <span>{isSaving ? TEXT.saving : TEXT.save}</span>
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
