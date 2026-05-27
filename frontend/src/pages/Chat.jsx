import { useState, useEffect, useCallback } from "react";
import { userAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import "./Chat.css";

export default function Chat() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await userAPI.getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err.message);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update users' online status when socket events fire
  useEffect(() => {
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        isOnline: onlineUsers.includes(u._id),
      }))
    );
  }, [onlineUsers]);

  return (
    <div className="chat-layout">
      <Sidebar
        users={users}
        loading={loadingUsers}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        currentUser={user}
      />
      <ChatWindow
        selectedUser={selectedUser}
        currentUser={user}
        socket={socket}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
