package main

import (
	"context"
	"log"
	"net/http"

	"github.com/PerrySmithMoss/BulkBets/server/internal/auth"
)

func (app *application) DeserialiseUserMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accessTokenCookie, err := r.Cookie(auth.AccessTokenCookieName)

		var accessTokenStr string
		if err == nil && accessTokenCookie != nil {
			accessTokenStr = accessTokenCookie.Value
		}

		accessToken, err := app.authenticator.AccessTokenAuthenticator.ValidateToken(accessTokenStr)
		if err == nil && accessToken.Valid {
			if accessToken.Claims != nil {
				userIdClaim, err := accessToken.Claims.GetSubject()
				if err != nil {
					log.Printf("Error reading accessToken subject claim: %v", err)
				} else {
					ctx := context.WithValue(r.Context(), userCtx, userIdClaim)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}
		}

		next.ServeHTTP(w, r)
	})
}

func (app *application) RequireUserMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value(userCtx).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "Unauthorised")
			return
		}

		next.ServeHTTP(w, r)
	})
}
