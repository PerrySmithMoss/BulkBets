package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/PerrySmithMoss/BulkBets/server/internal/auth/oauth"
	"github.com/go-chi/chi/v5"
	"golang.org/x/oauth2"
)

func TestRequestLimitCannotBeBypassedWithForwardedHeaders(t *testing.T) {
	calls := 0
	handler := requestLimit(2, time.Hour)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls++; w.WriteHeader(204) }))
	for i := range 3 {
		r := httptest.NewRequest("POST", "/", nil)
		r.RemoteAddr = "127.0.0.1:1234"
		r.Header.Set("X-Forwarded-For", strings.Repeat("1", i+1))
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		if i == 2 && w.Code != 429 {
			t.Fatal("rate limit bypassed")
		}
	}
	if calls != 2 {
		t.Fatal("unexpected permitted request count")
	}
}

func TestOAuthStateIsRandomAndBoundToBrowser(t *testing.T) {
	app := &application{oauth: oauth.OAuthConfigs{OAuth2: map[string]*oauth2.Config{"google": {ClientID: "test", Endpoint: oauth2.Endpoint{AuthURL: "https://accounts.example.invalid/auth", TokenURL: "https://accounts.example.invalid/token"}}}}}
	router := chi.NewRouter()
	router.Get("/oauth/{provider}", app.oauth2Handler)
	router.Get("/oauth/{provider}/callback", app.oauth2CallbackHandler)
	start := func() (string, *http.Cookie) {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest("GET", "/oauth/google", nil))
		var body map[string]string
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		cookies := w.Result().Cookies()
		if len(cookies) != 1 || !cookies[0].HttpOnly || len(cookies[0].Value) != 43 {
			t.Fatal("invalid state cookie")
		}
		return body["oauthUrl"], cookies[0]
	}
	first, cookie := start()
	second, _ := start()
	if first == second {
		t.Fatal("OAuth state reused")
	}
	for _, c := range []*http.Cookie{nil, cookie} {
		r := httptest.NewRequest("GET", "/oauth/google/callback?code=test&state="+strings.Repeat("x", 43), nil)
		if c != nil {
			r.AddCookie(c)
		}
		w := httptest.NewRecorder()
		router.ServeHTTP(w, r)
		if w.Code != 400 {
			t.Fatalf("unbound state accepted: %d", w.Code)
		}
	}
}
