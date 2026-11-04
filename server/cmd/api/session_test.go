package main

import (
	"context"
	"github.com/PerrySmithMoss/BulkBets/server/config"
	"github.com/PerrySmithMoss/BulkBets/server/internal/auth"
	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
	"github.com/google/uuid"
	"net/http"
	"net/http/httptest"
	"testing"
)

type sessionTestUsers struct {
	store.UserRepository
	user store.User
}

func (s *sessionTestUsers) GetUserByID(context.Context, string) (*store.User, error) {
	return &s.user, nil
}

func TestAccessTokenRevokedImmediately(t *testing.T) {
	issuer := "https://test.invalid"
	users := &sessionTestUsers{user: store.User{Id: uuid.New(), Status: "active", SessionVersion: 1}}
	app := &application{store: store.Storage{UserRepository: users}, cfg: config.Config{Auth: config.Auth{Token: config.TokenConfig{AccessToken: config.TokenClaimsConfig{Iss: issuer, Exp: "15m"}, RefreshToken: config.TokenClaimsConfig{Iss: issuer, Exp: "168h"}}}}, authenticator: &auth.TokenAuthenticator{AccessTokenAuthenticator: auth.NewJWTAuthenticator("test-access", issuer, issuer), RefreshTokenAuthenticator: auth.NewJWTAuthenticator("test-refresh", issuer, issuer)}}
	issued := httptest.NewRecorder()
	if !app.writeSessionCookies(issued, users.user.Id.String(), 1, 1) {
		t.Fatal("issue session")
	}
	var cookie *http.Cookie
	for _, c := range issued.Result().Cookies() {
		if c.Name == auth.AccessTokenCookieName {
			cookie = c
		}
	}
	if cookie == nil {
		t.Fatal("missing access cookie")
	}
	h := app.DeserialiseUserMiddleware(app.RequireUserMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })))
	for _, want := range []int{204, 401} {
		r := httptest.NewRequest("GET", "/api/v1/users/me", nil)
		r.AddCookie(cookie)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != want {
			t.Fatalf("status %d, want %d", w.Code, want)
		}
		users.user.SessionVersion++
	}
}
