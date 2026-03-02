# Notification & WebSocket Integration Guide (NextJS)

> Hướng dẫn FE tích hợp hệ thống thông báo real-time qua Socket.IO và REST API.

---

## Mục lục

- [Notification \& WebSocket Integration Guide (NextJS)](#notification--websocket-integration-guide-nextjs)
  - [Mục lục](#mục-lục)
  - [1. Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
  - [2. Cài đặt dependencies](#2-cài-đặt-dependencies)
  - [3. Thiết lập Socket.IO Client](#3-thiết-lập-socketio-client)
  - [4. Tạo Notification Provider (React Context)](#4-tạo-notification-provider-react-context)
  - [5. Hook `useNotification`](#5-hook-usenotification)
  - [6. REST API Endpoints](#6-rest-api-endpoints)
    - [Response format](#response-format)
  - [7. Socket Events Reference](#7-socket-events-reference)
    - [Event Flow theo Role](#event-flow-theo-role)
      - [Citizen nhận các events:](#citizen-nhận-các-events)
      - [Coordinator nhận các events:](#coordinator-nhận-các-events)
      - [Team Leader nhận các events:](#team-leader-nhận-các-events)
  - [8. Notification Data Schema](#8-notification-data-schema)
  - [9. Hướng dẫn theo Role](#9-hướng-dẫn-theo-role)
    - [9.1. Citizen App](#91-citizen-app)
    - [9.2. Coordinator Dashboard](#92-coordinator-dashboard)
    - [9.3. Team Leader App](#93-team-leader-app)
  - [10. UI Component mẫu](#10-ui-component-mẫu)
    - [10.1. NotificationBell (Badge + Dropdown)](#101-notificationbell-badge--dropdown)
    - [10.2. Toast Notification](#102-toast-notification)
  - [11. Xử lý Edge Cases](#11-xử-lý-edge-cases)
    - [11.1. Token hết hạn](#111-token-hết-hạn)
    - [11.2. Mất kết nối \& Reconnect](#112-mất-kết-nối--reconnect)
    - [11.3. Multiple tabs](#113-multiple-tabs)
    - [11.4. Server-Side Rendering (SSR)](#114-server-side-rendering-ssr)
  - [12. Checklist tích hợp](#12-checklist-tích-hợp)
  - [Tham khảo](#tham-khảo)

---

## 1. Tổng quan kiến trúc

```
┌──────────────┐      WebSocket (Socket.IO)        ┌──────────────┐
│   NextJS FE  │  ◄──────────────────────────────  │  BE Server   │
│              │                                   │              │
│  socket.io   │  auth: { token: JWT }             │  Socket.IO   │
│  client      │  ────────────────────────────►    │  Server      │
│              │                                   │              │
│  REST API    │  Authorization: Bearer <JWT>      │  Express API │
│  (axios)     │  ◄──────────────────────────────► │              │
└──────────────┘                                   └──────────────┘
```

**Luồng hoạt động:**

1. User login → nhận JWT token.
2. FE mở kết nối WebSocket với JWT token để nhận thông báo real-time.
3. Server tự động join user vào 2 room: `user:{userId}` và `role:{userRole}`.
4. Khi có event (request submitted, mission assigned, ...) → server emit notification tới các room tương ứng.
5. FE đồng thời dùng REST API để load lịch sử thông báo, mark as read, xoá, v.v.

---

## 2. Cài đặt dependencies

```bash
npm install socket.io-client
# hoặc
yarn add socket.io-client
# hoặc
pnpm add socket.io-client
```

---

## 3. Thiết lập Socket.IO Client

Tạo file `lib/socket.ts`:

```typescript
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

let socket: Socket | null = null;

/**
 * Khởi tạo kết nối WebSocket với JWT token
 */
export function connectSocket(token: string): Socket {
  // Ngắt kết nối cũ nếu có
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

/**
 * Lấy socket instance hiện tại
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Ngắt kết nối WebSocket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

> **Lưu ý:** Token truyền qua `auth` object (không phải query string) để bảo mật hơn. Server hỗ trợ cả 2 cách nhưng khuyến nghị dùng `auth`.

---

## 4. Tạo Notification Provider (React Context)

Tạo file `providers/NotificationProvider.tsx`:

```tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Socket } from "socket.io-client";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { toast } from "sonner"; // hoặc thư viện toast bạn dùng

// ─── Types ───────────────────────────────────────────────────
export interface Notification {
  _id: string;
  userId: string;
  type:
    | "SUBMITTED"
    | "ACCEPTED"
    | "REJECTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "WITHDRAWN";
  role: "CITIZEN" | "COORDINATOR" | "TEAM_LEADER" | "ADMIN" | "MANAGER";
  message: string;
  requestId: string;
  missionId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  timestamp?: string; // injected by socket emitter
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAll: () => Promise<void>;
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  totalPages: number;
  currentPage: number;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────
interface Props {
  children: ReactNode;
}

export function NotificationProvider({ children }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const socketRef = useRef<Socket | null>(null);

  // Lấy token & user từ auth state của bạn
  // Thay bằng hook auth thực tế: useAuth(), useSession(), v.v.
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // ─── Fetch notifications qua REST API ───────────────────
  const fetchNotifications = useCallback(
    async (page = 1, limit = 10) => {
      if (!userId || !token) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${userId}?page=${page}&limit=${limit}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data);
          setUnreadCount(json.data.filter((n: Notification) => !n.isRead).length);
          setTotalPages(json.meta?.pages || 1);
          setCurrentPage(json.meta?.page || 1);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    },
    [userId, token]
  );

  // ─── Mark as read ────────────────────────────────────────
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!token) return;
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/read/${notificationId}`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    },
    [token]
  );

  // ─── Delete single notification ──────────────────────────
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!token) return;
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${notificationId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      } catch (error) {
        console.error("Failed to delete notification:", error);
      }
    },
    [token]
  );

  // ─── Delete all notifications ────────────────────────────
  const deleteAll = useCallback(async () => {
    if (!token || !userId) return;
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/user/${userId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
    }
  }, [token, userId]);

  // ─── WebSocket Connection ────────────────────────────────
  useEffect(() => {
    if (!token || !userId) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
      setIsConnected(false);
    });

    // Server confirmation
    socket.on("CONNECTED", (data) => {
      console.log("✅ Server confirmed:", data);
      // Load initial notifications after connection
      fetchNotifications();
    });

    // ─── Listen to all notification events ──────────────
    // Khi nhận NEW_NOTIFICATION hoặc bất kỳ event nào
    const handleNewNotification = (data: Notification) => {
      // Thêm notification mới vào đầu danh sách
      setNotifications((prev) => [data, ...prev]);
      // Show toast
      toast(data.message, {
        description: new Date(data.createdAt || data.timestamp!).toLocaleString("vi-VN"),
      });
    };

    // Unread count update
    const handleUnreadCount = (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    };

    // Register event listeners
    socket.on(SOCKET_EVENTS.NEW_NOTIFICATION, handleNewNotification);
    socket.on(SOCKET_EVENTS.REQUEST_SUBMITTED, handleNewNotification);
    socket.on(SOCKET_EVENTS.REQUEST_VERIFIED, handleNewNotification);
    socket.on(SOCKET_EVENTS.REQUEST_REJECTED, handleNewNotification);
    socket.on(SOCKET_EVENTS.MISSION_ASSIGNED, handleNewNotification);
    socket.on(SOCKET_EVENTS.MISSION_ACCEPTED, handleNewNotification);
    socket.on(SOCKET_EVENTS.MISSION_APPROACHING, handleNewNotification);
    socket.on(SOCKET_EVENTS.MISSION_COMPLETED, handleNewNotification);
    socket.on(SOCKET_EVENTS.MISSION_FAILED, handleNewNotification);
    socket.on(SOCKET_EVENTS.MISSION_REASSIGNED, handleNewNotification);
    socket.on(SOCKET_EVENTS.MISSION_WITHDRAWN, handleNewNotification);
    socket.on(SOCKET_EVENTS.UNREAD_COUNT_UPDATE, handleUnreadCount);

    // Cleanup
    return () => {
      socket.off(SOCKET_EVENTS.NEW_NOTIFICATION, handleNewNotification);
      socket.off(SOCKET_EVENTS.REQUEST_SUBMITTED, handleNewNotification);
      socket.off(SOCKET_EVENTS.REQUEST_VERIFIED, handleNewNotification);
      socket.off(SOCKET_EVENTS.REQUEST_REJECTED, handleNewNotification);
      socket.off(SOCKET_EVENTS.MISSION_ASSIGNED, handleNewNotification);
      socket.off(SOCKET_EVENTS.MISSION_ACCEPTED, handleNewNotification);
      socket.off(SOCKET_EVENTS.MISSION_APPROACHING, handleNewNotification);
      socket.off(SOCKET_EVENTS.MISSION_COMPLETED, handleNewNotification);
      socket.off(SOCKET_EVENTS.MISSION_FAILED, handleNewNotification);
      socket.off(SOCKET_EVENTS.MISSION_REASSIGNED, handleNewNotification);
      socket.off(SOCKET_EVENTS.MISSION_WITHDRAWN, handleNewNotification);
      socket.off(SOCKET_EVENTS.UNREAD_COUNT_UPDATE, handleUnreadCount);
      disconnectSocket();
    };
  }, [token, userId, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        deleteNotification,
        deleteAll,
        fetchNotifications,
        totalPages,
        currentPage,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────
export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return ctx;
}
```

---

## 5. Hook `useNotification`

Hook đã được export từ `NotificationProvider.tsx` ở trên.

**Cách sử dụng trong component:**

```tsx
"use client";

import { useNotification } from "@/providers/NotificationProvider";

export default function SomeComponent() {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotification();

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      <p>Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>
      {notifications.map((noti) => (
        <div key={noti._id} onClick={() => markAsRead(noti._id)}>
          {noti.message}
        </div>
      ))}
    </div>
  );
}
```

**Mount Provider trong layout:**

```tsx
// app/layout.tsx
import { NotificationProvider } from "@/providers/NotificationProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {/* Đặt bên trong AuthProvider để có token */}
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
```

---

## 6. REST API Endpoints

Base URL: `{API_URL}/api/notifications`

Tất cả endpoints yêu cầu header `Authorization: Bearer <JWT>`.

| Method   | Endpoint                       | Mô tả                              | Params / Body                |
| :------- | :----------------------------- | :---------------------------------- | :--------------------------- |
| `POST`   | `/`                            | Tạo notification mới                | Body: `NotificationData`     |
| `GET`    | `/:userId`                     | Lấy danh sách notification của user | Query: `?page=1&limit=10`   |
| `GET`    | `/detail/:notificationId`      | Lấy chi tiết 1 notification         | —                            |
| `PATCH`  | `/read/:notificationId`        | Đánh dấu đã đọc                    | —                            |
| `DELETE` | `/:notificationId`             | Xoá 1 notification                  | —                            |
| `DELETE` | `/user/:userId`                | Xoá tất cả notification của user    | —                            |

### Response format

**Success:**

```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

**Error:**

```json
{
  "success": false,
  "message": "Error message",
  "data": null,
  "error": {
    "code": "INTERNAL_ERROR"
  }
}
```

---

## 7. Socket Events Reference

Tạo file `lib/socket-events.ts` để định nghĩa constants:

```typescript
/**
 * Socket event constants - phải khớp với BE (notification.emitter.js)
 */
export const SOCKET_EVENTS = {
  // ─── Request Lifecycle ───────────────────────────
  /** Citizen gửi request mới → Coordinator nhận */
  REQUEST_SUBMITTED: "REQUEST_SUBMITTED",

  /** Coordinator xác minh request → Citizen nhận */
  REQUEST_VERIFIED: "REQUEST_VERIFIED",

  /** Coordinator từ chối request → Citizen nhận */
  REQUEST_REJECTED: "REQUEST_REJECTED",

  // ─── Mission Lifecycle ───────────────────────────
  /** Coordinator assign team → Citizen + Team Leader nhận */
  MISSION_ASSIGNED: "MISSION_ASSIGNED",

  /** Team accept nhiệm vụ → Coordinator nhận */
  MISSION_ACCEPTED: "MISSION_ACCEPTED",

  /** Team đang trên đường → Citizen nhận */
  MISSION_APPROACHING: "MISSION_APPROACHING",

  /** Team đến nơi và cứu xong → Citizen nhận */
  MISSION_RESCUED: "MISSION_RESCUED",

  /** Mission hoàn thành → Citizen + Coordinator nhận */
  MISSION_COMPLETED: "MISSION_COMPLETED",

  /** Mission thất bại → Citizen + Coordinator nhận */
  MISSION_FAILED: "MISSION_FAILED",

  /** Mission được chuyển cho team khác → Team Leader mới nhận */
  MISSION_REASSIGNED: "MISSION_REASSIGNED",

  /** Team từ chối / rút khỏi mission → Coordinator nhận */
  MISSION_WITHDRAWN: "MISSION_WITHDRAWN",

  // ─── General ─────────────────────────────────────
  /** Notification mới (generic) */
  NEW_NOTIFICATION: "NEW_NOTIFICATION",

  /** Cập nhật số lượng chưa đọc */
  UNREAD_COUNT_UPDATE: "UNREAD_COUNT_UPDATE",

  /** Server confirm kết nối thành công */
  CONNECTED: "CONNECTED",
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
```

### Event Flow theo Role

#### Citizen nhận các events:

| Event                | Khi nào                            | Message mẫu                                      |
| :------------------- | :--------------------------------- | :------------------------------------------------ |
| `REQUEST_VERIFIED`   | Request được xác minh              | ✅ Yêu cầu cứu hộ của bạn đã được xác nhận hợp lệ |
| `REQUEST_REJECTED`   | Request bị từ chối                 | ❌ Yêu cầu cứu hộ của bạn đã bị từ chối           |
| `MISSION_ASSIGNED`   | Team được phân công                | ✅ Đội cứu hộ "Alpha" đã được phân công            |
| `MISSION_APPROACHING`| Team đang trên đường               | 🚗 Đội cứu hộ "Alpha" đang trên đường đến         |
| `MISSION_COMPLETED`  | Cứu hộ thành công                  | 🎉 Cứu hộ thành công!                             |
| `MISSION_FAILED`     | Cứu hộ thất bại                   | ⚠️ Cứu hộ không thành công                        |

#### Coordinator nhận các events:

| Event                | Khi nào                            | Message mẫu                                      |
| :------------------- | :--------------------------------- | :------------------------------------------------ |
| `REQUEST_SUBMITTED`  | Citizen gửi request mới           | 🚨 Có yêu cầu cứu hộ mới cần xác minh            |
| `MISSION_ACCEPTED`   | Team accept nhiệm vụ              | 👍 Đội "Alpha" đã nhận nhiệm vụ #123              |
| `MISSION_COMPLETED`  | Mission hoàn thành                 | ✅ Nhiệm vụ #123 hoàn thành thành công             |
| `MISSION_FAILED`     | Mission thất bại                   | ❌ Nhiệm vụ #123 thất bại - cần phân công lại     |
| `MISSION_WITHDRAWN`  | Team từ chối nhiệm vụ             | ⚠️ Đội "Alpha" đã từ chối - cần phân công lại     |

#### Team Leader nhận các events:

| Event                | Khi nào                            | Message mẫu                                      |
| :------------------- | :--------------------------------- | :------------------------------------------------ |
| `MISSION_ASSIGNED`   | Được phân công nhiệm vụ mới       | 📋 Bạn có nhiệm vụ cứu hộ mới - Mission #123     |
| `MISSION_REASSIGNED` | Nhiệm vụ được chuyển từ team khác | 🔄 Nhiệm vụ #123 đã được chuyển cho đội bạn       |

---

## 8. Notification Data Schema

Mỗi notification object nhận qua WebSocket hoặc REST API có cấu trúc:

```typescript
interface Notification {
  _id: string;                    // MongoDB ObjectId
  userId: string;                 // Người nhận (ObjectId ref → User)
  type:                           // Loại notification
    | "SUBMITTED"
    | "ACCEPTED"
    | "REJECTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "WITHDRAWN";
  role:                           // Role của người nhận
    | "CITIZEN"
    | "COORDINATOR"
    | "TEAM_LEADER"
    | "ADMIN"
    | "MANAGER";
  message: string;                // Nội dung hiển thị
  requestId: string;              // Request liên quan (ObjectId ref → Request)
  missionId?: string;             // Mission liên quan (optional)
  isRead: boolean;                // Trạng thái đã đọc
  createdAt: string;              // ISO datetime
  updatedAt: string;              // ISO datetime

  // Chỉ có khi nhận qua WebSocket:
  timestamp?: string;             // ISO datetime (injected by emitter)
}
```

---

## 9. Hướng dẫn theo Role

### 9.1. Citizen App

```tsx
// Chỉ cần listen các events liên quan đến Citizen
const CITIZEN_EVENTS = [
  "REQUEST_VERIFIED",
  "REQUEST_REJECTED",
  "MISSION_ASSIGNED",
  "MISSION_APPROACHING",
  "MISSION_COMPLETED",
  "MISSION_FAILED",
];
```

**UX gợi ý:**
- Hiển thị toast pop-up khi nhận notification mới.
- Badge đỏ trên icon chuông với `unreadCount`.
- Click vào notification → navigate đến request detail page.

### 9.2. Coordinator Dashboard

```tsx
const COORDINATOR_EVENTS = [
  "REQUEST_SUBMITTED",
  "MISSION_ACCEPTED",
  "MISSION_COMPLETED",
  "MISSION_FAILED",
  "MISSION_WITHDRAWN",
];
```

**UX gợi ý:**
- Sidebar notification panel (always visible).
- Sound alert cho `REQUEST_SUBMITTED` (request mới cần xác minh).
- Filter notifications by type.

### 9.3. Team Leader App

```tsx
const TEAM_LEADER_EVENTS = [
  "MISSION_ASSIGNED",
  "MISSION_REASSIGNED",
];
```

**UX gợi ý:**
- Full-screen alert khi có nhiệm vụ mới.
- Action buttons (Accept / Reject) ngay trên notification.

---

## 10. UI Component mẫu

### 10.1. NotificationBell (Badge + Dropdown)

```tsx
"use client";

import { useState } from "react";
import { useNotification } from "@/providers/NotificationProvider";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotification();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button onClick={() => setOpen(!open)} className="relative p-2">
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto z-50">
          <div className="p-3 border-b font-semibold">
            Thông báo ({unreadCount} chưa đọc)
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Không có thông báo
            </div>
          ) : (
            notifications.map((noti) => (
              <div
                key={noti._id}
                onClick={() => markAsRead(noti._id)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                  !noti.isRead ? "bg-blue-50" : ""
                }`}
              >
                <p className="text-sm">{noti.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(noti.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

### 10.2. Toast Notification

Nếu dùng `sonner` hoặc `react-hot-toast`:

```tsx
import { toast } from "sonner";

// Trong NotificationProvider, khi nhận event mới:
const handleNewNotification = (data: Notification) => {
  setNotifications((prev) => [data, ...prev]);

  toast(data.message, {
    description: new Date(data.createdAt).toLocaleString("vi-VN"),
    action: {
      label: "Xem",
      onClick: () => router.push(`/requests/${data.requestId}`),
    },
  });
};
```

---

## 11. Xử lý Edge Cases

### 11.1. Token hết hạn

```tsx
socket.on("connect_error", (err) => {
  if (err.message.includes("Authentication failed")) {
    // Token hết hạn → refresh token hoặc redirect login
    refreshToken().then((newToken) => {
      connectSocket(newToken);
    });
  }
});
```

### 11.2. Mất kết nối & Reconnect

Socket.IO tự động reconnect (đã cấu hình `reconnection: true`). Sau khi reconnect, nên fetch lại notifications để đồng bộ những notification bị miss:

```tsx
socket.on("connect", () => {
  setIsConnected(true);
  // Re-fetch để bắt kịp notifications miss khi offline
  fetchNotifications();
});
```

### 11.3. Multiple tabs

Nếu user mở nhiều tabs, mỗi tab sẽ có 1 socket connection riêng → notifications sẽ nhận trên tất cả tabs. Nếu muốn tối ưu, dùng `BroadcastChannel` API:

```tsx
const channel = new BroadcastChannel("notifications");

// Tab chính: gửi notification cho các tab khác
channel.postMessage({ type: "NEW_NOTIFICATION", data: notification });

// Tab phụ: listen
channel.onmessage = (event) => {
  if (event.data.type === "NEW_NOTIFICATION") {
    setNotifications((prev) => [event.data.data, ...prev]);
  }
};
```

### 11.4. Server-Side Rendering (SSR)

WebSocket chỉ hoạt động ở client-side. Đảm bảo wrap trong `useEffect` hoặc dùng `"use client"` directive:

```tsx
// ❌ KHÔNG làm thế này (sẽ lỗi ở server)
const socket = io("http://localhost:8080");

// ✅ Đúng cách
useEffect(() => {
  const socket = connectSocket(token);
  // ...
  return () => disconnectSocket();
}, [token]);
```

---

## 12. Checklist tích hợp

- [ ] Cài `socket.io-client`
- [ ] Tạo `lib/socket.ts` — Socket connection manager
- [ ] Tạo `lib/socket-events.ts` — Event constants
- [ ] Tạo `providers/NotificationProvider.tsx` — Context + hook
- [ ] Wrap app với `<NotificationProvider>` trong layout
- [ ] Tạo `NotificationBell` component cho header/navbar
- [ ] Xử lý toast notification khi nhận event mới
- [ ] Test kết nối WebSocket (dùng trang test có sẵn tại `/tests/test-websocket.html`)
- [ ] Kiểm tra reconnect khi mất mạng
- [ ] Kiểm tra mark as read / delete qua REST API
- [ ] Thêm `.env`: `NEXT_PUBLIC_API_URL=http://localhost:8080`

---

## Tham khảo

- [Socket.IO Client docs](https://socket.io/docs/v4/client-api/)
- [Rescue Flow 2.2](./flows/Rescue_flow_2.2.md) — Event triggers trong rescue flow
- [Relief Flow 1.1](./flows/Relief_flow_1.1.md) — Event triggers trong relief flow
- Backend source: `src/sockets/` và `src/modules/notifications/`
