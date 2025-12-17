import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatBot from "./Chat";

export default function ChatBotWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Chat window */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {isOpen && (
          <div className="mb-3 w-[90vw] max-w-[380px] h-[70vh] sm:w-[400px] sm:h-[75vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 relative">
            <ChatBot />

            {/* Close button inside chat window */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 bg-white hover:bg-gray-100 text-gray-700 rounded-full p-1.5 shadow-lg transition z-10"
              title="Close Chat"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Floating Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-full shadow-xl transition-all active:scale-95 ${
          isOpen ? "rotate-90" : ""
        }`}
        style={{
          width: "56px",
          height: "56px",
        }}
        title={isOpen ? "Close Chat" : "Open Chat"}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
