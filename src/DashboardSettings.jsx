import React, { useEffect, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { CARD_SLOTS, saveSettings } from "./dashboardSettings.js";
import { METRIC_MODES } from "../shared/dashboard-metrics.js";
import MetricGuide from "./MetricGuide.jsx";

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

  function updateMetric(id, field, value) {
    const metric = { ...draft[id].metric, [field]: value };
    if (field === "mode") {
      metric.property = value === "date_today" ? "날짜" : ["unchecked", "checked"].includes(value) ? "완료" : "";
      metric.value = "";
    }
    update(id, "metric", metric);
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
          <MetricGuide />
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
              <label htmlFor={`card-${id}-mode`}>표시할 숫자</label>
              <select id={`card-${id}-mode`} className="settings-select" value={draft[id].metric.mode}
                aria-label={`${position} 표시할 숫자`} onChange={(event) => updateMetric(id, "mode", event.target.value)}>
                {METRIC_MODES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
              {draft[id].metric.mode !== "none" && <>
                <label htmlFor={`card-${id}-source`}>집계 데이터베이스</label>
                <select id={`card-${id}-source`} className="settings-select" value={draft[id].metric.source}
                  aria-label={`${position} 집계 데이터베이스`} onChange={(event) => updateMetric(id, "source", event.target.value)}>
                  <option value="task">기존 할일 데이터베이스</option>
                  <option value="note">기존 노트 데이터베이스</option>
                  <option value="custom">다른 데이터베이스 직접 지정</option>
                </select>
                {draft[id].metric.source === "custom" && <>
                  <label htmlFor={`card-${id}-database`}>데이터베이스 링크 또는 ID</label>
                  <input id={`card-${id}-database`} value={draft[id].metric.database} inputMode="url" autoCapitalize="none"
                    spellCheck={false} required maxLength={4096} aria-label={`${position} 데이터베이스 링크 또는 ID`}
                    onChange={(event) => updateMetric(id, "database", event.target.value)} />
                </>}
                {["date_today", "unchecked", "checked", "equals"].includes(draft[id].metric.mode) && <>
                  <label htmlFor={`card-${id}-property`}>
                    {draft[id].metric.mode === "date_today" ? "날짜 속성 이름" : draft[id].metric.mode === "equals" ? "선택·상태 속성 이름" : "완료 체크박스 속성 이름"}
                  </label>
                  <input id={`card-${id}-property`} value={draft[id].metric.property} required maxLength={100}
                    aria-label={`${position} 속성 이름`} onChange={(event) => updateMetric(id, "property", event.target.value)} />
                </>}
                {draft[id].metric.mode === "equals" && <>
                  <label htmlFor={`card-${id}-value`}>집계할 선택·상태 값</label>
                  <input id={`card-${id}-value`} value={draft[id].metric.value} required maxLength={200}
                    aria-label={`${position} 선택·상태 값`} onChange={(event) => updateMetric(id, "value", event.target.value)} />
                </>}
              </>}
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
