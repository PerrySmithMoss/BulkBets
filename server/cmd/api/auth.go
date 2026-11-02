package main

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"

	"github.com/PerrySmithMoss/BulkBets/server/internal/auth"
	"github.com/PerrySmithMoss/BulkBets/server/internal/auth/oauth"
	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
)

// OAuth handler creates an unique OAuth URL using the client ID and client secret.
// It then redirects the user to the OAuth provider website to complete the login.
func (app *application) oauth2Handler(w http.ResponseWriter, r *http.Request) {
	providerName := chi.URLParam(r, "provider")
	oauthConfig, isValid := app.oauth.OAuth2[providerName]
	if !isValid {
		http.Error(w, "Invalid OAuth provider", http.StatusBadRequest)
		return
	}

	stateBytes := make([]byte, 32)
	if _, err := rand.Read(stateBytes); err != nil {
		writeJSONError(w, 500, "Unable to start login.")
		return
	}
	state := base64.RawURLEncoding.EncodeToString(stateBytes)
	http.SetCookie(w, &http.Cookie{Name: "oauth_state_" + providerName, Value: state, Path: "/", HttpOnly: true, Secure: app.cfg.App.AppEnv == "production", SameSite: http.SameSiteLaxMode, MaxAge: 600})
	url := oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline) + "&prompt=select_account"

	w.Header().Set("Content-Type", "application/json")
	response := map[string]string{"oauthUrl": url}

	// create json package for this?
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Error encoding JSON response", http.StatusInternalServerError)
	}
}

// Handles the redirect request from the OAuth provider.
func (app *application) oauth2CallbackHandler(w http.ResponseWriter, r *http.Request) {
	providerName := chi.URLParam(r, "provider")
	oauthConfig, isValid := app.oauth.OAuth2[providerName]

	if !isValid {
		http.Error(w, "Invalid OAuth provider", http.StatusBadRequest)
		return
	}

	cookie, err := r.Cookie("oauth_state_" + providerName)
	http.SetCookie(w, &http.Cookie{Name: "oauth_state_" + providerName, Value: "", Path: "/", HttpOnly: true, Secure: app.cfg.App.AppEnv == "production", SameSite: http.SameSiteLaxMode, MaxAge: -1})
	state := r.URL.Query().Get("state")
	if err != nil || len(state) != 43 || subtle.ConstantTimeCompare([]byte(state), []byte(cookie.Value)) != 1 {
		writeJSONError(w, 400, "Login expired or could not be verified. Start again.")
		return
	}
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Code query parameter missing", http.StatusBadRequest)
		return
	}

	token, err := oauthConfig.Exchange(r.Context(), code)
	if err != nil {
		log.Printf("Error exchanging code: %s", err)
		http.Error(w, "Error exchanging code", http.StatusBadRequest)
		return
	}

	if !token.Valid() {
		http.Error(w, "Invalid token received from provider", http.StatusInternalServerError)
		return
	}

	provider, err := oauth.GetProvider(providerName)

	if err != nil {
		http.Error(w, "Error fetching internal provider", http.StatusBadRequest)
		return
	}

	userInfo, err := provider.FetchUser(token.AccessToken)
	if err != nil {
		log.Println("Error getting user info: " + err.Error())
		http.Error(w, "Error fetching user info", http.StatusBadRequest)
		return
	}

	frontendRedirectURL := app.cfg.App.AppClientUrl

	// we don't want to grant none verified google users access - security brah
	if !userInfo.IsEmailVerified {
		redirectURL := fmt.Sprintf("%s?error=%s",
			frontendRedirectURL,
			url.QueryEscape("Please verify your email address to continue"))
		http.Redirect(w, r, redirectURL, http.StatusSeeOther)
		return
	}

	// TODO: set user's default currency based on oauth userInfo or pass from client?
	user := app.store.UserRepository.Builder().
		SetFirstName(userInfo.FirstName).
		SetLastName(userInfo.LastName).
		SetEmail(userInfo.Email).
		SetIsEmailVerified(userInfo.IsEmailVerified).
		SetEmailVerifiedAt(time.Now()).
		SetProfileImage(userInfo.AvatarURL).
		SetGoogleId(userInfo.UserID).
		Build()

	// TODO: add this to register auth (email/pass) handler when implemented
	// hash the user password
	// if err := user.Password.Set(payload.Password); err != nil {
	// 	app.internalServerError(w, r, err)
	// 	return
	// }

	ctx := r.Context()
	if err := app.store.UserRepository.Upsert(ctx, user); err != nil {
		log.Printf("Error upserting user: %v", err)
		// TODO: Does this need switching to a redirect with a error query param
		// containing the error. What if the user tries signing up but the email
		// they provided is taken, should we send an email to that email asking if
		// it was them that just tried to sign up but from different oauth provider?
		http.Error(w, "Error processing user data", http.StatusInternalServerError)
		return
	}

	accessTokenDurationExp, err := time.ParseDuration(app.cfg.Auth.Token.AccessToken.Exp)
	if err != nil {
		log.Printf("Error parsing access token duration: %v", err)
		http.Error(w, "Error parsing access token duration", http.StatusInternalServerError)
		return
	}
	refreshTokenDurationExp, err := time.ParseDuration(app.cfg.Auth.Token.RefreshToken.Exp)
	if err != nil {
		log.Printf("Error parsing refresh token duration: %v", err)
		http.Error(w, "Error parsing refresh token duration", http.StatusInternalServerError)
		return
	}

	accessTokenClaims := jwt.MapClaims{
		"sub": user.Id,
		"exp": time.Now().Add(accessTokenDurationExp).Unix(),
		"iat": time.Now().Unix(),
		"iss": app.cfg.Auth.Token.AccessToken.Iss,
		"aud": app.cfg.Auth.Token.AccessToken.Iss,
	}
	accessToken, err := app.authenticator.AccessTokenAuthenticator.GenerateToken(accessTokenClaims)
	if err != nil {
		log.Printf("Error signing access token: %v", err)
		http.Error(w, "Error signing access token", http.StatusInternalServerError)
		return
	}

	refreshTokenClaims := jwt.MapClaims{
		"sub":                 user.Id,
		"refreshTokenVersion": user.RefreshTokenVersion,
		"exp":                 time.Now().Add(refreshTokenDurationExp).Unix(),
		"iat":                 time.Now().Unix(),
		"iss":                 app.cfg.Auth.Token.RefreshToken.Iss,
		"aud":                 app.cfg.Auth.Token.AccessToken.Iss,
	}
	refreshToken, err := app.authenticator.RefreshTokenAuthenticator.GenerateToken(refreshTokenClaims)
	if err != nil {
		log.Printf("Error signing refresh token: %v", err)
		http.Error(w, "Error signing refresh token", http.StatusInternalServerError)
		return
	}

	// Set cookies
	// TODO extract this into util func?
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		HttpOnly: true,
		Secure:   app.cfg.App.AppEnv == "production",
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		Expires:  time.Now().Add(accessTokenDurationExp),
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   app.cfg.App.AppEnv == "production",
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		Expires:  time.Now().Add(refreshTokenDurationExp),
	})

	redirectURL := frontendRedirectURL
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

// Handles access/refresh token renewal
func (app *application) tokenRenewalHandler(w http.ResponseWriter, r *http.Request) {
	// Check for refresh token if access token is expired or invalid
	refreshTokenCookie, err := r.Cookie(auth.RefreshTokenCookieName)
	if err != nil {
		http.Error(w, "Unable to read refresh token.", http.StatusUnauthorized)
		return
	}

	// Attempt to validate the refresh token
	refreshToken, err := app.authenticator.RefreshTokenAuthenticator.ValidateToken(refreshTokenCookie.Value)
	if err != nil || !refreshToken.Valid {
		log.Printf("Invalid or expired refresh token: %v", err)
		http.Error(w, "Invalid or expired refresh token.", http.StatusInternalServerError)
		return
	}

	if refreshToken.Valid {
		userIdClaim, err := refreshToken.Claims.GetSubject()
		if err != nil {
			log.Printf("Error reading refreshToken subject claim: %v", err)
			http.Error(w, "Invalid or expired refresh token.", http.StatusInternalServerError)
			return
		}

		newAccessTokenDurationExp, err := time.ParseDuration(app.cfg.Auth.Token.AccessToken.Exp)
		if err != nil {
			log.Printf("Error parsing accessToken exp of: %s\n%v", app.cfg.Auth.Token.AccessToken.Exp, err)
			http.Error(w, "Invalid or expired refresh token.", http.StatusInternalServerError)
			return
		}

		accessTokenClaims := jwt.MapClaims{
			"sub": userIdClaim,
			"exp": time.Now().Add(newAccessTokenDurationExp).Unix(),
			"iat": time.Now().Unix(),
			"iss": app.cfg.Auth.Token.AccessToken.Iss,
			"aud": app.cfg.Auth.Token.AccessToken.Iss,
		}
		newAccessToken, err := app.authenticator.AccessTokenAuthenticator.GenerateToken(accessTokenClaims)
		if err != nil {
			log.Printf("Error generating new access token: %v", err)
			http.Error(w, "Invalid or expired refresh token.", http.StatusInternalServerError)
			return
		}

		refreshTokenVersion, err := auth.GetTypedClaim[int64](app.authenticator.RefreshTokenAuthenticator, refreshToken.Raw, "refreshTokenVersion")
		if err != nil {
			log.Printf("Error retrieving refresh token version: %v", err)
			http.Error(w, "Invalid or expired refresh token.", http.StatusInternalServerError)
			return
		}

		ctx := r.Context()
		user, err := app.store.UserRepository.GetUserByID(ctx, userIdClaim)
		if err != nil {
			log.Printf("No user with ID %s found", userIdClaim)
			http.Error(w, "User unauthorised.", http.StatusUnauthorized)
			return
		}

		// if refreshTokenVersion inside cookie doesn't match the user's refreshTokenVersion inside
		// db it could potentially be bad actor, and thus we shouldn't proceed
		if user.Status != "active" || user.RefreshTokenVersion != refreshTokenVersion {
			log.Printf("refreshTokenVersion mismatch - possible bad actor?")
			http.Error(w, "Unauthorised.", http.StatusUnauthorized)
			return
		}

		// if tokenVersion match we can safely generate new refresh token and increment
		// the user's refresh token version
		newRefreshTokenDurationExp, err := time.ParseDuration(app.cfg.Auth.Token.RefreshToken.Exp)
		if err != nil {
			log.Printf("Error parsing refreshToken exp: %s.\n%v", app.cfg.Auth.Token.RefreshToken.Exp, err)
			http.Error(w, "Unauthorised.", http.StatusUnauthorized)
			return
		}

		updatedRefreshTokenVersion, err := app.store.UserRepository.SetRefreshTokenVersion(r.Context(), user.RefreshTokenVersion+1, userIdClaim)
		if err != nil {
			http.Error(w, "Failed to increment refresh token version", http.StatusInternalServerError)
			return
		}

		refreshTokenClaims := jwt.MapClaims{
			"sub":                 userIdClaim,
			"refreshTokenVersion": updatedRefreshTokenVersion,
			"exp":                 time.Now().Add(newRefreshTokenDurationExp).Unix(),
			"iat":                 time.Now().Unix(),
			"iss":                 app.cfg.Auth.Token.RefreshToken.Iss,
			"aud":                 app.cfg.Auth.Token.AccessToken.Iss,
		}
		newRefreshToken, err := app.authenticator.RefreshTokenAuthenticator.GenerateToken(refreshTokenClaims)
		if err != nil {
			log.Printf("Error generating new access token: %v", err)
			http.Error(w, "Unauthorised.", http.StatusUnauthorized)
			return
		}

		// Validate new access/refresh tokens
		newAccessTokenClaims, err := app.authenticator.AccessTokenAuthenticator.ValidateToken(newAccessToken)
		if err != nil {
			log.Printf("newAccessToken invalid: %v", newAccessTokenClaims)
			http.Error(w, "Unauthorised.", http.StatusUnauthorized)
			return
		}
		newRefreshTokenClaims, err := app.authenticator.RefreshTokenAuthenticator.ValidateToken(newRefreshToken)
		if err != nil {
			log.Printf("newRefreshToken invalid: %v", newRefreshTokenClaims)
			http.Error(w, "Unauthorised.", http.StatusUnauthorized)
			return
		}

		if newAccessTokenClaims.Valid && newRefreshTokenClaims.Valid {
			// TODO extract this into util func?
			http.SetCookie(w, &http.Cookie{
				Name:     "access_token",
				Value:    newAccessToken,
				HttpOnly: true,
				Secure:   app.cfg.App.AppEnv == "production",
				SameSite: http.SameSiteLaxMode,
				Path:     "/",
				Expires:  time.Now().Add(newAccessTokenDurationExp),
			})
			http.SetCookie(w, &http.Cookie{
				Name:     "refresh_token",
				Value:    newRefreshToken,
				HttpOnly: true,
				Secure:   app.cfg.App.AppEnv == "production",
				SameSite: http.SameSiteLaxMode,
				Path:     "/",
				Expires:  time.Now().Add(newRefreshTokenDurationExp),
			})
		}

		app.jsonResponse(w, http.StatusOK, nil)
		return
	}

	app.jsonResponse(w, http.StatusUnauthorized, nil)
}

type LoginRequestBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (app *application) loginUserHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 8192)
	var reqBody LoginRequestBody
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		log.Printf("Error %v: ", err)
		writeJSONError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	ctx := r.Context()

	// Query the database for the user by email
	user, err := app.store.UserRepository.GetUserByEmail(ctx, strings.ToLower(strings.TrimSpace(reqBody.Email)))
	if err != nil {
		log.Printf("Could not get user with email %v. Err: %v", reqBody.Email, err)
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	if user.Status != "active" {
		writeJSONError(w, 401, "Invalid email or password")
		return
	}

	// Verify the password
	match, err := user.CheckPassword(reqBody.Password)
	if err != nil || !match {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	if app.issueSession(w, r, user) {
		writeJSON(w, http.StatusOK, nil)
	}
}

func (app *application) issueSession(w http.ResponseWriter, r *http.Request, user *store.User) bool {
	// Create access and refresh tokens
	accessTokenDurationExp, err := time.ParseDuration(app.cfg.Auth.Token.AccessToken.Exp)
	if err != nil {
		log.Printf("Error parsing accessToken exp of: %s\n%v", app.cfg.Auth.Token.AccessToken.Exp, err)
		http.Error(w, "Invalid or expired refresh token.", http.StatusInternalServerError)
		return false
	}

	accessTokenClaims := jwt.MapClaims{
		"sub": user.Id,
		"exp": time.Now().Add(accessTokenDurationExp).Unix(),
		"iat": time.Now().Unix(),
		"iss": app.cfg.Auth.Token.AccessToken.Iss,
		"aud": app.cfg.Auth.Token.AccessToken.Iss,
	}
	accessToken, err := app.authenticator.AccessTokenAuthenticator.GenerateToken(accessTokenClaims)
	if err != nil {
		log.Printf("Error signing access token: %v", err)
		http.Error(w, "Error signing access token", http.StatusInternalServerError)
		return false
	}

	refreshTokenDurationExp, err := time.ParseDuration(app.cfg.Auth.Token.RefreshToken.Exp)
	if err != nil {
		log.Printf("Error parsing refreshToken exp: %s.\n%v", app.cfg.Auth.Token.RefreshToken.Exp, err)
		http.Error(w, "Unauthorised.", http.StatusUnauthorized)
		return false
	}

	updatedRefreshTokenVersion, err := app.store.UserRepository.SetRefreshTokenVersion(r.Context(), user.RefreshTokenVersion+1, user.Id.String())
	if err != nil {
		http.Error(w, "Failed to increment refresh token version", http.StatusInternalServerError)
		return false
	}

	refreshTokenClaims := jwt.MapClaims{
		"sub":                 user.Id,
		"refreshTokenVersion": updatedRefreshTokenVersion,
		"exp":                 time.Now().Add(refreshTokenDurationExp).Unix(),
		"iat":                 time.Now().Unix(),
		"iss":                 app.cfg.Auth.Token.RefreshToken.Iss,
		"aud":                 app.cfg.Auth.Token.AccessToken.Iss,
	}
	refreshToken, err := app.authenticator.RefreshTokenAuthenticator.GenerateToken(refreshTokenClaims)
	if err != nil {
		log.Printf("Error signing refresh token: %v", err)
		http.Error(w, "Error signing refresh token", http.StatusInternalServerError)
		return false
	}

	// Set cookies
	// TODO extract this into util func?
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		HttpOnly: true,
		Secure:   app.cfg.App.AppEnv == "production",
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		Expires:  time.Now().Add(accessTokenDurationExp),
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   app.cfg.App.AppEnv == "production",
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		Expires:  time.Now().Add(refreshTokenDurationExp),
	})

	return true
}

func (app *application) logoutUserHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID, ok := r.Context().Value(userCtx).(string)
	if !ok || userID == "" {
		writeJSONError(w, http.StatusUnauthorized, "Unauthorised")
		return
	}

	// TODO extract this into util func?
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		HttpOnly: true,
		Secure:   app.cfg.App.AppEnv == "production",
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		Expires:  time.Unix(0, 0),
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		HttpOnly: true,
		Secure:   app.cfg.App.AppEnv == "production",
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		Expires:  time.Unix(0, 0),
	})

	user, err := app.store.UserRepository.GetUserByID(ctx, userID)
	if err != nil {
		log.Printf("No user with ID %s found", userID)
		writeJSONError(w, http.StatusUnauthorized, "Unauthorised")
		return
	}

	_, err = app.store.UserRepository.SetRefreshTokenVersion(r.Context(), user.RefreshTokenVersion+1, userID)
	if err != nil {
		log.Printf("Failed to update refresh token version for user ID %s: %v", userID, err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to log out")
		return
	}

	app.jsonResponse(w, http.StatusNoContent, nil)
}
