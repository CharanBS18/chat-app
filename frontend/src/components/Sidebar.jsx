import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { formatConversationTime, getEntityId } from "../utils/chat";
import Avatar from "./Avatar";
import "./Sidebar.css";

export default function Sidebar({
  users,
  loading,
  selectedUser,
  onSelectUser,
  currentUser,
  conversationMeta = {},
}) {
  const { logout } = useAuth();
  const { connected } = useSocket();
  const [search, setSearch] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const hasSearch = search.trim().length > 0;

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const onlineCount = users.filter((u) => u.isOnline).length;
  const startedChats = Object.values(conversationMeta).filter((meta) => meta.lastMessage).length;

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="sidebar-brand-name">ChatFlow</span>
        </div>
        <div className={`sidebar-conn ${connected ? "connected" : "disconnected"}`}>
          <span className="sidebar-conn-dot" />
          {connected ? "Live" : "Sync"}
        </div>
      </div>

      {/* Current user profile */}
      <div className="sidebar-profile">
        <button
          className="profile-summary"
          onClick={() => setShowProfile((value) => !value)}
          aria-expanded={showProfile}
        >
          <Avatar name={currentUser?.name} size={48} />
          <div className="profile-summary-info">
            <span className="profile-label">Your profile</span>
            <span className="profile-name">{currentUser?.name}</span>
            <span className="profile-email">{currentUser?.email}</span>
          </div>
          <span className={`profile-chevron ${showProfile ? "open" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {showProfile && (
          <div className="profile-panel">
            <div className="profile-stat-grid">
              <div className="profile-stat">
                <span>{users.length}</span>
                <small>People</small>
              </div>
              <div className="profile-stat">
                <span>{startedChats}</span>
                <small>Chats</small>
              </div>
              <div className="profile-stat">
                <span>{onlineCount}</span>
                <small>Online</small>
              </div>
            </div>
            <div className="profile-name-card">
              <span>Friends can find you as</span>
              <strong>{currentUser?.name}</strong>
            </div>
            <button className="profile-logout" onClick={logout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="people-search-block">
        <div className="people-search-copy">
          <span>Find friends</span>
          <p>Search the exact name they used when registering.</p>
        </div>
        <div className="sidebar-search">
          <svg className="sidebar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.7"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Type a friend's name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="sidebar-search-clear" onClick={() => setSearch("")} title="Clear search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Online count */}
      <div className="sidebar-section-label">
        <span>{hasSearch ? "People" : "Recent chats"}</span>
        <span className="sidebar-online-badge">
          {hasSearch ? `${filtered.length} found` : `${onlineCount} online`}
        </span>
      </div>

      {/* User list */}
      <div className="sidebar-users">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="user-skeleton">
              <div className="skeleton-avatar" />
              <div className="skeleton-info">
                <div className="skeleton-line skeleton-name" />
                <div className="skeleton-line skeleton-status" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="sidebar-empty">
            <div className="sidebar-empty-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <strong>{search ? "No person found" : "No people yet"}</strong>
            <span>
              {search
                ? "Check the registered name and try again."
                : "When people create accounts, they will appear here."}
            </span>
          </div>
        ) : (
          filtered.map((u) => {
            const userId = getEntityId(u);
            const meta = conversationMeta[userId] || {};
            const isActive = getEntityId(selectedUser) === userId;

            return (
              <button
                key={userId}
                className={`user-item ${isActive ? "active" : ""}`}
                onClick={() => onSelectUser(u)}
              >
                <div className="user-item-avatar">
                  <Avatar name={u.name} size={44} />
                  <span className={`user-item-status-dot ${u.isOnline ? "online" : "offline"}`} />
                </div>
                <div className="user-item-info">
                  <div className="user-item-main">
                    <span className="user-item-name">{u.name}</span>
                    <span className="user-item-time">
                      {formatConversationTime(meta.lastMessage?.createdAt)}
                    </span>
                  </div>
                  <div className="user-item-meta">
                    <span className="user-item-sub">
                      {meta.preview || (u.isOnline ? "Online" : "Tap to start chatting")}
                    </span>
                    {meta.unread > 0 && <span className="user-item-unread">{meta.unread}</span>}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
