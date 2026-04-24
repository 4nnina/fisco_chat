import { useEffect, useState } from "react";
import AdminAuth from "../services/AdminAuth";
import Navbar from "../components/Navbar";
import { getChatConfig, getChatToneSource, updateChatConfig } from "../services/ChatConfigAPI";
import type { ChatConfig } from "../types/ChatConfigTypes";

const defaultConfig: ChatConfig = {
  model: "gpt-4o-mini",
  temperature: 0.5,
  max_history: 12,
  system_prompt_template: "",
  tone_of_voice: "",
};

const availableModels = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-5-mini",
  "gpt-5",
];

function AdminChatConfigPage() {
  const [config, setConfig] = useState<ChatConfig>(defaultConfig);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState("");
  const [configError, setConfigError] = useState("");

  useEffect(() => {
    async function bootstrap() {
      await fetchConfig();
    }
    bootstrap();
  }, []);

  async function fetchConfig() {
    setLoadingConfig(true);
    const [res, toneSource] = await Promise.all([getChatConfig(), getChatToneSource()]);
    if (res.error) {
      setConfigError(res.error);
    }
    if (toneSource.error) {
      setConfigError(toneSource.error);
    }
    setConfig({
      model: res.model,
      temperature: Number(res.temperature),
      max_history: Number(res.max_history),
      system_prompt_template: res.system_prompt_template,
      tone_of_voice: toneSource.error ? res.tone_of_voice : toneSource.tone_of_voice,
    });
    setLoadingConfig(false);
  }

  async function saveConfig() {
    setSavingConfig(true);
    setConfigMessage("");
    setConfigError("");

    const payload: ChatConfig = {
      ...config,
      model: config.model.trim(),
      system_prompt_template: config.system_prompt_template.trim(),
      tone_of_voice: config.tone_of_voice,
      temperature: Number(config.temperature),
      max_history: Number(config.max_history),
    };

    const res = await updateChatConfig(payload);
    setSavingConfig(false);

    if (res.error) {
      setConfigError(res.error);
      return;
    }

    setConfig(res);
    setConfigMessage("Configurazione salvata correttamente.");
  }

  return (
    <AdminAuth>
      <Navbar mode="admin" />

      <div className="w-screen bg-gradient-to-r from-zinc-950 via-zinc-900 to-[#b8abff] p-8 text-center shadow-lg mb-2">
        <h1 className="text-4xl font-extrabold text-white">Configurazione Chat</h1>
        <p className="mt-3 text-zinc-100">Gestisci configurazione e prompt del chatbot.</p>
      </div>

      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-5">
        <div className="w-full border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-6">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Configurazione Chat</h2>
          {loadingConfig ? (
            <p className="text-zinc-600">Caricamento configurazione...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Modello</label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
                  className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Temperatura (0 - 2)</label>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={config.temperature}
                  onChange={(e) => setConfig((prev) => ({ ...prev, temperature: Number(e.target.value) }))}
                  className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Massimo storico messaggi</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.max_history}
                  onChange={(e) => setConfig((prev) => ({ ...prev, max_history: Number(e.target.value) }))}
                  className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-zinc-700 mb-1">
                  System prompt template (usa {'{tone}'} dove vuoi inserire il tono)
                </label>
                <textarea
                  rows={7}
                  value={config.system_prompt_template}
                  onChange={(e) => setConfig((prev) => ({ ...prev, system_prompt_template: e.target.value }))}
                  className="w-full border border-zinc-300 rounded-lg p-3 focus:ring focus:ring-[#d9d0ff] resize-y"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Tone di voce dell'agente</label>
                <textarea
                  rows={Math.max(12, config.tone_of_voice.split("\n").length + 1)}
                  value={config.tone_of_voice}
                  onChange={(e) => setConfig((prev) => ({ ...prev, tone_of_voice: e.target.value }))}
                  className="w-full border border-zinc-300 rounded-lg p-3 focus:ring focus:ring-[#d9d0ff] resize-y"
                />
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={saveConfig}
              disabled={loadingConfig || savingConfig}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-semibold py-2 px-5 rounded-lg shadow transition duration-200"
            >
              {savingConfig ? "Salvataggio..." : "Salva configurazione"}
            </button>

            {configMessage && <p className="text-green-700 font-medium">{configMessage}</p>}
            {configError && <p className="text-red-600 font-medium">{configError}</p>}
          </div>
        </div>
      </div>
    </AdminAuth>
  );
}

export default AdminChatConfigPage;
