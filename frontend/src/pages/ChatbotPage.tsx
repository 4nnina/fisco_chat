import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Auth from "../services/Auth";
import Navbar from "../components/Navbar";
import { askChatbot } from "../services/ChatbotAPI";
import type { ChatMessage } from "../types/ChatbotTypes";

function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ciao! Sono il tuo assistente AI. Scrivimi una richiesta e ti rispondo subito.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [startNewConversation, setStartNewConversation] = useState(false);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) {
      return;
    }

    setError("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const chatHistory = nextMessages.filter((item) => item.role === "user" || item.role === "assistant");
      const res = await askChatbot(text, chatHistory, undefined, conversationId, startNewConversation);

      if (res.error) {
        setError(res.error);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: res.response || "Nessuna risposta dal modello.",
        },
      ]);

      if (res.conversation_id) {
        setConversationId(res.conversation_id);
      }
      if (startNewConversation) {
        setStartNewConversation(false);
      }
    } catch {
      setError("Errore imprevisto durante la richiesta al chatbot.");
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        content: "Nuova conversazione avviata. Come posso aiutarti?",
      },
    ]);
    setError("");
    setConversationId(undefined);
    setStartNewConversation(true);
  }

  return (
    <Auth>
      <Navbar />

      <div className="w-screen bg-gradient-to-r from-zinc-950 via-zinc-900 to-[#b8abff] p-8 text-center shadow-lg mb-2">
        <h1 className="text-4xl font-extrabold text-white">Il tuo Chatbot</h1>
        <p className="mt-3 text-zinc-100"></p>
      </div>

      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-5">
        <div className="w-full border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-4 flex flex-wrap items-center gap-3 justify-end">
          <button
            onClick={resetChat}
            className="bg-[#b8abff] hover:bg-[#a393ff] text-zinc-950 font-semibold py-2 px-4 rounded-lg shadow transition duration-200"
          >
            Nuova chat
          </button>
        </div>

        <div className="w-full h-[58vh] overflow-y-auto border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-5 space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
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

          {loading && (
            <div className="mr-auto bg-white text-zinc-800 border border-zinc-200 rounded-2xl px-4 py-3 shadow-sm">
              L'assistente sta scrivendo...
            </div>
          )}
        </div>

        <div className="w-full border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrivi qui la tua domanda..."
              rows={3}
              className="flex-1 border border-zinc-300 rounded-lg p-3 focus:ring focus:ring-[#d9d0ff] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-semibold py-3 px-6 rounded-lg shadow transition duration-200"
            >
              Invia
            </button>
          </div>

          {error && <p className="mt-3 text-red-600 font-medium">{error}</p>}
          <p className="mt-2 text-sm text-zinc-500">Invio rapido: premi Enter. Nuova riga: Shift + Enter.</p>
        </div>
      </div>
    </Auth>
  );
}

export default ChatbotPage;
