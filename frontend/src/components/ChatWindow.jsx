import { useState, useEffect, useRef, useCallback } from "react";
import { messageAPI } from "../services/api";
import { getEntityId, isSameDay, normalizeMessages } from "../utils/chat";
import Avatar from "./Avatar";
import Message from "./Message";
import "./ChatWindow.css";

export default function ChatWindow({
  selectedUser,
  currentUser,
  socket,
  onConversationUpdate,
  onClose,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedUserId = getEntityId(selectedUser);
  const currentUserId = getEntityId(currentUser);

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
        const { data } = await messageAPI.getMessages(selectedUserId);
        const nextMessages = normalizeMessages(data);
        if (isMounted) {
          setMessages(nextMessages);
          setError("");
          onConversationUpdate?.(selectedUserId, nextMessages);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err.message);
        if (isMounted) setError("Could not load this conversation.");
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
  }, [selectedUserId, onConversationUpdate]);

  useEffect(() => {
    if (!inputRef.current) return;

    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
  }, [input]);

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
        (getEntityId(message.sender) === selectedUserId &&
          getEntityId(message.receiver) === currentUserId) ||
        (getEntityId(message.sender) === currentUserId &&
          getEntityId(message.receiver) === selectedUserId);

      if (isRelevant) {
        setMessages((prev) => {
          // Avoid duplicates (sender gets echo back)
          const exists = prev.some((m) => m._id === message._id);
          const nextMessages = exists ? prev : normalizeMessages([...prev, message]);
          onConversationUpdate?.(selectedUserId, nextMessages);
          return nextMessages;
        });
      }
    };

    const handleTyping = ({ userId }) => {
      if (userId === selectedUserId) setTyping(true);
    };

    const handleStopTyping = ({ userId }) => {
      if (userId === selectedUserId) setTyping(false);
    };

    socket.on("receive_message", handleReceive);
    socket.on("user_typing", handleTyping);
    socket.on("user_stop_typing", handleStopTyping);

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("user_typing", handleTyping);
      socket.off("user_stop_typing", handleStopTyping);
    };
  }, [socket, selectedUserId, currentUserId, onConversationUpdate]);

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (!socket || !selectedUser) return;

    // Emit typing
    socket.emit("typing", { receiverId: selectedUserId });

    // Clear existing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Stop typing after 1.5s of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { receiverId: selectedUserId });
    }, 1500);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !selectedUser || isSending) return;

    const tempMessage = {
      _id: `temp-${Date.now()}`,
      content: trimmed,
      sender: currentUser,
      receiver: selectedUser,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setIsSending(true);
    setInput("");
    setMessages((prev) => {
      const nextMessages = [...prev, tempMessage];
      onConversationUpdate?.(selectedUserId, nextMessages);
      return nextMessages;
    });

    try {
      const { data } = await messageAPI.sendMessage(selectedUserId, trimmed);
      setMessages((prev) => {
        const nextMessages = normalizeMessages(
          prev.map((message) => (message._id === tempMessage._id ? data : message))
        );
        onConversationUpdate?.(selectedUserId, nextMessages);
        return nextMessages;
      });
      setError("");

      if (socket) {
        socket.emit("stop_typing", { receiverId: selectedUserId });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    } catch (err) {
      console.error("Failed to send message:", err.message);
      setError("Message was not sent. Check your connection and try again.");
      setMessages((prev) =>
        prev.map((message) =>
          message._id === tempMessage._id ? { ...message, status: "failed" } : message
        )
      );
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
          <p>Choose someone from the chat list to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Chat header */}
      <div className="chat-header">
        <div className="chat-header-user">
          <button className="chat-back-btn" onClick={onClose} title="Back to chats">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
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
        <button
          className="chat-refresh-btn"
          onClick={() => {
            setLoading(true);
            messageAPI
              .getMessages(selectedUserId)
              .then(({ data }) => {
                const nextMessages = normalizeMessages(data);
                setMessages(nextMessages);
                onConversationUpdate?.(selectedUserId, nextMessages);
                setError("");
              })
              .catch((err) => {
                console.error("Failed to refresh messages:", err.message);
                setError("Could not refresh this conversation.");
              })
              .finally(() => setLoading(false));
          }}
          title="Refresh messages"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M18.5 2.5v3.3h-3.3M5.5 21.5v-3.3h3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {error && <div className="chat-error-banner">{error}</div>}
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
              const isMine = getEntityId(msg.sender) === currentUserId;
              const showAvatar =
                !isMine &&
                (idx === 0 || getEntityId(prevMsg?.sender) !== getEntityId(msg.sender));
              const showDate = idx === 0 || !isSameDay(prevMsg?.createdAt, msg.createdAt);

              return (
                <Message
                  key={msg._id}
                  message={msg}
                  isMine={isMine}
                  showAvatar={showAvatar}
                  showDate={showDate}
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
            ref={inputRef}
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
