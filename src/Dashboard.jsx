import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckSquare2, Link2, NotebookPen, RefreshCw, Settings } from "lucide-react";
import DashboardSettings from "./DashboardSettings.jsx";
import { parseSettings, readSettings, resolveCards, SETTINGS_KEY } from "./dashboardSettings.js";

const CARDS = [
  { kind: "task", Icon: CheckSquare2 },
  { kind: "note", Icon: NotebookPen }
];

export default function Dashboard({ revision }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(() => {
    try { return readSettings(window.localStorage); } catch { return {}; }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef(null);
  const refreshRef = useRef(() => {});
  const cards = resolveCards(settings, data);

  useEffect(() => {
    function sync(event) {
      if (event.storageArea === window.localStorage && (event.key === SETTINGS_KEY || event.key === null)) {
        setSettings(event.key === null ? {} : parseSettings(event.newValue));
      }
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function closeSettings() {
    setSettingsOpen(false);
    requestAnimationFrame(() => settingsButtonRef.current?.focus());
  }

  useEffect(() => {
    let active = true;
    let controller;
    let rolloverTimer;

    async function refresh() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      setLoading(true);
      setError("");
      const timeout = window.setTimeout(() => current.abort(), 20000);
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store", signal: current.signal });
        const payload = await response.json();
        if (!response.ok || !payload.task || !payload.note) throw new Error();
        if (active && controller === current) setData(payload);
      } catch {
        if (active && controller === current) {
          setData(null);
          setError("기록 수를 불러오지 못했습니다. 새로고침으로 다시 시도해주세요.");
        }
      } finally {
        window.clearTimeout(timeout);
        if (active && controller === current) setLoading(false);
      }
    }

    function onReturn() {
      if (document.visibilityState === "visible") refresh();
    }

    function scheduleRollover() {
      const dayMs = 86400000;
      const delay = dayMs - ((Date.now() + 9 * 3600000) % dayMs) + 500;
      rolloverTimer = window.setTimeout(() => {
        onReturn();
        scheduleRollover();
      }, delay);
    }

    refreshRef.current = refresh;
    refresh();
    scheduleRollover();
    window.addEventListener("focus", onReturn);
    window.addEventListener("online", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      active = false;
      controller?.abort();
      window.clearTimeout(rolloverTimer);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("online", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [revision]);

  return (
    <section className="dashboard" aria-label="오늘의 기록">
      <div className="dashboard-heading">
        <h2>오늘의 기록</h2>
        <div className="dashboard-tools">
          <button className="dashboard-refresh" type="button" aria-label="기록 수 새로고침"
            title="기록 수 새로고침" disabled={loading} onClick={() => refreshRef.current()}>
            <RefreshCw size={17} aria-hidden="true" />
          </button>
          <button ref={settingsButtonRef} className="dashboard-refresh" type="button" aria-label="대시보드 설정"
            title="대시보드 설정" aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}>
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="dashboard-grid" aria-busy={loading}>
        {CARDS.map(({ kind, Icon }) => {
          const result = data?.[kind];
          const { label, url } = cards[kind];
          const Card = url ? "a" : "div";
          const failed = !loading && (error || result?.error || !Number.isInteger(result?.count));
          return (
            <Card className={`dashboard-card dashboard-${kind}`} key={kind}
              {...(url ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {})}
              aria-label={`${label}, ${loading ? "불러오는 중" : failed ? "조회 실패" : `${result.count}개`}${url ? ". 연결 페이지 열기" : ""}`}>
              <div className="dashboard-card-top">
                <Icon size={18} aria-hidden="true" />
                {url && <ArrowUpRight size={15} aria-hidden="true" />}
              </div>
              <span className="dashboard-label" title={label}>{label}</span>
              <div className="dashboard-value" aria-live="polite">
                {loading ? <span className="dashboard-status">불러오는 중</span> : failed ?
                  <span className="dashboard-status">조회 실패</span> :
                  <><strong>{result.count.toLocaleString("ko-KR")}</strong><span>개</span></>}
              </div>
            </Card>
          );
        })}
        {["shortcut1", "shortcut2"].map((id) => {
          const { label, url } = cards[id];
          return url ? (
            <a className="dashboard-card dashboard-shortcut" key={id} href={url} target="_blank" rel="noopener noreferrer"
              aria-label={`${label}. 연결 페이지 열기`}>
              <div className="dashboard-card-top"><Link2 size={18} aria-hidden="true" /><ArrowUpRight size={15} aria-hidden="true" /></div>
              <span className="dashboard-label" title={label}>{label}</span>
            </a>
          ) : (
            <div className="dashboard-card dashboard-pending" key={id}>
              <span className="dashboard-label" title={label}>{label}</span>
            </div>
          );
        })}
      </div>
      {!loading && (error || data?.task?.error || data?.note?.error) && (
        <p className="dashboard-error" role="status">
          {error || [data.task?.error && `할일: ${data.task.error}`, data.note?.error && `노트: ${data.note.error}`].filter(Boolean).join(" ")}
        </p>
      )}
      {settingsOpen && <DashboardSettings cards={cards} defaults={resolveCards({}, data)}
        onSave={setSettings} onClose={closeSettings} />}
    </section>
  );
}
