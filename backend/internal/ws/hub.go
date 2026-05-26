package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"kenyx/internal/auth"
	"kenyx/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // In production, validate origin
	},
}

// Client represents a connected WebSocket client.
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID string
	rooms  map[string]bool
	mu     sync.RWMutex
}

// Hub maintains all active WebSocket clients.
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan *RoomMessage
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// RoomMessage targets a specific room (submission ID or battle ID).
type RoomMessage struct {
	Room    string
	Payload []byte
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan *RoomMessage, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("WS: client %s connected", client.userID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("WS: client %s disconnected", client.userID)

		case msg := <-h.broadcast:
			h.mu.RLock()
			count := 0
			for client := range h.clients {
				client.mu.RLock()
				inRoom := client.rooms[msg.Room]
				client.mu.RUnlock()
				if inRoom {
					select {
					case client.send <- msg.Payload:
						count++
					default:
					}
				}
			}
			h.mu.RUnlock()
			log.Printf("WS: Broadcast to room %s delivered to %d clients", msg.Room, count)
		}
	}
}

// Broadcast sends a WSMessage to all clients in a room.
func (h *Hub) Broadcast(room string, msg models.WSMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("WS: marshal error: %v", err)
		return
	}
	h.broadcast <- &RoomMessage{Room: room, Payload: data}
}

// BroadcastToUser sends a message directly to all connections of a specific user.
func (h *Hub) BroadcastToUser(userID string, msg models.WSMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("WS: marshal error: %v", err)
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients {
		if client.userID == userID {
			select {
			case client.send <- data:
			default:
			}
		}
	}
}

// ServeWS upgrades an HTTP connection to WebSocket.
func (h *Hub) ServeWS(authSvc *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Authenticate via query param token (WS can't set headers)
		token := c.Query("token")
		var userID string
		if token != "" {
			if claims, err := authSvc.ParseToken(token); err == nil {
				userID = claims.UserID
			}
		}
		if userID == "" {
			userID = "anonymous"
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WS: upgrade error: %v", err)
			return
		}

		client := &Client{
			hub:    h,
			conn:   conn,
			send:   make(chan []byte, 256),
			userID: userID,
			rooms:  make(map[string]bool),
		}
		h.register <- client

		go client.writePump()
		go client.readPump()
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(4096) // Increased from 512
	c.conn.SetReadDeadline(time.Now().Add(120 * time.Second)) // Increased from 60s
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(120 * time.Second))
		return nil
	})

	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		// Handle room subscription messages
		var evt struct {
			Type string `json:"type"`
			Room string `json:"room"`
		}
		if err := json.Unmarshal(msg, &evt); err == nil {
			c.mu.Lock()
			switch evt.Type {
			case "subscribe":
				c.rooms[evt.Room] = true
				log.Printf("WS: client %s subscribed to room %s", c.userID, evt.Room)
			case "unsubscribe":
				delete(c.rooms, evt.Room)
			}
			c.mu.Unlock()
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(msg)
			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// HubClient sends results from the worker back to the hub via HTTP.
type HubClient struct {
	baseURL string
	client  *http.Client
}

func NewHubClient(baseURL string) *HubClient {
	return &HubClient{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 5 * time.Second},
	}
}

func (hc *HubClient) SendResult(submissionID string, msg models.WSMessage) {
	url := fmt.Sprintf("%s/internal/broadcast?room=%s", hc.baseURL, submissionID)
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("HubClient: marshal error: %v", err)
		return
	}

	resp, err := hc.client.Post(url, "application/json", strings.NewReader(string(data)))
	if err != nil {
		log.Printf("HubClient: error sending to %s: %v", url, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("HubClient: received non-OK status: %d", resp.StatusCode)
	}
}
