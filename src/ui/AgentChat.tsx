import { useEffect, useRef, useState, type FormEvent, type JSX } from "react";
import { Check, Copy, Mail, MapPin, Phone, SendHorizontal, X } from "lucide-react";
import { company } from "../data";
import { reply, understand, type AgentAction, type AgentCard, type AgentReply } from "../lib/agent";
import { useLab } from "../state/store";

interface Message extends Partial<AgentReply> {
  id: number;
  from: "agent" | "user";
  text: string;
}

let messageId = 0;

export function AgentAvatar({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="shrink-0 rounded-full bg-teal/15">
      <circle cx="24" cy="24" r="24" fill="#d9f3f1" />
      <path d="M8 48c1-9 7-13 16-13s15 4 16 13z" fill="#fff" />
      <path d="M21 35h6l-3 7z" fill="#0f8a88" />
      <circle cx="24" cy="21" r="9.5" fill="#9a6646" />
      <path d="M14.5 19c0-6 4-9.5 9.5-9.5s9.5 3.5 9.5 9.5c-2-3-5-4.5-9.5-4.5S16.5 16 14.5 19z" fill="#1d1714" />
      <circle cx="20.5" cy="21.5" r="2.6" fill="none" stroke="#3b4148" strokeWidth="0.9" />
      <circle cx="27.5" cy="21.5" r="2.6" fill="none" stroke="#3b4148" strokeWidth="0.9" />
      <circle cx="20.5" cy="21.6" r="1" fill="#16110f" />
      <circle cx="27.5" cy="21.6" r="1" fill="#16110f" />
      <path d="M21 26c1.8 1.6 4.2 1.6 6 0" stroke="#6e3a2c" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="grid size-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink"
    >
      {copied ? <Check className="size-4 text-teal" /> : <Copy className="size-4" />}
    </button>
  );
}

export function ContactCard() {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-teal/12 text-teal">
          <Phone className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Phone</div>
          <a href={`tel:${company.phoneIntl}`} className="font-semibold text-ink hover:text-brand">
            {company.phone}
          </a>
        </div>
        <CopyButton value={company.phone} label="phone number" />
        <a href={`tel:${company.phoneIntl}`} className="rounded-full bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0b8f8f]">
          Call
        </a>
      </div>
      <div className="flex items-center gap-3 border-t border-line px-3 py-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-brand/10 text-brand">
          <Mail className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</div>
          <a href={`mailto:${company.email}`} className="block truncate font-semibold text-ink hover:text-brand">
            {company.email}
          </a>
        </div>
        <CopyButton value={company.email} label="email address" />
        <a href={`mailto:${company.email}`} className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#09529a]">
          Email
        </a>
      </div>
    </div>
  );
}

function LocationCard() {
  return (
    <div className="mt-2 flex items-start gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-teal/12 text-teal">
        <MapPin className="size-4" />
      </span>
      <div className="flex-1 text-sm">
        <div className="font-semibold">{company.address ?? "Address on request"}</div>
        {company.mapUrl && (
          <a href={company.mapUrl} target="_blank" rel="noreferrer" className="text-brand underline">
            Open in maps
          </a>
        )}
      </div>
    </div>
  );
}

function SuppliesCard() {
  return (
    <ul className="mt-2 grid grid-cols-2 gap-1.5">
      {company.supplies.map((s) => (
        <li key={s} className="rounded-lg border border-line bg-white px-2.5 py-2 text-xs font-semibold text-ink">
          {s}
        </li>
      ))}
    </ul>
  );
}

const CARDS: Record<AgentCard, () => JSX.Element> = { contact: ContactCard, location: LocationCard, supplies: SuppliesCard };

/** Reveals the latest agent message a few characters at a time, while the 3D agent's mouth moves. */
function Typed({ text, onDone }: { text: string; onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(text.length);
      done.current();
      return;
    }
    useLab.getState().talk(Math.min(6, text.length / 55));
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(text.length, i + 3);
      setShown(i);
      if (i >= text.length) {
        clearInterval(id);
        done.current();
      }
    }, 16);
    return () => clearInterval(id);
  }, [text]);
  return <>{text.slice(0, shown)}</>;
}

export function AgentChat({ onClose, inline = false }: { onClose?: () => void; inline?: boolean }) {
  const [messages, setMessages] = useState<Message[]>(() => [{ id: ++messageId, from: "agent", ...reply("greet") }]);
  const [typingDone, setTypingDone] = useState<number>(-1);
  const [draft, setDraft] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, typingDone]);

  const push = (userText: string, agent: AgentReply) =>
    setMessages((m) => [...m, { id: ++messageId, from: "user", text: userText }, { id: ++messageId, from: "agent", ...agent }]);

  const act = (action: AgentAction) => {
    if (action.type === "ask") push(action.label, reply(action.intent));
    if (action.type === "travel") {
      onClose?.();
      useLab.getState().travelTo(action.target);
    }
    if (action.type === "inspect") useLab.getState().openInspect({ type: action.kind, id: action.id });
    if (action.type === "link") window.location.href = action.href;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    push(text, understand(text));
  };

  return (
    <div className={`flex min-h-0 flex-col ${inline ? "h-[32rem] rounded-2xl border border-line bg-mist/60" : "h-full"}`}>
      <div className="flex items-center gap-3 border-b border-line/80 px-4 py-3">
        <AgentAvatar />
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-bold leading-tight text-navy">{company.agentTitle}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="size-2 rounded-full bg-emerald-500" /> Here to help
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close chat" className="grid size-9 place-items-center rounded-full hover:bg-slate-100">
            <X className="size-5" />
          </button>
        )}
      </div>

      <div ref={list} className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((m) => {
          const isLast = m.id === last.id;
          const Card = m.card ? CARDS[m.card] : null;
          const finished = !isLast || typingDone === m.id;
          if (m.from === "user")
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-sm text-white">{m.text}</div>
              </div>
            );
          return (
            <div key={m.id} className="animate-rise flex items-start gap-2">
              <AgentAvatar size={28} />
              <div className="min-w-0 max-w-[88%] flex-1">
                <div className="rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink shadow-sm">
                  {isLast ? <Typed text={m.text} onDone={() => setTypingDone(m.id)} /> : m.text}
                </div>
                {finished && Card && <Card />}
                {finished && isLast && m.actions && m.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.actions.map((a) =>
                      a.type === "link" ? (
                        <a key={a.label} href={a.href} className="rounded-full border border-teal bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0b8f8f]">
                          {a.label}
                        </a>
                      ) : (
                        <button
                          key={a.label}
                          type="button"
                          onClick={() => act(a)}
                          className="rounded-full border border-teal/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#087a7a] transition hover:border-teal hover:bg-teal/8"
                        >
                          {a.label}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line/80 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about contact details, products…"
          aria-label="Message the sales agent"
          className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-teal"
        />
        <button type="submit" aria-label="Send" className="grid size-10 place-items-center rounded-full bg-teal text-white transition hover:bg-[#0b8f8f] disabled:opacity-40" disabled={!draft.trim()}>
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function AgentDialog() {
  const open = useLab((s) => s.agentOpen);
  const close = useLab((s) => s.closeAgent);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);
  if (!open) return null;
  return (
    <aside
      role="dialog"
      aria-label="Chat with the Labmate sales agent"
      className="panel animate-rise fixed inset-x-2 bottom-2 z-30 flex h-[min(58vh,520px)] flex-col overflow-hidden rounded-2xl sm:inset-x-auto sm:right-4 sm:top-20 sm:bottom-4 sm:h-auto sm:w-[400px]"
    >
      <AgentChat onClose={close} />
    </aside>
  );
}
