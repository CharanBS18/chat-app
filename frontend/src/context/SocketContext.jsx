import { createContext, useContext } from "react";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const onlineUsers = [];
  const isUserOnline = () => false;

  return (
    <SocketContext.Provider
      value={{ socket: null, connected: false, onlineUsers, isUserOnline }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};
