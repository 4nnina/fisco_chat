import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Auth from "../services/Auth";
import Navbar from "../components/Navbar";
import { getCurrentUserChatHistory } from "../services/UserChatHistoryAPI";
import type { UserChatEntry, UserChatHistory } from "../types/UserChatTypes";

function groupByConversation(chats: UserChatEntry[]): Array<{ id: string; entries: UserChatEntry[] }> {
  const groups = new Map<string, UserChatEntry[]>();

  chats.forEach((entry) => {
    const id = entry.conversation_id || entry.timestamp;
    const current = groups.get(id) || [];
    current.push(entry);
    groups.set(id, current);
  });

  return Array.from(groups.entries()).map(([id, entries]) => ({
    id,
    entries: entries.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  }));
}

function UserChatHistoryPage() {
  const [history, setHistory] = useState<UserChatHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      setError("");
      const data = await getCurrentUserChatHistory();
      if (data.error) {
        setError(data.error);
      }
      setHistory(data);
      setLoading(false);
    }

    loadHistory();
  }, []);

  function buildReadonlyMessages(entries: UserChatEntry[]): Array<{ role: "user" | "assistant"; content: string }> {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    entries.forEach((entry) => {
      const prompt = entry.prompt?.trim();
      const response = entry.response?.trim();
      if (prompt) {
        messages.push({ role: "user", content: prompt });
      }
      if (response) {
        messages.push({ role: "assistant", content: response });
      }
    });
    return messages;
  }

  const threads = history ? groupByConversation(history.chats) : [];

  return (
    <Auth>
      <Navbar />

      <div className="w-screen bg-gradient-to-r from-zinc-950 via-zinc-900 to-[#b8abff] p-8 text-center shadow-lg mb-2">
        <h1 className="text-4xl font-extrabold text-white">Storico Chat</h1>
        <p className="mt-3 text-zinc-100">Qui trovi le tue conversazioni salvate con l'assistente.</p>
      </div>

      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-5">
        <div className="border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Le tue conversazioni</h2>
              <p className="text-sm text-zinc-600">Utente: {history?.username || "-"}</p>
            </div>
            <div className="text-sm text-zinc-600 text-right">
              <p>Thread totali: {threads.length}</p>
              <p>{history?.updated_at ? `Ultimo aggiornamento: ${history.updated_at}` : "Nessun aggiornamento"}</p>
            </div>
          </div>

          {error && <p className="mb-4 text-red-600 font-medium">{error}</p>}

          {loading ? (
            <p className="text-zinc-600">Caricamento chat...</p>
          ) : history && threads.length > 0 ? (
            <div className="space-y-5 max-h-[60vh] overflow-auto pr-1">
              {threads
                .slice()
                .reverse()
                .map((thread, threadIdx) => (
                  <div key={thread.id} className="border border-[#d8ceff] rounded-2xl bg-[#f4f1ff] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-zinc-900">Thread #{threads.length - threadIdx}</p>
                      <p className="text-xs text-zinc-700">Messaggi salvati: {thread.entries.length}</p>
                    </div>
                    <div className="w-full border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-5 space-y-4 max-h-[45vh] overflow-y-auto">
                      {buildReadonlyMessages(thread.entries).map((message, idx) => (
                        <div
                          key={`${thread.id}-${message.role}-${idx}`}
                          className={`max-w-[86%] rounded-2xl px-4 py-3 shadow-sm ${
                            message.role === "user"
                              ? "ml-auto bg-[#8b79f8] text-white"
                              : "mr-auto bg-white text-zinc-800 border border-zinc-200"
                          }`}
                        >
                          <p className="text-xs mb-2 font-semibold uppercase tracking-wide opacity-80">
                            {message.role === "user" ? "Tu" : "AI"}
                          </p>
                          <div className="prose prose-sm max-w-none break-words">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-zinc-600">Non ci sono ancora conversazioni salvate.</p>
          )}
        </div>
      </div>
    </Auth>
  );
}

export default UserChatHistoryPage;
