"use client";
import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { SearchResponse } from "@/lib/types";
import { formatSeconds } from "@/lib/format";

function highlight(json: string) {
  // Tiny tokenizer: keys, strings, numbers/literals
  const parts: React.ReactNode[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(json))) {
    if (m.index > last) parts.push(json.slice(last, m.index));
    if (m[1] && m[2]) parts.push(<span key={i++} className="text-ink-300">{m[1]}</span>, m[2]);
    else if (m[1]) parts.push(<span key={i++} className="text-hl">{m[1]}</span>);
    else parts.push(<span key={i++} className="text-seal-200">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  parts.push(json.slice(last));
  return parts;
}

function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-2 py-1.5 text-[13px]">
      <dt className="text-muted">{k}</dt>
      <dd className="min-w-0 break-words font-medium">{children}</dd>
    </div>
  );
}

function Tags({ items, empty = "không có" }: { items: string[]; empty?: string }) {
  if (!items.length) return <span className="font-normal text-faint">{empty}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((x) => (
        <span key={x} className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12px] font-normal text-ink-800">
          {x}
        </span>
      ))}
    </span>
  );
}

/** Lecturer-facing: the parsed representation and how scores are made. Hidden unless Inspect is on. */
export function InspectPanel({ resp, browse }: { resp: SearchResponse | null; browse: boolean }) {
  const [copied, setCopied] = useState(false);
  const rep = resp?.representation;
  const json = useMemo(() => (rep ? JSON.stringify(rep, null, 2) : ""), [rep]);
  if (!resp || !rep) {
    return (
      <div className="rounded-lg border border-line bg-sheet p-4 text-[14px] text-muted" aria-label="Inspect">
        Chưa có dữ liệu truy vấn.
      </div>
    );
  }
  const hard = Object.entries(rep.hard_filters).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("|") : String(v)}`);
  const soft = Object.entries(rep.soft_preferences).map(([k, v]) => `${k}=${v.join("|")}`);

  return (
    <aside aria-label="Inspect: biểu diễn truy vấn và điểm xếp hạng" className="overflow-hidden rounded-lg border border-ink-300 bg-sheet">
      <div className="flex items-center justify-between bg-ink-800 px-3.5 py-2.5 text-white">
        <h2 className="text-[14px] font-bold">Inspect</h2>
        <span className="num text-[12px] text-white/75">
          {browse ? "duyệt danh mục" : `${rep.parser === "llm" ? "LLM" : "rules"} · ${formatSeconds(resp.latency_ms)}`}
        </span>
      </div>
      <div className="px-3.5 py-2">
        {browse ? (
          <p className="py-2 text-[13px] text-muted">Đang duyệt danh mục nên không có bước phân tích truy vấn. Gõ hoặc nói một truy vấn để xem biểu diễn.</p>
        ) : (
          <dl className="divide-y divide-line">
            <KV k="Phương thức">{rep.modality}</KV>
            <KV k="Ý định">{rep.intent}</KV>
            <KV k="Ngôn ngữ">{rep.language ?? "?"}</KV>
            <KV k="Chuẩn hóa">
              <span className="font-mono text-[12.5px]">{rep.normalized_text ?? "—"}</span>
            </KV>
            <KV k="Lọc cứng">
              <Tags items={hard} />
            </KV>
            <KV k="Ưu tiên mềm">
              <Tags items={soft} />
            </KV>
            <KV k="Mở rộng">
              <Tags items={rep.expansion_terms} />
            </KV>
            <KV k="Đã nới lọc">
              <Tags items={resp.relaxed_filters} empty="không" />
            </KV>
            <KV k="Kết quả">
              <span className="num">{resp.total}</span>
            </KV>
          </dl>
        )}
      </div>

      <div className="border-t border-line px-3.5 py-3 text-[12.5px] text-muted">
        <p className="mb-2 font-semibold text-fg">Điểm xếp hạng trên mỗi thẻ</p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
          <li className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-ink-500" />Văn bản</li>
          <li className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-ink-300" />Ảnh</li>
          <li className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-star" />Kinh doanh</li>
          <li className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-ok" />Ưu tiên mềm</li>
        </ul>
        <p className="pretty mt-2">Điểm cuối là tổng có trọng số của bốn thành phần, trong khoảng 0 đến 1.</p>
      </div>

      <details className="border-t border-line">
        <summary className="flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-[13px] font-semibold hover:bg-ink-50">
          JSON gốc
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              void navigator.clipboard?.writeText(json).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              });
            }}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] font-medium text-ink-600 hover:bg-ink-100"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Đã chép" : "Chép"}
          </button>
        </summary>
        <pre className="max-h-[340px] overflow-auto bg-ink-950 p-3.5 font-mono text-[12px] leading-relaxed text-white/85">{highlight(json)}</pre>
      </details>
    </aside>
  );
}
