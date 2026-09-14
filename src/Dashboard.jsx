import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckSquare2, NotebookPen, RefreshCw } from "lucide-react";
import { DATABASES } from "../shared/databases.js";

const CARDS = [
  { kind: "task", label: "오늘 기록한 할일", Icon: CheckSquare2 },
  { kind: "note", label: "오늘 기록한 노트", Icon: NotebookPen }
];

export default function Dashboard({ revision }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refreshRef = useRef(() => {});

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
        <button className="dashboard-refresh" type="button" aria-label="기록 수 새로고침"
          title="기록 수 새로고침" disabled={loading} onClick={() => refreshRef.current()}>
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="dashboard-grid" aria-busy={loading}>
        {CARDS.map(({ kind, label, Icon }) => {
          const result = data?.[kind];
          const failed = !loading && (error || result?.error || !Number.isInteger(result?.count));
          return (
            <a className={`dashboard-card dashboard-${kind}`} key={kind}
              href={result?.url || DATABASES[kind].url} target="_blank" rel="noopener noreferrer"
              aria-label={`${label}, ${loading ? "불러오는 중" : failed ? "조회 실패" : `${result.count}개`}. Notion 데이터베이스 열기`}>
              <div className="dashboard-card-top">
                <Icon size={18} aria-hidden="true" />
                <ArrowUpRight size={15} aria-hidden="true" />
              </div>
              <span className="dashboard-label">{label}</span>
              <div className="dashboard-value" aria-live="polite">
                {loading ? <span className="dashboard-status">불러오는 중</span> : failed ?
                  <span className="dashboard-status">조회 실패</span> :
                  <><strong>{result.count.toLocaleString("ko-KR")}</strong><span>개</span></>}
              </div>
            </a>
          );
        })}
        {[1, 2].map((number) => (
          <div className="dashboard-card dashboard-pending" key={number} aria-label={`준비 중 ${number}`}>
            <span>준비 중</span>
          </div>
        ))}
      </div>
      {!loading && (error || data?.task?.error || data?.note?.error) && (
        <p className="dashboard-error" role="status">
          {error || [data.task?.error && `할일: ${data.task.error}`, data.note?.error && `노트: ${data.note.error}`].filter(Boolean).join(" ")}
        </p>
      )}
    </section>
  );
}
