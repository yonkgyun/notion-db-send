import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckSquare2, Link2, NotebookPen, RefreshCw, Settings } from "lucide-react";
import DashboardSettings from "./DashboardSettings.jsx";
import { CARD_SLOTS, parseSettings, readSettings, resolveCards, SETTINGS_KEY } from "./dashboardSettings.js";

export default function Dashboard({ revision }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const [settings, setSettings] = useState(() => {
    try { return readSettings(window.localStorage); } catch { return {}; }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef(null);
  const refreshRef = useRef(() => {});
  const cards = resolveCards(settings, data);
  const metricKey = JSON.stringify(Object.fromEntries(CARD_SLOTS.map(({ id }) => [id, cards[id].metric])));
  const enabledIds = CARD_SLOTS.filter(({ id }) => cards[id].metric.mode !== "none").map(({ id }) => id);
  const waiting = loading || loadedKey !== metricKey;

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
      const timeout = window.setTimeout(() => current.abort(), 30000);
      try {
        const metrics = JSON.parse(metricKey);
        const enabled = CARD_SLOTS.filter(({ id }) => metrics[id].mode !== "none");
        if (!enabled.length) return;
        const response = await fetch(`/api/dashboard?cards=${encodeURIComponent(metricKey)}`, { cache: "no-store", signal: current.signal });
        const payload = await response.json();
        if (!response.ok || enabled.some(({ id }) => !payload[id])) throw new Error();
        if (active && controller === current) setData(payload);
      } catch {
        if (active && controller === current) {
          setData(null);
          setError("기록 수를 불러오지 못했습니다. 새로고침으로 다시 시도해주세요.");
        }
      } finally {
        window.clearTimeout(timeout);
        if (active && controller === current) {
          setLoadedKey(metricKey);
          setLoading(false);
        }
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
  }, [revision, metricKey]);

  return (
    <section className="dashboard" aria-label="대시보드">
      <div className="dashboard-heading">
        <div className="dashboard-tools">
          <button className="dashboard-refresh" type="button" aria-label="기록 수 새로고침"
            title="기록 수 새로고침" disabled={waiting || enabledIds.length === 0} onClick={() => refreshRef.current()}>
            <RefreshCw size={17} aria-hidden="true" />
          </button>
          <button ref={settingsButtonRef} className="dashboard-refresh" type="button" aria-label="대시보드 설정"
            title="대시보드 설정" aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}>
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="dashboard-grid" aria-busy={waiting && enabledIds.length > 0}>
        {CARD_SLOTS.map(({ id }) => {
          const result = data?.[id];
          const { label, url, metric } = cards[id];
          const showCount = metric.mode !== "none";
          const Icon = !showCount ? Link2 : metric.source === "note" ? NotebookPen : CheckSquare2;
          const kind = showCount ? metric.source : "shortcut";
          const Card = url ? "a" : "div";
          const failed = !waiting && (error || result?.error || !Number.isInteger(result?.count));
          const status = !showCount ? "" : `, ${waiting ? "불러오는 중" : failed ? "조회 실패" : `${result.count}개`}`;
          return (
            <Card className={`dashboard-card dashboard-${kind}${!showCount && !url ? " dashboard-pending" : ""}`} key={id}
              {...(url ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {})}
              aria-label={`${label}${status}${url ? ". 연결 페이지 열기" : ""}`}>
              {(showCount || url) && <div className="dashboard-card-top">
                <Icon size={18} aria-hidden="true" />
                {url && <ArrowUpRight size={15} aria-hidden="true" />}
              </div>}
              <span className="dashboard-label" title={label}>{label}</span>
              {showCount && <div className="dashboard-value" aria-live="polite">
                {waiting ? <span className="dashboard-status">불러오는 중</span> : failed ?
                  <span className="dashboard-status">조회 실패</span> :
                  <><strong>{result.count.toLocaleString("ko-KR")}</strong><span>개</span></>}
              </div>}
            </Card>
          );
        })}
      </div>
      {!waiting && enabledIds.length > 0 && (error || enabledIds.some((id) => data?.[id]?.error)) && (
        <p className="dashboard-error" role="status">
          {error || enabledIds.filter((id) => data?.[id]?.error).map((id) => `${cards[id].label}: ${data[id].error}`).join(" ")}
        </p>
      )}
      {settingsOpen && <DashboardSettings cards={cards} defaults={resolveCards({}, data)}
        onSave={setSettings} onClose={closeSettings} />}
    </section>
  );
}
