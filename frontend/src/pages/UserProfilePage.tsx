import { useEffect, useState } from "react";
import Auth from "../services/Auth";
import Navbar from "../components/Navbar";
import getToken from "../services/TokenAPI";
import { getCommercialisti, getUserRevenue, upsertUserRevenue } from "../services/FiscalAdminAPI";
import { getUserProfile, updateUserProfile } from "../services/UserProfileAPI";
import type { Commercialista, UserProfile, UserRevenue } from "../types/FiscalTypes";

const emptyProfile: UserProfile = {
  username: "",
  password: "",
  regime: "forfettario",
  cassa: "INARCASSA",
  commercialista_export_key: "",
  vat_opening_date: "",
};

function parseUsername(username: string): { firstName: string; lastName: string } {
  const normalized = username.trim();
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const byDot = normalized.split(".");
  if (byDot.length >= 2) {
    return {
      firstName: byDot[0],
      lastName: byDot.slice(1).join("."),
    };
  }

  const byUnderscore = normalized.split("_");
  if (byUnderscore.length >= 2) {
    return {
      firstName: byUnderscore[0],
      lastName: byUnderscore.slice(1).join("_"),
    };
  }

  return { firstName: normalized, lastName: "" };
}

function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [commercialisti, setCommercialisti] = useState<Commercialista[]>([]);
  const [revenues, setRevenues] = useState<UserRevenue[]>([]);
  const [revenueForm, setRevenueForm] = useState<UserRevenue>({
    username: "",
    year: new Date().getFullYear(),
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revenueMessage, setRevenueMessage] = useState("");
  const [revenueError, setRevenueError] = useState("");
  const parsedName = parseUsername(profile.username);

  function getUserRevenuesFromList(allRevenues: UserRevenue[], username: string): UserRevenue[] {
    return allRevenues
      .filter((item) => item.username === username)
      .sort((a, b) => b.year - a.year);
  }

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError("");

      const tokenData = await getToken();
      const username = tokenData?.user;
      if (!tokenData?.auth || !username) {
        setError("Sessione non valida.");
        setLoading(false);
        return;
      }

      const [profileRes, commercialistiRes] = await Promise.all([
        getUserProfile(username),
        getCommercialisti(),
      ]);

      if (profileRes.error || !profileRes.profile) {
        setError(profileRes.error || "Impossibile caricare il profilo utente.");
        setLoading(false);
        return;
      }

      setProfile(profileRes.profile);
      setCommercialisti(commercialistiRes);

      const revenueRes = await getUserRevenue();
      const userRevenues = getUserRevenuesFromList(revenueRes, username);
      setRevenues(userRevenues);
      setRevenueForm((prev) => ({
        ...prev,
        username,
      }));

      setLoading(false);
    }

    bootstrap();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");

    const res = await updateUserProfile(profile);
    setSaving(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.profile) {
      setProfile(res.profile);
    }

    setMessage("Profilo aggiornato correttamente.");
  }

  async function handleSaveRevenue() {
    setSavingRevenue(true);
    setRevenueMessage("");
    setRevenueError("");

    const payload: UserRevenue = {
      ...revenueForm,
      username: profile.username,
      year: Number(revenueForm.year),
      revenue: Number(revenueForm.revenue),
    };

    const res = await upsertUserRevenue(payload);
    setSavingRevenue(false);

    if (res.error) {
      setRevenueError(res.error);
      return;
    }

    const revenueRes = await getUserRevenue();
    setRevenues(getUserRevenuesFromList(revenueRes, profile.username));
    setRevenueMessage("Fatturato salvato correttamente.");
  }

  return (
    <Auth>
      <Navbar />

      <div className="w-screen bg-gradient-to-r from-zinc-950 via-zinc-900 to-[#b8abff] p-8 text-center shadow-lg mb-2">
        <h1 className="text-4xl font-extrabold text-white">Il tuo profilo</h1>
        <p className="mt-3 text-zinc-100">Visualizza e modifica tutte le tue informazioni.</p>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <div className="border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-6">
          {loading ? (
            <p className="text-zinc-600">Caricamento profilo...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Nome</label>
                <input
                  value={parsedName.firstName}
                  readOnly
                  className="w-full border border-zinc-300 rounded-lg p-2 bg-zinc-100 text-zinc-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Cognome</label>
                <input
                  value={parsedName.lastName}
                  readOnly
                  className="w-full border border-zinc-300 rounded-lg p-2 bg-zinc-100 text-zinc-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Username</label>
                <input
                  value={profile.username}
                  readOnly
                  className="w-full border border-zinc-300 rounded-lg p-2 bg-zinc-100 text-zinc-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Nuova password (opzionale)</label>
                <input
                  type="password"
                  value={profile.password}
                  onChange={(e) => setProfile((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Regime</label>
                <select
                  value={profile.regime}
                  onChange={(e) => setProfile((prev) => ({ ...prev, regime: e.target.value as UserProfile["regime"] }))}
                  className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                >
                  <option value="forfettario">forfettario</option>
                  <option value="semplificato">semplificato</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Cassa</label>
                <select
                  value={profile.cassa}
                  onChange={(e) => setProfile((prev) => ({ ...prev, cassa: e.target.value as UserProfile["cassa"] }))}
                  className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                >
                  <option value="INARCASSA">INARCASSA</option>
                  <option value="ENPAP">ENPAP</option>
                  <option value="ENPAPI">ENPAPI</option>
                  <option value="GS INPS">GS INPS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Commercialista</label>
                <select
                  value={profile.commercialista_export_key}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, commercialista_export_key: e.target.value }))
                  }
                  className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                >
                  <option value="">Seleziona commercialista</option>
                  {commercialisti.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.name} {item.surname}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Apertura partita IVA</label>
                <input
                  type="date"
                  value={profile.vat_opening_date || ""}
                  onChange={(e) => setProfile((prev) => ({ ...prev, vat_opening_date: e.target.value }))}
                  className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                />
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-semibold py-2 px-5 rounded-lg shadow transition duration-200"
            >
              {saving ? "Salvataggio..." : "Salva modifiche"}
            </button>

            {message && <p className="text-green-700 font-medium">{message}</p>}
            {error && <p className="text-red-600 font-medium">{error}</p>}
          </div>
        </div>

        <div className="border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-6 mt-6">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Storico fatturato</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Anno</label>
              <input
                type="number"
                value={revenueForm.year}
                onChange={(e) => setRevenueForm((prev) => ({ ...prev, year: Number(e.target.value) }))}
                className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Fatturato</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={revenueForm.revenue}
                onChange={(e) => setRevenueForm((prev) => ({ ...prev, revenue: Number(e.target.value) }))}
                className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSaveRevenue}
                disabled={loading || savingRevenue}
                className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-semibold py-2 px-5 rounded-lg shadow transition duration-200"
              >
                {savingRevenue ? "Salvataggio..." : "Salva fatturato"}
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-auto border border-zinc-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-[#f4f1ff] text-left">
                <tr>
                  <th className="p-2">Anno</th>
                  <th className="p-2">Fatturato</th>
                </tr>
              </thead>
              <tbody>
                {revenues.map((row) => (
                  <tr
                    key={`${row.username}-${row.year}`}
                    className="border-t border-zinc-100 hover:bg-[#f7f4ff] cursor-pointer"
                    onClick={() => setRevenueForm(row)}
                  >
                    <td className="p-2">{row.year}</td>
                    <td className="p-2">{row.revenue}</td>
                  </tr>
                ))}

                {!revenues.length && !loading && (
                  <tr>
                    <td className="p-2 text-zinc-500" colSpan={2}>
                      Nessun fatturato disponibile.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            {revenueMessage && <p className="text-green-700 font-medium">{revenueMessage}</p>}
            {revenueError && <p className="text-red-600 font-medium">{revenueError}</p>}
          </div>
        </div>
      </div>
    </Auth>
  );
}

export default UserProfilePage;
