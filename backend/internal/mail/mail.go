package mail

import (
	"fmt"
	"log"
	"net/smtp"
)

// Mailer defines the interface for sending system emails.
type Mailer interface {
	SendVerificationEmail(to, username, token string) error
	SendWelcomeEmail(to, username string) error
}

// ConsoleMailer prints emails to the console (Dev Mode).
type ConsoleMailer struct {
	BaseURL string
}

func (m *ConsoleMailer) SendVerificationEmail(to, username, token string) error {
	link := fmt.Sprintf("%s/verify?token=%s", m.BaseURL, token)
	log.Printf("\n[📧 EMAIL SENT TO %s]\nSubject: Verify your Kenyx Account\nHi %s,\nClick here to verify: %s\n", to, username, link)
	return nil
}

func (m *ConsoleMailer) SendWelcomeEmail(to, username string) error {
	log.Printf("\n[📧 EMAIL SENT TO %s]\nSubject: Welcome to Kenyx!\nHi %s, welcome to the community!\n", to, username)
	return nil
}

// GoogleMailer integrates with Gmail SMTP.
type GoogleMailer struct {
	BaseURL  string
	Email    string
	Password string
}

func (m *GoogleMailer) SendVerificationEmail(to, username, token string) error {
	link := fmt.Sprintf("%s/verify?token=%s", m.BaseURL, token)
	subject := "Subject: Verify your Kenyx Account\r\n"
	body := fmt.Sprintf("Hi %s,\r\n\r\nClick here to verify: %s\r\n", username, link)
	msg := []byte(subject + "\r\n" + body)

	auth := smtp.PlainAuth("", m.Email, m.Password, "smtp.gmail.com")
	err := smtp.SendMail("smtp.gmail.com:587", auth, m.Email, []string{to}, msg)
	if err != nil {
		log.Printf("Failed to send verification email to %s: %v", to, err)
	}
	return err
}

func (m *GoogleMailer) SendWelcomeEmail(to, username string) error {
	subject := "Subject: Welcome to Kenyx!\r\n"
	body := fmt.Sprintf("Hi %s, welcome to the community!\r\n", username)
	msg := []byte(subject + "\r\n" + body)

	auth := smtp.PlainAuth("", m.Email, m.Password, "smtp.gmail.com")
	err := smtp.SendMail("smtp.gmail.com:587", auth, m.Email, []string{to}, msg)
	if err != nil {
		log.Printf("Failed to send welcome email to %s: %v", to, err)
	}
	return err
}
