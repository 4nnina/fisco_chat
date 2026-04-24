import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type NavbarMode = 'user' | 'admin';

interface NavbarProps {
  mode?: NavbarMode;
}

function Navbar({ mode = 'user' }: NavbarProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  function logout() {
    localStorage.removeItem("FastToken");
    window.location.href = "/login";
  }

  return (
    <nav className="w-screen bg-gradient-to-r from-zinc-950 via-zinc-900 to-[#b8abff] shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        
        {/* Logo/Title */}
        <div className="text-white font-bold text-xl cursor-pointer" onClick={() => navigate(mode === 'admin' ? '/admin' : '/chatbot')}>
          Fiscozen Chat
        </div>

        {/* Desktop Navigation Menu */}
        <div className="hidden md:flex gap-6 items-center">
          <button 
            onClick={() => navigate(mode === 'admin' ? '/admin' : '/chatbot')}
            className="text-white font-semibold py-2 px-4 rounded-lg transition duration-200 hover:bg-white hover:bg-opacity-10"
          >
            {mode === 'admin' ? 'Configurazione Chat' : 'Chatbot'}
          </button>

          {mode === 'user' && (
            <button
              onClick={() => navigate('/profile')}
              className="text-white font-semibold py-2 px-4 rounded-lg transition duration-200 hover:bg-white hover:bg-opacity-10"
            >
              Profilo
            </button>
          )}

          {mode === 'user' && (
            <button
              onClick={() => navigate('/chat-history')}
              className="text-white font-semibold py-2 px-4 rounded-lg transition duration-200 hover:bg-white hover:bg-opacity-10"
            >
              Storico chat
            </button>
          )}

          {mode === 'admin' && (
            <button
              onClick={() => navigate('/admin/users')}
              className="text-white font-semibold py-2 px-4 rounded-lg transition duration-200 hover:bg-white hover:bg-opacity-10"
            >
              Utenti
            </button>
          )}

          {mode === 'admin' && (
            <button
              onClick={() => navigate('/admin/user-chats')}
              className="text-white font-semibold py-2 px-4 rounded-lg transition duration-200 hover:bg-white hover:bg-opacity-10"
            >
              Chat utenti
            </button>
          )}

          <button 
            onClick={logout}
            className="bg-[#b8abff] hover:bg-[#a393ff] text-zinc-950 font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="text-white text-2xl"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="md:hidden bg-zinc-900 px-6 py-4 space-y-2">
          <button 
            onClick={() => {
              navigate(mode === 'admin' ? '/admin' : '/chatbot');
              setShowMenu(false);
            }}
            className="block w-full text-left text-white font-semibold py-2 px-4 hover:bg-zinc-800 rounded-lg transition duration-200"
          >
            {mode === 'admin' ? 'Configurazione Chat' : 'Chatbot'}
          </button>

          {mode === 'user' && (
            <button
              onClick={() => {
                navigate('/profile');
                setShowMenu(false);
              }}
              className="block w-full text-left text-white font-semibold py-2 px-4 hover:bg-zinc-800 rounded-lg transition duration-200"
            >
              Profilo
            </button>
          )}

          {mode === 'user' && (
            <button
              onClick={() => {
                navigate('/chat-history');
                setShowMenu(false);
              }}
              className="block w-full text-left text-white font-semibold py-2 px-4 hover:bg-zinc-800 rounded-lg transition duration-200"
            >
              Storico chat
            </button>
          )}

          {mode === 'admin' && (
            <button
              onClick={() => {
                navigate('/admin/users');
                setShowMenu(false);
              }}
              className="block w-full text-left text-white font-semibold py-2 px-4 hover:bg-zinc-800 rounded-lg transition duration-200"
            >
              Utenti
            </button>
          )}

          {mode === 'admin' && (
            <button
              onClick={() => {
                navigate('/admin/user-chats');
                setShowMenu(false);
              }}
              className="block w-full text-left text-white font-semibold py-2 px-4 hover:bg-zinc-800 rounded-lg transition duration-200"
            >
              Chat utenti
            </button>
          )}

          <button 
            onClick={logout}
            className="block w-full text-left bg-[#b8abff] hover:bg-[#a393ff] text-zinc-950 font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
