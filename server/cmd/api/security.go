package main

import (
	"context"
	"github.com/go-chi/chi/v5/middleware"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type clientAddressKey struct{}

type rateBucket struct {
	tokens  float64
	updated time.Time
}

// Bounded, per-address token buckets. Forwarded headers are deliberately ignored:
// accepting an untrusted X-Forwarded-For would let clients bypass the limiter.
func requestLimit(capacity int, period time.Duration) func(http.Handler) http.Handler {
	var mu sync.Mutex
	buckets := map[string]rateBucket{}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}
			if address, ok := r.Context().Value(clientAddressKey{}).(string); ok {
				ip = address
			}
			if id, ok := r.Context().Value(userCtx).(string); ok {
				ip += ":" + id
			}
			now := time.Now()
			mu.Lock()
			bucket, ok := buckets[ip]
			if !ok {
				bucket = rateBucket{float64(capacity), now}
			}
			bucket.tokens = min(float64(capacity), bucket.tokens+now.Sub(bucket.updated).Seconds()*float64(capacity)/period.Seconds())
			bucket.updated = now
			allowed := bucket.tokens >= 1
			if allowed {
				bucket.tokens--
			}
			if !ok && len(buckets) >= 10000 {
				for key, b := range buckets {
					if now.Sub(b.updated) > period {
						delete(buckets, key)
					}
				}
				if len(buckets) >= 10000 {
					allowed = false
				}
			}
			if ok || len(buckets) < 10000 {
				buckets[ip] = bucket
			}
			mu.Unlock()
			if !allowed {
				w.Header().Set("Retry-After", "60")
				writeJSONError(w, 429, "Too many requests. Please wait a minute and try again.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (app *application) browserSecurity(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.cfg.App.TrustEdge {
			if ip := net.ParseIP(r.Header.Get("X-BulkBets-Client-IP")); ip != nil {
				r = r.WithContext(context.WithValue(r.Context(), clientAddressKey{}, ip.String()))
			}
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Cache-Control", "no-store")
		if r.Method != "GET" && r.Method != "HEAD" && r.Method != "OPTIONS" {
			origin := strings.TrimRight(r.Header.Get("Origin"), "/")
			allowed := origin == ""
			for _, candidate := range app.cfg.Cors.AllowedOrigins {
				if origin == strings.TrimRight(candidate, "/") {
					allowed = true
				}
			}
			if !allowed {
				writeJSONError(w, 403, "This request did not originate from BulkBets.")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func safeRequestLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		wrapped := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		defer func() {
			log.Printf("http method=%s path=%s status=%d duration=%s request_id=%s", r.Method, r.URL.Path, wrapped.Status(), time.Since(started), middleware.GetReqID(r.Context()))
		}()
		next.ServeHTTP(wrapped, r)
	})
}
