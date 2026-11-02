package main

import (
	"context"
	"errors"
	"log"
	"net/http"

	"github.com/PerrySmithMoss/BulkBets/server/internal/auth"
	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
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
					user, err := app.store.UserRepository.GetUserByID(r.Context(), userIdClaim)
					if err != nil || user.Status != "active" {
						next.ServeHTTP(w, r)
						return
					}
					ctx := context.WithValue(store.WithViewer(r.Context(), userIdClaim), userCtx, userIdClaim)
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

// RequirePermission middleware checks if the user has the required permission
func (app *application) RequirePermissionMiddleware(resource store.Resource, action store.Action) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := r.Context().Value(userCtx).(string)
			if !ok || userID == "" {
				writeJSONError(w, http.StatusUnauthorized, "Unauthorised")
				return
			}

			// Check permission
			hasPermission, err := app.store.UserRepository.HasPermission(userID, resource, action)
			if err != nil {
				log.Printf("Error while checking user permission %v", err)
				app.internalServerError(w, r, errors.New("internal server error"))
				return
			}

			if !hasPermission {
				writeJSONError(w, http.StatusForbidden, "Forbidden")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
