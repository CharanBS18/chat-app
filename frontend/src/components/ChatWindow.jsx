import { useState, useEffect, useRef, useCallback } from "react";
import { messageAPI } from "../services/api";
import Avatar from "./Avatar";
import Message from "./Message";
import "./ChatWindow.css";

export default function ChatWindow({ selectedUser, currentUser, socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load chat history
  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    let isMounted = true;

    const fetchHistory = async ({ showLoading = false } = {}) => {
      if (showLoading) setLoading(true);
      try {
        const { data } = await messageAPI.getMessages(selectedUser._id);
        if (isMounted) setMessages(data);
      } catch (err) {
        console.error("Failed to fetch messages:", err.message);
      } finally {
        if (isMounted && showLoading) setLoading(false);
      }
    };

    fetchHistory({ showLoading: true });
    const pollId = setInterval(fetchHistory, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollId);
    };
  }, [selectedUser?._id]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Optional socket events. The deployed Cloudflare Worker uses REST, so this
  // only runs if a compatible socket implementation is supplied later.
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (message) => {
      const isRelevant =
        (message.sender._id === selectedUser?._id &&
          message.receiver._id === currentUser._id) ||
        (message.sender._id === currentUser._id &&
          message.receiver._id === selectedUser?._id);

      if (isRelevant) {
        setMessages((prev) => {
          // Avoid duplicates (sender gets echo back)
          const exists = prev.some((m) => m._id === message._id);
          return exists ? prev : [...prev, message];
        });
      }
    };

    const handleTyping = ({ userId }) => {
      if (userId === selectedUser?._id) setTyping(true);
    };

    const handleStopTyping = ({ userId }) => {
      if (userId === selectedUser?._id) setTyping(false);
    };

    socket.on("receive_message", handleReceive);
    socket.on("user_typing", handleTyping);
    socket.on("user_stop_typing", handleStopTyping);

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("user_typing", handleTyping);
      socket.off("user_stop_typing", handleStopTyping);
    };
  }, [socket, selectedUser?._id, currentUser._id]);

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (!socket || !selectedUser) return;

    // Emit typing
    socket.emit("typing", { receiverId: selectedUser._id });

    // Clear existing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Stop typing after 1.5s of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { receiverId: selectedUser._id });
    }, 1500);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !selectedUser || isSending) return;

    setIsSending(true);
    try {
      const { data } = await messageAPI.sendMessage(selectedUser._id, trimmed);
      setMessages((prev) => [...prev, data]);
      setInput("");

      if (socket) {
        socket.emit("stop_typing", { receiverId: selectedUser._id });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    } catch (err) {
      console.error("Failed to send message:", err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // Empty state
  if (!selectedUser) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-content">
          <div className="chat-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>Select a conversation</h2>
          <p>Choose a user from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Chat header */}
      <div className="chat-header">
        <div className="chat-header-user">
          <div className="chat-header-avatar">
            <Avatar name={selectedUser.name} size={42} />
            <span className={`chat-header-status ${selectedUser.isOnline ? "online" : "offline"}`} />
          </div>
          <div className="chat-header-info">
            <h2>{selectedUser.name}</h2>
            <span className={`chat-header-presence ${selectedUser.isOnline ? "online" : ""}`}>
              {typing ? (
                <span className="typing-label">
                  <span className="typing-dots">
                    <span /><span /><span />
                  </span>
                  typing...
                </span>
              ) : selectedUser.isOnline ? (
                "Active now"
              ) : (
                "Offline"
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div className="chat-loading">
            <div className="chat-loading-spinner" />
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-no-messages">
            <div className="chat-no-messages-avatar">
              <Avatar name={selectedUser.name} size={56} />
            </div>
            <p className="chat-no-messages-name">{selectedUser.name}</p>
            <p className="chat-no-messages-sub">
              Start the conversation — say something!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1];
              const isMine = msg.sender._id === currentUser._id;
              const showAvatar =
                !isMine &&
                (idx === 0 || prevMsg?.sender._id !== msg.sender._id);
              return (
                <Message
                  key={msg._id}
                  message={msg}
                  isMine={isMine}
                  showAvatar={showAvatar}
                />
              );
            })}
            {typing && (
              <div className="typing-indicator">
                <Avatar name={selectedUser.name} size={28} />
                <div className="typing-bubble">
                  <span className="typing-dots">
                    <span /><span /><span />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form className="chat-input-area" onSubmit={handleSend}>
        <div className="chat-input-wrapper">
          <textarea
            className="chat-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${selectedUser.name}...`}
            rows={1}
            maxLength={2000}
          />
          <button
            type="submit"
            className={`chat-send-btn ${input.trim() ? "active" : ""}`}
            disabled={!input.trim() || isSending}
            title="Send message (Enter)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="chat-input-hint">
          Enter to send · Shift+Enter for new line · {input.length}/2000
        </p>
      </form>
    </div>
  );
}
