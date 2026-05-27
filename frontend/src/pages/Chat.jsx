import { useState, useEffect, useCallback } from "react";
import { userAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { getEntityId, getLastMessagePreview, getMessageTime } from "../utils/chat";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import "./Chat.css";

export default function Chat() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [conversationMeta, setConversationMeta] = useState({});

  const currentUserId = getEntityId(user);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await userAPI.getUsers();
      setUsers(data.filter((u) => getEntityId(u) !== currentUserId));
    } catch (err) {
      console.error("Failed to fetch users:", err.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update users' online status when socket events fire
  useEffect(() => {
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        isOnline: onlineUsers.includes(getEntityId(u)),
      }))
    );
  }, [onlineUsers]);

  const handleSelectUser = (nextUser) => {
    const nextUserId = getEntityId(nextUser);
    setSelectedUser(nextUser);
    setConversationMeta((prev) => ({
      ...prev,
      [nextUserId]: {
        ...prev[nextUserId],
        unread: 0,
      },
    }));
  };

  const handleConversationUpdate = useCallback(
    (chatUserId, messages) => {
      const lastMessage = messages[messages.length - 1] || null;
      const selectedUserId = getEntityId(selectedUser);

      setConversationMeta((prev) => {
        const previous = prev[chatUserId] || {};
        const wasUpdated =
          lastMessage &&
          previous.lastMessageId &&
          previous.lastMessageId !== lastMessage._id &&
          selectedUserId !== chatUserId;

        return {
          ...prev,
          [chatUserId]: {
            ...previous,
            lastMessage,
            lastMessageId: lastMessage?._id,
            lastMessageAt: getMessageTime(lastMessage),
            preview: getLastMessagePreview(lastMessage, currentUserId),
            unread: wasUpdated ? (previous.unread || 0) + 1 : previous.unread || 0,
          },
        };
      });
    },
    [currentUserId, selectedUser]
  );

  const sortedUsers = [...users].sort((a, b) => {
    const aTime = conversationMeta[getEntityId(a)]?.lastMessageAt || 0;
    const bTime = conversationMeta[getEntityId(b)]?.lastMessageAt || 0;
    return bTime - aTime || a.name.localeCompare(b.name);
  });

  return (
    <div className={`chat-layout ${selectedUser ? "has-selected-chat" : ""}`}>
      <Sidebar
        users={sortedUsers}
        loading={loadingUsers}
        selectedUser={selectedUser}
        onSelectUser={handleSelectUser}
        currentUser={user}
        conversationMeta={conversationMeta}
      />
      <ChatWindow
        selectedUser={selectedUser}
        currentUser={user}
        socket={socket}
        onConversationUpdate={handleConversationUpdate}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
