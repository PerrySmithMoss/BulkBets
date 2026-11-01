package main

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"net/url"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
)

type registrationRequest struct {
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	DateOfBirth string `json:"date_of_birth"`
}

func validEmail(value string) bool {
	address, err := mail.ParseAddress(value)
	return err == nil && address.Address == value && len(value) <= 254
}

func validPassword(value string) bool {
	return utf8.RuneCountInString(value) >= 12 && len(value) <= 256
}

func adultDate(value string, now time.Time) (*time.Time, bool) {
	dob, err := time.Parse("2006-01-02", value)
	if err != nil || dob.Year() < 1900 || dob.AddDate(18, 0, 0).After(now.UTC()) {
		return nil, false
	}
	return &dob, true
}

func (app *application) registerUserHandler(w http.ResponseWriter, r *http.Request) {
	var payload registrationRequest
	r.Body = http.MaxBytesReader(w, r.Body, 8192)
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Enter valid account details.")
		return
	}
	payload.FirstName = strings.TrimSpace(payload.FirstName)
	payload.LastName = strings.TrimSpace(payload.LastName)
	payload.Email = strings.ToLower(strings.TrimSpace(payload.Email))
	if payload.FirstName == "" || payload.LastName == "" || utf8.RuneCountInString(payload.FirstName) > 100 || utf8.RuneCountInString(payload.LastName) > 100 {
		writeJSONError(w, http.StatusBadRequest, "Enter your first and last name (up to 100 characters each).")
		return
	}
	if !validEmail(payload.Email) {
		writeJSONError(w, http.StatusBadRequest, "Enter a valid email address.")
		return
	}
	if !validPassword(payload.Password) {
		writeJSONError(w, http.StatusBadRequest, "Use a password of at least 12 characters (up to 256 bytes).")
		return
	}
	dob, valid := adultDate(payload.DateOfBirth, time.Now())
	if !valid {
		writeJSONError(w, http.StatusBadRequest, "You must be 18 or over to create an account. Check your date of birth.")
		return
	}
	user := &store.User{FirstName: payload.FirstName, LastName: payload.LastName, Email: payload.Email, DateOfBirth: dob}
	if err := user.Password.Set(payload.Password); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Unable to create your account. Please try again.")
		return
	}
	if err := app.store.UserRepository.Create(r.Context(), user); err != nil {
		if errors.Is(err, store.ErrDuplicateEmail) {
			writeJSONError(w, http.StatusConflict, "An account already uses this email. Log in or reset your password.")
		} else {
			writeJSONError(w, http.StatusInternalServerError, "Unable to create your account. Please try again.")
		}
		return
	}
	app.jsonResponse(w, http.StatusCreated, map[string]string{"message": "Account created. You can now log in."})
}

func resetDigest(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func (app *application) forgotPasswordHandler(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Email string `json:"email"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	if json.NewDecoder(r.Body).Decode(&payload) != nil || !validEmail(strings.TrimSpace(payload.Email)) {
		writeJSONError(w, http.StatusBadRequest, "Enter a valid email address.")
		return
	}
	if os.Getenv("SMTP_ADDR") == "" || os.Getenv("SMTP_FROM") == "" {
		writeJSONError(w, http.StatusServiceUnavailable, "Password recovery is temporarily unavailable. Please try again later.")
		return
	}
	// Give the same response for known and unknown addresses.
	user, err := app.store.UserRepository.GetUserByEmail(r.Context(), strings.ToLower(strings.TrimSpace(payload.Email)))
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		writeJSONError(w, http.StatusServiceUnavailable, "Password recovery is temporarily unavailable. Please try again later.")
		return
	}
	if user != nil && user.Password.IsSet() {
		bytes := make([]byte, 32)
		if _, err := rand.Read(bytes); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "Please try again later.")
			return
		}
		token := hex.EncodeToString(bytes)
		created, err := app.store.UserRepository.SavePasswordReset(r.Context(), user.Id.String(), resetDigest(token))
		if err != nil {
			writeJSONError(w, http.StatusServiceUnavailable, "Please try again later.")
			return
		}
		if created {
			// The fragment keeps the secret out of access logs and Referer headers.
			link := strings.TrimRight(app.cfg.App.AppClientUrl, "/") + "/reset-password#token=" + url.QueryEscape(token)
			if err := app.sendResetEmail(user.Email, link); err != nil {
				// Do not reveal account existence or log the reset URL/SMTP credentials.
				fmt.Println("Password recovery email delivery failed")
			}
		}
	}
	app.jsonResponse(w, http.StatusOK, map[string]string{"message": "If an account uses this email, you will receive a reset link. Check your inbox and spam folder."})
}

func (app *application) resetPasswordHandler(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	if json.NewDecoder(r.Body).Decode(&payload) != nil || len(payload.Token) != 64 || !validPassword(payload.Password) {
		writeJSONError(w, http.StatusBadRequest, "Use a valid reset link and a password of at least 12 characters.")
		return
	}
	var password store.Password
	if err := password.Set(payload.Password); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Please try again later.")
		return
	}
	err := app.store.UserRepository.ResetPassword(r.Context(), resetDigest(payload.Token), password.GetPasswordHash())
	if errors.Is(err, store.ErrNotFound) {
		writeJSONError(w, http.StatusBadRequest, "This reset link has expired or has already been used. Request a new link.")
		return
	}
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Unable to reset your password. Please try again.")
		return
	}
	for _, name := range []string{"access_token", "refresh_token"} {
		http.SetCookie(w, &http.Cookie{Name: name, Value: "", Path: "/", HttpOnly: true, Secure: app.cfg.App.AppEnv == "production", SameSite: http.SameSiteLaxMode, MaxAge: -1})
	}
	app.jsonResponse(w, http.StatusOK, map[string]string{"message": "Password updated. Log in with your new password."})
}

func (app *application) sendResetEmail(to, link string) error {
	addr, from := os.Getenv("SMTP_ADDR"), os.Getenv("SMTP_FROM")
	if !validEmail(from) {
		return errors.New("invalid sender")
	}
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return err
	}
	conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
	if err != nil {
		return err
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(10 * time.Second))
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()
	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	} else if app.cfg.App.AppEnv == "production" {
		return errors.New("SMTP requires TLS in production")
	}
	if username := os.Getenv("SMTP_USERNAME"); username != "" {
		if err := client.Auth(smtp.PlainAuth("", username, os.Getenv("SMTP_PASSWORD"), host)); err != nil {
			return err
		}
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(writer, "From: BulkBets <%s>\r\nTo: %s\r\nSubject: Reset your BulkBets password\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nReset your password using this link:\r\n%s\r\n\r\nThis link expires in 30 minutes and can only be used once. If you did not request it, ignore this email.\r\n", from, to, link)
	if err != nil {
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}
	return client.Quit()
}
