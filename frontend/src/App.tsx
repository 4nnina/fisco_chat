import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import NoPage from './pages/NoPage';
import ChatbotPage from './pages/ChatbotPage';
import UserProfilePage from './pages/UserProfilePage';
import UserChatHistoryPage from './pages/UserChatHistoryPage';
import AdminChatConfigPage from './pages/AdminChatConfigPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminUserChatsPage from './pages/AdminUserChatsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/chat-history" element={<UserChatHistoryPage />} />
        <Route path="/admin" element={<AdminChatConfigPage />} />
        <Route path="/admin/chat-config" element={<AdminChatConfigPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/user-chats" element={<AdminUserChatsPage />} />
        <Route path="*" element={<NoPage />} />
      </Routes>
    </Router>
  );
}

export default App;

