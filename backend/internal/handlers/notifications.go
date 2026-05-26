package handlers

import (
	"github.com/gin-gonic/gin"
	"kenyx/internal/auth"
	"kenyx/internal/models"
)

func (h *Handler) GetMyNotifications(c *gin.Context) {
	userID := auth.GetUserID(c)
	notifs, err := h.store.GetMyNotifications(userID)
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, notifs)
}

func (h *Handler) MarkNotificationRead(c *gin.Context) {
	userID := auth.GetUserID(c)
	id := c.Param("id")
	if err := h.store.MarkNotificationRead(id, userID); err != nil {
		serverError(c, err)
		return
	}
	ok(c, gin.H{"updated": true})
}

func (h *Handler) MarkAllNotificationsRead(c *gin.Context) {
	userID := auth.GetUserID(c)
	if err := h.store.MarkAllNotificationsRead(userID); err != nil {
		serverError(c, err)
		return
	}
	ok(c, gin.H{"updated": true})
}

// Internal helper to broadcast notification IF real-time hub is enabled
func (h *Handler) NotifyUserRealtime(userID string, n *models.Notification) {
	if h.hub != nil {
		h.hub.BroadcastToUser(userID, models.WSMessage{
			Type:    "notification:new",
			Payload: n,
		})
	}
}
