"use client";

import { useState } from "react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function DatePicker({ value, minDate, isDisabled, onChange }) {
  const initial = value ? new Date(value + "T00:00:00") : new Date(minDate + "T00:00:00");
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function toStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // その月の日付一覧（前後の空白含む）
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, background: "#fff", userSelect: "none" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button type="button" onClick={prevMonth}
          style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: "0 8px", color: "#333" }}>
          ‹
        </button>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{viewYear}年{viewMonth + 1}月</span>
        <button type="button" onClick={nextMonth}
          style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: "0 8px", color: "#333" }}>
          ›
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{
            textAlign: "center", fontSize: 11, fontWeight: 600, padding: "2px 0",
            color: i === 0 ? "#e55" : i === 6 ? "#55e" : "#888",
          }}>{w}</div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const dateStr = toStr(new Date(viewYear, viewMonth, day));
          const isBeforeMin = dateStr < minDate;
          const isInvalid = isDisabled(dateStr);
          const isSelected = dateStr === value;
          const disabled = isBeforeMin || isInvalid;
          const colIndex = i % 7; // 0=日, 6=土

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(dateStr)}
              style={{
                textAlign: "center",
                padding: "6px 2px",
                borderRadius: 6,
                border: "none",
                fontSize: 13,
                cursor: disabled ? "default" : "pointer",
                background: isSelected ? "#111" : "transparent",
                color: disabled
                  ? "#ccc"
                  : isSelected
                  ? "#fff"
                  : colIndex === 0
                  ? "#e55"
                  : colIndex === 6
                  ? "#55e"
                  : "#222",
                fontWeight: isSelected ? 700 : 400,
                textDecoration: isInvalid && !isBeforeMin ? "line-through" : "none",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
