"use client";

import { signIn, useSession } from "next-auth/react";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

type CopilotMessage = {
  role: "user" | "assistant";
  content: string;
};

export function CopilotClient() {
  const { data: session, status } = useSession();
  const isAuthed = useMemo(() => status === "authenticated", [status]);

  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [busy, setBusy] = useState(false);

  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  return (
    <div className="space-y-6">
      {!isAuthed ? (
        <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-6 text-white">
          <div className="text-lg font-semibold">Finance Copilot</div>
          <div className="mt-2 text-sm opacity-90">Sign in to chat with your finance copilot.</div>
          <button
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900"
            type="button"
            onClick={() => signIn(undefined, { callbackUrl: "/copilot" })}
          >
            Sign in
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Chat</div>
            <div className="text-xs text-zinc-600">Grounded in your local finance data</div>
          </div>
          <div className="text-xs text-zinc-600">{status === "loading" ? "Loading…" : session?.user?.email ?? ""}</div>
        </div>

        <div className="mt-4 max-h-[420px] space-y-2 overflow-auto rounded-xl bg-zinc-50 p-3">
          {messages.length === 0 ? (
            <div className="text-sm text-zinc-600">Ask: “Where am I overspending?” or “Any suspicious transactions?”</div>
          ) : (
            messages.map((m, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={
                  m.role === "user"
                    ? "rounded-xl bg-white p-3 text-sm"
                    : "rounded-xl bg-zinc-900 p-3 text-sm text-white"
                }
              >
                <div className="text-[10px] opacity-70">{m.role === "user" ? "You" : "Copilot"}</div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </motion.div>
            ))
          )}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!prompt.trim()) return;
            const nextPrompt = prompt.trim();
            setPrompt("");
            setMessages((prev) => [...prev, { role: "user", content: nextPrompt }]);
            setBusy(true);
            try {
              const res = await fetch("/api/copilot", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ prompt: nextPrompt }),
              });
              const data = (await res.json()) as { reply?: string; error?: string };
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: data.reply ?? data.error ?? "Copilot error",
                },
              ]);
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            placeholder={isAuthed ? "Ask your copilot…" : "Sign in to chat…"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!isAuthed || busy}
          />

          <button
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
            type="button"
            disabled={!isAuthed || busy}
            onClick={() => {
              setVoiceError(null);
              const SpeechRecognition =
                (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

              if (!SpeechRecognition) {
                setVoiceError("Voice input not supported in this browser.");
                return;
              }

              if (!recognitionRef.current) {
                const rec = new SpeechRecognition();
                rec.continuous = false;
                rec.interimResults = true;
                rec.lang = "en-US";
                rec.onresult = (event: any) => {
                  let finalText = "";
                  let interimText = "";
                  for (let i = event.resultIndex; i < event.results.length; i += 1) {
                    const res = event.results[i];
                    const text = String(res[0]?.transcript ?? "");
                    if (res.isFinal) finalText += text;
                    else interimText += text;
                  }
                  const combined = (finalText || interimText).trim();
                  if (combined) setPrompt(combined);
                };
                rec.onerror = (event: any) => {
                  setVoiceError(String(event?.error ?? "Voice input error"));
                  setListening(false);
                };
                rec.onend = () => setListening(false);
                recognitionRef.current = rec;
              }

              if (listening) {
                recognitionRef.current?.stop();
                setListening(false);
                return;
              }

              try {
                recognitionRef.current?.start();
                setListening(true);
              } catch {
                setVoiceError("Could not start voice input. Check mic permissions.");
                setListening(false);
              }
            }}
          >
            {listening ? "Stop" : "Voice"}
          </button>

          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            type="submit"
            disabled={!isAuthed || busy}
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </form>

        {voiceError ? <div className="mt-2 text-xs text-red-600">{voiceError}</div> : null}
      </div>
    </div>
  );
}
