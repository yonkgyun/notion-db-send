import React, { useEffect, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { CARD_SLOTS, saveSettings } from "./dashboardSettings.js";

export default function DashboardSettings({ cards, defaults, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [draft, setDraft] = useState(cards);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  function update(id, field, value) {
    setDraft((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
    setError("");
  }

  function submit(event) {
    event.preventDefault();
    try {
      const saved = saveSettings(window.localStorage, draft, defaults);
      onSave(saved);
      onClose();
    } catch (failure) {
      setError(failure.message || "설정을 저장하지 못했습니다.");
    }
  }

  return (
    <dialog ref={dialogRef} className="dashboard-settings" aria-labelledby="dashboard-settings-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <form className="settings-form" onSubmit={submit}>
        <header className="settings-heading">
          <h2 id="dashboard-settings-title">대시보드 설정</h2>
          <button type="button" className="dashboard-refresh" aria-label="설정 닫기" title="닫기" onClick={onClose} autoFocus>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="settings-fields">
          {CARD_SLOTS.map(({ id, position }) => (
            <fieldset key={id}>
              <legend>{position}</legend>
              <label htmlFor={`card-${id}-label`}>이름</label>
              <input id={`card-${id}-label`} value={draft[id].label} maxLength={40} required
                aria-label={`${position} 이름`} onChange={(event) => update(id, "label", event.target.value)} />
              <label htmlFor={`card-${id}-url`}>연결 링크</label>
              <input id={`card-${id}-url`} type="text" inputMode="url" autoCapitalize="none" autoCorrect="off"
                spellCheck={false} value={draft[id].url} placeholder="https://" maxLength={4096}
                aria-label={`${position} 연결 링크`} onChange={(event) => update(id, "url", event.target.value)} />
            </fieldset>
          ))}
        </div>
        <footer className="settings-footer">
          {error && <p className="settings-error" role="alert">{error}</p>}
          <div className="settings-actions">
            <button type="button" className="settings-reset" onClick={() => { setDraft(defaults); setError(""); }}>
              <RotateCcw size={16} aria-hidden="true" />기본값
            </button>
            <button type="submit" className="save-button">설정 저장</button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
