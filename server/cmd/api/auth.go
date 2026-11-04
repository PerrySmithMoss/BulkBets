package main

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
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

	if err := app.store.UserRepository.Upsert(r.Context(), user); err != nil {
		if errors.Is(err, store.ErrIdentityLinkRequired) {
			http.Redirect(w, r, frontendRedirectURL+"?error="+url.QueryEscape("This email already has an account. Use its existing sign-in method or reset its password."), http.StatusSeeOther)
			return
		}
		writeJSONError(w, 500, "Unable to complete login.")
		return
	}
	if app.issueSession(w, r, user) {
		http.Redirect(w, r, frontendRedirectURL, http.StatusSeeOther)
	}
}

func (app *application) tokenRenewalHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(auth.RefreshTokenCookieName)
	if err != nil {
		writeJSONError(w, 401, "Please log in again.")
		return
	}
	token, err := app.authenticator.RefreshTokenAuthenticator.ValidateToken(cookie.Value)
	if err != nil || !token.Valid {
		writeJSONError(w, 401, "Please log in again.")
		return
	}
	id, err := token.Claims.GetSubject()
	if err != nil {
		writeJSONError(w, 401, "Please log in again.")
		return
	}
	refreshVersion, err := auth.GetTypedClaim[int64](app.authenticator.RefreshTokenAuthenticator, cookie.Value, "refreshTokenVersion")
	if err != nil {
		writeJSONError(w, 401, "Please log in again.")
		return
	}
	sessionVersion, err := auth.GetTypedClaim[int64](app.authenticator.RefreshTokenAuthenticator, cookie.Value, "sessionVersion")
	if err != nil {
		writeJSONError(w, 401, "Please log in again.")
		return
	}
	next, err := app.store.UserRepository.RotateRefreshToken(r.Context(), id, refreshVersion, sessionVersion)
	if err != nil {
		writeJSONError(w, 401, "Please log in again.")
		return
	}
	if app.writeSessionCookies(w, id, sessionVersion, next) {
		app.jsonResponse(w, 200, nil)
	}
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
		log.Print("Password login rejected")
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
	if err := app.store.UserRepository.BeginSession(r.Context(), user); err != nil {
		writeJSONError(w, 401, "Your session changed. Please log in again.")
		return false
	}
	return app.writeSessionCookies(w, user.Id.String(), user.SessionVersion, user.RefreshTokenVersion)
}

func (app *application) writeSessionCookies(w http.ResponseWriter, id string, sessionVersion, refreshVersion int64) bool {
	accessTTL, err := time.ParseDuration(app.cfg.Auth.Token.AccessToken.Exp)
	if err != nil {
		writeJSONError(w, 500, "Unable to create session.")
		return false
	}
	refreshTTL, err := time.ParseDuration(app.cfg.Auth.Token.RefreshToken.Exp)
	if err != nil {
		writeJSONError(w, 500, "Unable to create session.")
		return false
	}
	now := time.Now()
	claims := func(ttl time.Duration, issuer string) jwt.MapClaims {
		return jwt.MapClaims{"sub": id, "exp": now.Add(ttl).Unix(), "iat": now.Unix(), "iss": issuer, "aud": issuer, "sessionVersion": sessionVersion}
	}
	access, err := app.authenticator.AccessTokenAuthenticator.GenerateToken(claims(accessTTL, app.cfg.Auth.Token.AccessToken.Iss))
	if err != nil {
		writeJSONError(w, 500, "Unable to create session.")
		return false
	}
	refreshClaims := claims(refreshTTL, app.cfg.Auth.Token.RefreshToken.Iss)
	refreshClaims["refreshTokenVersion"] = refreshVersion
	refresh, err := app.authenticator.RefreshTokenAuthenticator.GenerateToken(refreshClaims)
	if err != nil {
		writeJSONError(w, 500, "Unable to create session.")
		return false
	}
	for _, c := range []struct {
		name, value string
		ttl         time.Duration
	}{{auth.AccessTokenCookieName, access, accessTTL}, {auth.RefreshTokenCookieName, refresh, refreshTTL}} {
		http.SetCookie(w, &http.Cookie{Name: c.name, Value: c.value, Path: "/", HttpOnly: true, Secure: app.cfg.App.AppEnv == "production", SameSite: http.SameSiteLaxMode, Expires: now.Add(c.ttl)})
	}
	return true
}

func (app *application) logoutUserHandler(w http.ResponseWriter, r *http.Request) {
	id, ok := r.Context().Value(userCtx).(string)
	if !ok || id == "" {
		writeJSONError(w, 401, "Unauthorised")
		return
	}
	if err := app.store.UserRepository.RevokeSessions(r.Context(), id); err != nil {
		writeJSONError(w, 500, "Unable to log out. Please retry.")
		return
	}
	for _, name := range []string{auth.AccessTokenCookieName, auth.RefreshTokenCookieName} {
		http.SetCookie(w, &http.Cookie{Name: name, Value: "", Path: "/", HttpOnly: true, Secure: app.cfg.App.AppEnv == "production", SameSite: http.SameSiteLaxMode, MaxAge: -1})
	}
	w.WriteHeader(http.StatusNoContent)
}
