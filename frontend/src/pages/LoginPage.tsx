import { useState } from "react";
import axios, { isAxiosError } from "axios";
import { API_BASE_URL } from "../config";

function LoginPage() {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

        e.preventDefault();

        try {
            const response = await axios.post(`${API_BASE_URL}/login`, {
                username,
                password,
            });

            setMessage("✅ You're logged in!");

            if (response.data.token) {
                localStorage.setItem("FastToken", response.data.token);
            }

            setTimeout(() => {
                if (response.data.user === "admin") {
                    window.location.href = "/admin";
                } else {
                    window.location.href = "/chatbot";
                }
            }, 250);

        } catch (error) {

            if (isAxiosError(error)) {
                setMessage(`❌ Error: ${error.response?.data?.message || "invalid credentials"}`);
            } else {
                setMessage("⚠️ Unknown error!");
            }

        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7f4ff] via-[#efe9ff] to-[#e3dbff] p-6">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-[#fcfbff] shadow-2xl p-10">
                <h1 className="text-3xl font-bold text-zinc-900 text-center mb-8">
                    Welcome in Fiscozen Chat!
                </h1>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    {/* Username input */}
                    <div className="relative">
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder=" "
                            className="peer block w-full rounded-lg border border-zinc-300 bg-white px-4 pt-5 pb-2 text-zinc-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#d9d0ff] transition"
                            required
                        />
                        <label
                            htmlFor="username"
                            className="absolute left-4 top-2 text-zinc-700 text-sm transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-zinc-400 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-zinc-700 peer-focus:text-sm"
                        >
                            Username
                        </label>
                    </div>

                    {/* Password input */}
                    <div className="relative">
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder=" "
                            className="peer block w-full rounded-lg border border-zinc-300 bg-white px-4 pt-5 pb-2 text-zinc-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#d9d0ff] transition"
                            required
                        />
                        <label
                            htmlFor="password"
                            className="absolute left-4 top-2 text-zinc-700 text-sm transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-zinc-400 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-zinc-700 peer-focus:text-sm"
                        >
                            Password
                        </label>
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-xl shadow-lg transition-transform transform hover:scale-105 active:scale-95"
                    >
                        Login
                    </button>
                </form>

                {message && (
                    <p className="text-center text-zinc-700 font-medium mt-6">
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}

export default LoginPage;
