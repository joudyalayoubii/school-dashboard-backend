import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export const connectSocket = (): Socket | null => {
  if (typeof window === "undefined") return null;
  // Reuse the in-flight instance even before its handshake completes — checking `.connected`
  // instead of existence let multiple calls in the same tick (this function is called from here,
  // from emitJoinSchoolRoom, and from onForceLogout) each spin up a parallel connection, which
  // then evicted each other via the server's single-session enforcement.
  if (socketInstance) return socketInstance;

  const token = window.localStorage.getItem("access_token") ?? window.localStorage.getItem("token");

  socketInstance = io(process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001", {
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    auth: token ? { authorization: `Bearer ${token}` } : undefined,
  });

  socketInstance.on("connect", () => {
    console.info("Socket connected successfully");
  });

  socketInstance.on("connect_error", (error) => {
    console.warn("Socket connection error:", error.message);
  });

  socketInstance.on("disconnect", (reason) => {
    console.info("Socket disconnected:", reason);
  });

  socketInstance.on("reconnect", (attemptNumber) => {
    console.info("Socket reconnected after", attemptNumber, "attempts");
  });

  return socketInstance;
};

export const disconnectSocket = (socket: Socket | null = socketInstance): void => {
  socket?.disconnect();
  if (socket === socketInstance) {
    socketInstance = null;
  }
};

export const getSocket = (): Socket | null => socketInstance;

export const emitJoinSchoolRoom = (schoolId: string): void => {
  const socket = connectSocket();
  if (socket?.connected) {
    socket.emit("joinSchoolRoom", { schoolId });
  } else {
    socket?.once("connect", () => socket.emit("joinSchoolRoom", { schoolId }));
  }
};

export type LessonStatusChangedEvent = {
  lessonName: string;
  status: "LOCKED" | "LESSON_OPEN" | "QUIZ_OPEN";
  activeQuizId?: string;
  examStartedAt?: string | null;
};

export type QuizTimeExpiredEvent = {
  lessonName: string;
  quizId: string | null;
};

export const onForceLogout = (callback: (reason: string) => void): (() => void) => {
  const socket = connectSocket();
  const handler = (data: { reason: string }) => callback(data.reason);
  socket?.on("forceLogout", handler);
  return () => socket?.off("forceLogout", handler);
};

export const onLessonStatusChanged = (callback: (data: LessonStatusChangedEvent) => void): (() => void) => {
  const socket = connectSocket();
  socket?.on("lessonStatusChanged", callback);
  return () => socket?.off("lessonStatusChanged", callback);
};

export const onQuizTimeExpired = (callback: (data: QuizTimeExpiredEvent) => void): (() => void) => {
  const socket = connectSocket();
  socket?.on("quizTimeExpired", callback);
  return () => socket?.off("quizTimeExpired", callback);
};
