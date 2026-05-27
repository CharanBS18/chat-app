import Avatar from "./Avatar";
import "./Message.css";

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function Message({ message, isMine, showAvatar, showDate }) {
  const senderName = message.sender?.name || "User";

  return (
    <>
      {showDate && (
        <div className="message-date-divider">
          <span>{formatDate(message.createdAt)}</span>
        </div>
      )}
      <div className={`message-row ${isMine ? "mine" : "theirs"}`}>
        {!isMine && (
          <div className="message-avatar-slot">
            {showAvatar ? <Avatar name={senderName} size={28} /> : null}
          </div>
        )}
        <div className="message-content">
          <div className={`message-bubble ${isMine ? "bubble-mine" : "bubble-theirs"}`}>
            <p className="message-text">{message.content}</p>
            {message.status === "failed" && <span className="message-status failed">Not sent</span>}
          </div>
          <span className="message-time">
            {formatTime(message.createdAt)}
            {isMine && message.status === "sending" ? " · sending" : ""}
          </span>
        </div>
      </div>
    </>
  );
}
