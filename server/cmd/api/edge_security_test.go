package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"github.com/PerrySmithMoss/BulkBets/server/config"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestAuthenticatedEdgeAddresses(t *testing.T) {
	secret := strings.Repeat("a", 48)
	app := &application{cfg: config.Config{App: config.AppConfig{EdgeProxySecret: secret, TrustedProxyCIDR: "10.42.10.0/24"}}}
	signed := func(ip string, age int64) *http.Request {
		r := httptest.NewRequest("POST", "/api/v1/auth/login", nil)
		r.RemoteAddr = "10.42.10.3:1234"
		stamp := strconv.FormatInt(time.Now().Unix()+age, 10)
		r.Header.Set("X-BulkBets-Client-IP", ip)
		r.Header.Set("X-BulkBets-Timestamp", stamp)
		m := hmac.New(sha256.New, []byte(secret))
		m.Write([]byte("POST\n/api/v1/auth/login\n" + ip + "\n" + stamp))
		r.Header.Set("X-BulkBets-Signature", hex.EncodeToString(m.Sum(nil)))
		return r
	}
	handler := app.browserSecurity(requestLimit(1, time.Hour)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })))
	for i, ip := range []string{"192.0.2.1", "192.0.2.2", "192.0.2.1"} {
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, signed(ip, 0))
		want := 204
		if i == 2 {
			want = 429
		}
		if w.Code != want {
			t.Fatalf("request %d: got %d want %d", i, w.Code, want)
		}
	}
	for _, change := range []func(*http.Request){func(r *http.Request) { r.Header.Set("X-BulkBets-Client-IP", "192.0.2.99") }, func(r *http.Request) { r.URL.Path = "/api/v1/auth/register" }, func(r *http.Request) { r.Method = "GET" }, func(r *http.Request) { r.Header.Set("X-BulkBets-Signature", "ff") }} {
		r := signed("192.0.2.1", 0)
		change(r)
		if app.clientAddress(r) != "" {
			t.Fatal("forged edge identity accepted")
		}
	}
	if app.clientAddress(signed("192.0.2.1", -120)) != "" {
		t.Fatal("expired signature accepted")
	}
	r := httptest.NewRequest("POST", "/", nil)
	r.RemoteAddr = "203.0.113.1:1234"
	r.Header.Set("X-Forwarded-For", "192.0.2.99")
	if app.clientAddress(r) != "" {
		t.Fatal("untrusted proxy accepted")
	}
	r.RemoteAddr = "10.42.10.3:1234"
	r.Header.Set("X-Forwarded-For", "192.0.2.99, 203.0.113.1")
	if app.clientAddress(r) != "203.0.113.1" {
		t.Fatal("wrong trusted proxy hop")
	}
}
