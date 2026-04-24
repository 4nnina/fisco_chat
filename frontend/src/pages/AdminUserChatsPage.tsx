import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AdminAuth from "../services/AdminAuth";
import Navbar from "../components/Navbar";
import { getUserChatHistory, getUsersChatSummary } from "../services/AdminUserChatsAPI";
import type { UserChatEntry, UserChatHistory, UserChatSummary } from "../types/UserChatTypes";

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

function AdminUserChatsPage() {
  const [users, setUsers] = useState<UserChatSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [history, setHistory] = useState<UserChatHistory | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const threads = history ? groupByConversation(history.chats) : [];

  useEffect(() => {
    async function bootstrap() {
      setLoadingUsers(true);
      const data = await getUsersChatSummary();
      setUsers(data);
      if (data.length > 0) {
        setSelectedUser(data[0].username);
      }
      setLoadingUsers(false);
    }
    bootstrap();
  }, []);

  useEffect(() => {
    async function loadHistory() {
      if (!selectedUser) {
        setHistory(null);
        return;
      }

      setLoadingHistory(true);
      setError("");
      const data = await getUserChatHistory(selectedUser);
      if (data.error) {
        setError(data.error);
      }
      setHistory(data);
      setLoadingHistory(false);
    }

    loadHistory();
  }, [selectedUser]);

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

  return (
    <AdminAuth>
      <Navbar mode="admin" />

      <div className="w-screen bg-gradient-to-r from-zinc-950 via-zinc-900 to-[#b8abff] p-8 text-center shadow-lg mb-2">
        <h1 className="text-4xl font-extrabold text-white">Chat Storiche Utenti</h1>
        <p className="mt-3 text-zinc-100">Filtra per utente e consulta tutte le conversazioni salvate.</p>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-bold text-zinc-900">Utenti</h2>
              <p className="text-sm text-zinc-600">Totale: {users.length}</p>
            </div>

            {loadingUsers ? (
              <p className="text-zinc-600">Caricamento utenti...</p>
            ) : (
              <div className="overflow-auto border border-zinc-200 rounded-lg max-h-[32rem]">
                <table className="w-full text-sm">
                  <thead className="bg-[#f4f1ff] text-left sticky top-0">
                    <tr>
                      <th className="p-2">Utente</th>
                      <th className="p-2">N. chat</th>
                      <th className="p-2">Ultimo update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isSelected = user.username === selectedUser;
                      return (
                        <tr
                          key={user.username}
                          className={`border-t border-zinc-100 cursor-pointer ${isSelected ? "bg-[#e6e0ff]" : "hover:bg-[#f7f4ff]"}`}
                          onClick={() => setSelectedUser(user.username)}
                        >
                          <td className="p-2 font-medium text-zinc-900">{user.username}</td>
                          <td className="p-2 text-zinc-700">{user.chat_count}</td>
                          <td className="p-2 text-zinc-600">{user.updated_at || "-"}</td>
                        </tr>
                      );
                    })}
                    {!users.length && (
                      <tr>
                        <td className="p-2 text-zinc-500" colSpan={3}>
                          Nessun utente disponibile.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 border border-zinc-200 rounded-2xl shadow-md bg-[#f9f7ff] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Storico chat</h2>
                <p className="text-sm text-zinc-600">
                  {selectedUser ? `Utente selezionato: ${selectedUser}` : "Seleziona un utente dalla tabella."}
                </p>
              </div>
              <div className="text-sm text-zinc-600 text-right">
                <p>Thread totali: {threads.length}</p>
                <p>{history?.updated_at ? `Ultimo aggiornamento: ${history.updated_at}` : "Nessun aggiornamento"}</p>
              </div>
            </div>

            {error && <p className="mb-4 text-red-600 font-medium">{error}</p>}

            {loadingHistory ? (
              <p className="text-zinc-600">Caricamento chat...</p>
            ) : history && threads.length > 0 ? (
              <div className="space-y-5 max-h-[36rem] overflow-auto pr-1">
                {threads
                  .slice()
                  .reverse()
                  .map((thread, threadIdx) => (
                    <div key={thread.id} className="border border-[#d8ceff] rounded-2xl bg-[#f4f1ff] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p className="text-sm font-semibold text-zinc-900">Thread #{threads.length - threadIdx}</p>
                        <p className="text-xs text-zinc-700">Messaggi salvati: {thread.entries.length}</p>
                      </div>
                      <div className="w-full border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-5 space-y-4 max-h-[28rem] overflow-y-auto">
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
              <p className="text-zinc-600">Nessuna conversazione disponibile per l'utente selezionato.</p>
            )}
          </div>
        </div>
      </div>
    </AdminAuth>
  );
}

export default AdminUserChatsPage;
