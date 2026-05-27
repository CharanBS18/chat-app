export function getEntityId(entity) {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
}

export function getMessageTime(message) {
  return new Date(message?.createdAt || message?.timestamp || Date.now()).getTime();
}

export function normalizeMessages(messages = []) {
  return [...messages].sort((a, b) => getMessageTime(a) - getMessageTime(b));
}

export function isSameDay(a, b) {
  if (!a || !b) return false;

  const first = new Date(a);
  const second = new Date(b);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function formatConversationTime(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, now)) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function getLastMessagePreview(message, currentUserId) {
  if (!message) return "No messages yet";

  const senderId = getEntityId(message.sender);
  const prefix = senderId === currentUserId ? "You: " : "";
  return `${prefix}${message.content || ""}`.trim();
}
