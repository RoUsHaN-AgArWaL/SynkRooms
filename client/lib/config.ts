// const configuredWebSocketUrl = import.meta.env.VITE_WS_URL?.trim();

// export const BACKEND_URL =
//   configuredWebSocketUrl ||
//   (typeof window !== "undefined"
//     ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api`
//     : "ws://localhost:3000");

// export const BACKEND_URL = "ws://localhost:3000/";
export const BACKEND_URL = "wss://synkrooms.onrender.com/";