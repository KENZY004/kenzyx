"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/auth";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

type MessageHandler = (data: unknown) => void;

interface WSMessage {
  type: string;
  payload: unknown;
}

export function useWebSocket() {
  const { token } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectTimer = useRef<NodeJS.Timeout>();
  const subscribedRooms = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    const url = token ? `${WS_URL}?token=${token}` : WS_URL;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS: connected");
      // Re-subscribe to all rooms after reconnect
      subscribedRooms.current.forEach((room) => {
        ws.send(JSON.stringify({ type: "subscribe", room }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        const handlers = handlersRef.current.get(msg.type);
        if (handlers) {
          handlers.forEach((handler) => handler(msg.payload));
        }
        // Also dispatch to wildcard handlers
        const wildcard = handlersRef.current.get("*");
        if (wildcard) {
          wildcard.forEach((handler) => handler(msg));
        }
      } catch (e) {
        console.error("WS: parse error", e);
      }
    };

    ws.onclose = () => {
      console.log("WS: disconnected, reconnecting in 3s...");
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error("WS error:", err);
      ws.close();
    };
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((room: string) => {
    subscribedRooms.current.add(room);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", room }));
    }
  }, []);

  const unsubscribe = useCallback((room: string) => {
    subscribedRooms.current.delete(room);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "unsubscribe", room }));
    }
  }, []);

  const on = useCallback((eventType: string, handler: MessageHandler) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler);

    return () => {
      handlersRef.current.get(eventType)?.delete(handler);
    };
  }, []);

  return { subscribe, unsubscribe, on };
}

// Scoped hook for a specific submission
export function useSubmissionSocket(submissionId: string | null) {
  const { subscribe, unsubscribe, on } = useWebSocket();

  useEffect(() => {
    if (!submissionId) return;
    subscribe(submissionId);
    return () => unsubscribe(submissionId);
  }, [submissionId, subscribe, unsubscribe]);

  return { on };
}
