import { useEffect, useState } from "react";
import AdminAuth from "../services/AdminAuth";
import Navbar from "../components/Navbar";
import {
  createCommercialista,
  createUser,
  getCommercialisti,
  getUserRevenue,
  getUsers,
  updateUser,
  upsertUserRevenue,
} from "../services/FiscalAdminAPI";
import type { Commercialista, UserProfile, UserRevenue } from "../types/FiscalTypes";

const defaultUserForm: UserProfile = {
  username: "",
  password: "",
  regime: "forfettario",
  cassa: "INARCASSA",
  commercialista_export_key: "",
  vat_opening_date: "",
};

const defaultNameForm = {
  firstName: "",
  lastName: "",
};

const defaultCommercialistaForm = {
  name: "",
  surname: "",
  key: "",
};

function normalizeUsernamePart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function composeUsername(firstName: string, lastName: string): string {
  const left = normalizeUsernamePart(firstName);
  const right = normalizeUsernamePart(lastName);
  if (!left || !right) {
    return "";
  }
  return `${left}.${right}`;
}

function parseUsername(username: string): { firstName: string; lastName: string } {
  const normalized = username.trim();
  if (!normalized) {
    return defaultNameForm;
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

  return {
    firstName: normalized,
    lastName: "",
  };
}

function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [commercialisti, setCommercialisti] = useState<Commercialista[]>([]);
  const [userRevenue, setUserRevenue] = useState<UserRevenue[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [userForm, setUserForm] = useState<UserProfile>(defaultUserForm);
  const [nameForm, setNameForm] = useState(defaultNameForm);
  const [showNewCommercialista, setShowNewCommercialista] = useState(false);
  const [commercialistaForm, setCommercialistaForm] = useState(defaultCommercialistaForm);
  const [savingCommercialista, setSavingCommercialista] = useState(false);
  const [revenueForm, setRevenueForm] = useState<UserRevenue>({
    username: "",
    year: new Date().getFullYear(),
    revenue: 0,
  });
  const [revenueMessage, setRevenueMessage] = useState("");
  const [revenueError, setRevenueError] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      setLoadingUsers(true);
      const [usersData, commercialistiData, revenueData] = await Promise.all([
        getUsers(),
        getCommercialisti(),
        getUserRevenue(),
      ]);
      setUsers(usersData);
      setCommercialisti(commercialistiData);
      setUserRevenue(revenueData);
      if (!revenueForm.username && usersData.length > 0) {
        setRevenueForm((prev) => ({ ...prev, username: usersData[0].username }));
      }
    } catch {
      setError("Errore nel caricamento utenti.");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchUsers() {
    try {
      setLoadingUsers(true);
      const [usersData, revenueData] = await Promise.all([getUsers(), getUserRevenue()]);
      setUsers(usersData);
      setUserRevenue(revenueData);
    } catch {
      setError("Errore nel caricamento utenti.");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleCreateUser() {
    setMessage("");
    setError("");

    if (userForm.commercialista_export_key === "__new__") {
      setError("Aggiungi prima il nuovo commercialista e poi selezionalo.");
      return;
    }

    const username = composeUsername(nameForm.firstName, nameForm.lastName);
    if (!username) {
      setError("Inserisci nome e cognome per generare lo username.");
      return;
    }

    const payload: UserProfile = {
      ...userForm,
      username,
    };

    const res = await createUser(payload);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage("Utente creato correttamente.");
    setUserForm(defaultUserForm);
    setNameForm(defaultNameForm);
    await fetchUsers();
  }

  async function handleUpdateUser() {
    setMessage("");
    setError("");

    if (userForm.commercialista_export_key === "__new__") {
      setError("Aggiungi prima il nuovo commercialista e poi selezionalo.");
      return;
    }

    const username = composeUsername(nameForm.firstName, nameForm.lastName);
    if (!username) {
      setError("Inserisci nome e cognome per generare lo username.");
      return;
    }

    const payload: UserProfile = {
      ...userForm,
      username,
    };

    const res = await updateUser(payload);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage("Utente aggiornato correttamente.");
    await fetchUsers();
  }

  async function handleCreateCommercialista() {
    setError("");
    setMessage("");

    const name = commercialistaForm.name.trim();
    const surname = commercialistaForm.surname.trim();
    const key = commercialistaForm.key.trim();

    if (!name || !surname) {
      setError("Inserisci nome e cognome del commercialista.");
      return;
    }

    setSavingCommercialista(true);
    const res = await createCommercialista({
      name,
      surname,
      key: key || undefined,
    });
    setSavingCommercialista(false);

    if (res.error || !res.key) {
      setError(res.error || "Errore nella creazione del commercialista.");
      return;
    }

    const updatedCommercialisti = await getCommercialisti();
    setCommercialisti(updatedCommercialisti);
    setUserForm((prev) => ({ ...prev, commercialista_export_key: res.key || "" }));
    setCommercialistaForm(defaultCommercialistaForm);
    setShowNewCommercialista(false);
    setMessage(`Commercialista ${name} ${surname} creato correttamente.`);
  }

  async function handleSaveRevenue() {
    setRevenueMessage("");
    setRevenueError("");

    if (!revenueForm.username) {
      setRevenueError("Seleziona un utente.");
      return;
    }

    const payload: UserRevenue = {
      username: revenueForm.username,
      year: Number(revenueForm.year),
      revenue: Number(revenueForm.revenue),
    };

    const res = await upsertUserRevenue(payload);
    if (res.error) {
      setRevenueError(res.error);
      return;
    }

    const revenueData = await getUserRevenue();
    setUserRevenue(revenueData);
    setRevenueMessage("Fatturato salvato correttamente.");
  }

  return (
    <AdminAuth>
      <Navbar mode="admin" />

      <div className="w-screen bg-gradient-to-r from-zinc-950 via-zinc-900 to-[#b8abff] p-8 text-center shadow-lg mb-2">
        <h1 className="text-4xl font-extrabold text-white">Utenti</h1>
        <p className="mt-3 text-zinc-100">Inserimento e modifica utenti.</p>
      </div>

      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-5">
        <div className="w-full border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-6">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Inserimento utenti</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Nome</label>
              <input
                value={nameForm.firstName}
                onChange={(e) => setNameForm((prev) => ({ ...prev, firstName: e.target.value }))}
                className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Cognome</label>
              <input
                value={nameForm.lastName}
                onChange={(e) => setNameForm((prev) => ({ ...prev, lastName: e.target.value }))}
                className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Password</label>
              <input
                value={userForm.password}
                onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Regime</label>
              <select
                value={userForm.regime}
                onChange={(e) => setUserForm((prev) => ({ ...prev, regime: e.target.value as UserProfile["regime"] }))}
                className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
              >
                <option value="forfettario">forfettario</option>
                <option value="semplificato">semplificato</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Cassa</label>
              <select
                value={userForm.cassa}
                onChange={(e) => setUserForm((prev) => ({ ...prev, cassa: e.target.value as UserProfile["cassa"] }))}
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
                value={userForm.commercialista_export_key}
                onChange={(e) => {
                  const value = e.target.value;
                  setUserForm((prev) => ({ ...prev, commercialista_export_key: value }));
                  setShowNewCommercialista(value === "__new__");
                }}
                className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
              >
                <option value="">Seleziona commercialista</option>
                {commercialisti.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name} {item.surname}
                  </option>
                ))}
                <option value="__new__">+ Aggiungi nuovo commercialista</option>
              </select>
            </div>

            {showNewCommercialista && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Nome nuovo commercialista</label>
                  <input
                    value={commercialistaForm.name}
                    onChange={(e) => setCommercialistaForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Cognome nuovo commercialista</label>
                  <input
                    value={commercialistaForm.surname}
                    onChange={(e) => setCommercialistaForm((prev) => ({ ...prev, surname: e.target.value }))}
                    className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Chiave export (opzionale)</label>
                  <input
                    value={commercialistaForm.key}
                    onChange={(e) => setCommercialistaForm((prev) => ({ ...prev, key: e.target.value }))}
                    className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
                    placeholder="Es. rossi-mario"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    onClick={handleCreateCommercialista}
                    disabled={savingCommercialista}
                    className="bg-[#b8abff] hover:bg-[#a393ff] disabled:bg-zinc-300 text-zinc-950 font-semibold py-2 px-5 rounded-lg shadow transition duration-200"
                  >
                    {savingCommercialista ? "Creazione..." : "Salva nuovo commercialista"}
                  </button>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Apertura partita IVA</label>
              <input
                type="date"
                value={userForm.vat_opening_date}
                onChange={(e) => setUserForm((prev) => ({ ...prev, vat_opening_date: e.target.value }))}
                className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={handleCreateUser}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-2 px-5 rounded-lg shadow transition duration-200"
            >
              Crea utente
            </button>
            <button
              onClick={handleUpdateUser}
              className="bg-[#b8abff] hover:bg-[#a393ff] text-zinc-950 font-semibold py-2 px-5 rounded-lg shadow transition duration-200"
            >
              Aggiorna utente
            </button>
    
          </div>

          <div className="mt-4 overflow-auto border border-zinc-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-[#f4f1ff] text-left">
                <tr>
                  <th className="p-2">Nome</th>
                  <th className="p-2">Cognome</th>
                  <th className="p-2">Regime</th>
                  <th className="p-2">Cassa</th>
                  <th className="p-2">Chiave commercialista</th>
                  <th className="p-2">Apertura P.IVA</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const parsed = parseUsername(user.username);
                  const selectedCommercialista = commercialisti.find(
                    (item) => item.key === user.commercialista_export_key
                  );
                  return (
                    <tr
                      key={user.username}
                      className="border-t border-zinc-100 hover:bg-[#f7f4ff] cursor-pointer"
                      onClick={() => {
                        setUserForm(user);
                        setNameForm(parsed);
                        setShowNewCommercialista(false);
                        setCommercialistaForm(defaultCommercialistaForm);
                      }}
                    >
                      <td className="p-2">{parsed.firstName}</td>
                      <td className="p-2">{parsed.lastName}</td>
                      <td className="p-2">{user.regime}</td>
                      <td className="p-2">{user.cassa}</td>
                      <td className="p-2">
                        {selectedCommercialista
                          ? `${selectedCommercialista.name} ${selectedCommercialista.surname}`
                          : user.commercialista_export_key}
                      </td>
                      <td className="p-2">{user.vat_opening_date}</td>
                    </tr>
                  );
                })}
                {!users.length && !loadingUsers && (
                  <tr>
                    <td className="p-2 text-zinc-500" colSpan={6}>
                      Nessun utente presente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            {message && <p className="text-green-700 font-medium">{message}</p>}
            {error && <p className="text-red-600 font-medium">{error}</p>}
          </div>
        </div>

        <div className="w-full border border-zinc-200 rounded-2xl shadow-md bg-[#fcfbff] p-6">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Fatturato annuo per utente</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Nome utente</label>
              <select
                value={revenueForm.username}
                onChange={(e) => setRevenueForm((prev) => ({ ...prev, username: e.target.value }))}
                className="w-full border border-zinc-300 rounded-lg p-2 focus:ring focus:ring-[#d9d0ff]"
              >
                <option value="">Seleziona utente</option>
                {users.map((user) => (
                  <option key={user.username} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Anno fatturato</label>
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
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveRevenue}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-2 px-5 rounded-lg shadow transition duration-200"
            >
              Salva fatturato
            </button>
            {revenueMessage && <p className="text-green-700 font-medium">{revenueMessage}</p>}
            {revenueError && <p className="text-red-600 font-medium">{revenueError}</p>}
          </div>

          <div className="mt-4 overflow-auto border border-zinc-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-[#f4f1ff] text-left">
                <tr>
                  <th className="p-2">Username</th>
                  <th className="p-2">Anno</th>
                  <th className="p-2">Fatturato</th>
                </tr>
              </thead>
              <tbody>
                {userRevenue.map((row, idx) => (
                  <tr
                    key={`${row.username}-${row.year}-${idx}`}
                    className="border-t border-zinc-100 hover:bg-[#f7f4ff] cursor-pointer"
                    onClick={() => setRevenueForm(row)}
                  >
                    <td className="p-2">{row.username}</td>
                    <td className="p-2">{row.year}</td>
                    <td className="p-2">{row.revenue}</td>
                  </tr>
                ))}
                {!userRevenue.length && !loadingUsers && (
                  <tr>
                    <td className="p-2 text-zinc-500" colSpan={3}>
                      Nessun fatturato presente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminAuth>
  );
}

export default AdminUsersPage;
