package auth

import "github.com/golang-jwt/jwt/v5"

const (
	AccessTokenCookieName  = "access_token"
	RefreshTokenCookieName = "refresh_token"
)

type TokenAuthenticator struct {
	AccessTokenAuthenticator  *JWTAuthenticator
	RefreshTokenAuthenticator *JWTAuthenticator
}

type Authenticator interface {
	GenerateToken(claims jwt.Claims) (string, error)
	ValidateToken(token string) (*jwt.Token, error)
}
