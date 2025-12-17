import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChatBotWidget from "./ChatBotWidget";

// Conditional ChatBot - hides on admin routes
export default function ConditionalChatBot() {
  const location = useLocation();
  const { role } = useAuth();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isAdmin = role === "admin";

  // Don't show chatbot on admin routes or for admin users
  if (isAdminRoute || isAdmin) {
    return null;
  }

  return <ChatBotWidget />;
}
