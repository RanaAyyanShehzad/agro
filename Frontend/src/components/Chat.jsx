import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Send, Loader2 } from "lucide-react";
import RobotProfileImage from "../assets/robot.png";
import UserProfileImage from "../assets/user.png";
import dayjs from "dayjs";

export default function ChatBot() {
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      message: inputText.trim(),
      sender: "user",
      time: dayjs().valueOf(), // store timestamp
    };

    setChatMessages((prev) => [...prev, userMessage]);
    const question = inputText.trim();
    setInputText("");
    setIsLoading(true);

    try {
      const response = await axios.post(
        "https://agrofarm-vd8i.onrender.com/api/chatbot/ask",
        { question }
      );

      const botMessage = {
        id: crypto.randomUUID(),
        message:
          response.data.response ||
          response.data.answer ||
          "I couldn't process that request.",
        sender: "robot",
        time: dayjs().valueOf(),
      };

      setChatMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const botMessage = {
        id: crypto.randomUUID(),
        message:
          "Sorry, I'm having trouble connecting. Please try again later.",
        sender: "robot",
        time: dayjs().valueOf(),
      };
      setChatMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  function handleKeyDown(event) {
    if (event.key === "Enter") handleSendMessage();
    else if (event.key === "Escape") setInputText("");
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md">
        <img
          src={RobotProfileImage}
          alt="Bot"
          className="w-10 h-10 rounded-full border-2 border-white shadow-md"
        />
        <div>
          <h2 className="font-semibold text-lg">FarmConnect Bot</h2>
          <p className="text-sm text-green-100">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gradient-to-b from-gray-50 to-white">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <div className="bg-green-100 rounded-full p-4 mb-3">
              <img src={RobotProfileImage} alt="Bot" className="w-16 h-16" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">
              Welcome to FarmConnect!
            </h3>
            <p className="text-sm max-w-xs">
              Ask me anything about farming, crops, fertilizers, or agriculture.
            </p>
          </div>
        )}

        {chatMessages.map(({ id, sender, message, time }) => (
          <div
            key={id}
            className={`flex mb-3 animate-fade-in ${
              sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {sender === "robot" && (
              <img
                src={RobotProfileImage}
                alt="Bot"
                className="w-8 h-8 rounded-full mr-2 self-end flex-shrink-0"
              />
            )}

            <div
              className={`px-4 py-2 rounded-2xl text-sm shadow-sm max-w-[75%] ${
                sender === "user"
                  ? "bg-gradient-to-br from-green-600 to-green-700 text-white rounded-br-none"
                  : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
              }`}
            >
              <div>{message}</div>
              {time && (
                <div className="text-[10px] text-black-400 mt-1 text-right">
                  {dayjs(time).format("h:mm A")}
                </div>
              )}
            </div>

            {sender === "user" && (
              <img
                src={UserProfileImage}
                alt="User"
                className="w-8 h-8 rounded-full ml-2 self-end flex-shrink-0"
              />
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-3">
            <img
              src={RobotProfileImage}
              alt="Bot"
              className="w-8 h-8 rounded-full mr-2 self-end flex-shrink-0"
            />
            <div className="bg-white text-gray-800 px-4 py-2 rounded-2xl rounded-bl-none border border-gray-200 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Typing...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef}></div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-gray-200 bg-white">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about farming, crops, fertilizers..."
          disabled={isLoading}
          className="flex-grow border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !inputText.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full font-medium transition active:scale-95 flex items-center justify-center"
          title="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
