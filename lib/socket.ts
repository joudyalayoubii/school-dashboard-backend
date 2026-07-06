import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export const connectSocket = () => {
  if (typeof window === "undefined") return null;
  if (socketInstance?.connected) return socketInstance;

  const token = window.localStorage.getItem("access_token") ?? window.localStorage.getItem("token");

  socketInstance = io(process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3000", {
    autoConnect: true,
    transports: ["websocket"],
    auth: token ? { authorization: `Bearer ${token}` } : undefined,
  });

  socketInstance.on("connect", () => {
    console.info("Socket connected");
  });

  socketInstance.on("connect_error", () => {
    console.warn("Socket connection error");
  });

  return socketInstance;
};

export const disconnectSocket = (socket = socketInstance) => {
  socket?.disconnect();
  if (socket === socketInstance) {
    socketInstance = null;
  }
};

export const getSocket = () => socketInstance;
