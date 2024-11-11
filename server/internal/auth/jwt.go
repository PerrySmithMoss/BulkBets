package auth

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

type JWTAuthenticator struct {
	secret string
	aud    string
	iss    string
}

func NewJWTAuthenticator(secret string, aud string, iss string) *JWTAuthenticator {
	return &JWTAuthenticator{secret, aud, iss}
}

func (a *JWTAuthenticator) GenerateToken(claims jwt.Claims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	tokenString, err := token.SignedString([]byte(a.secret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (a *JWTAuthenticator) ValidateToken(token string) (*jwt.Token, error) {
	return jwt.Parse(token, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}

		return []byte(a.secret), nil
	},
		jwt.WithExpirationRequired(),
		jwt.WithAudience(a.aud),
		jwt.WithIssuer(a.aud),
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Name}),
	)
}

func GetTypedClaim[T any](auth Authenticator, tokenString string, claimKey string) (T, error) {
	var zero T

	token, err := auth.ValidateToken(tokenString)
	if err != nil || !token.Valid {
		return zero, fmt.Errorf("invalid token: %w", err)
	}

	mapClaims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return zero, fmt.Errorf("unexpected claims format")
	}

	value, exists := mapClaims[claimKey]
	if !exists {
		return zero, fmt.Errorf("claim %s not found", claimKey)
	}

	// ! TODO: is there anyway to avoid this type masturbation?
	// Special handling for "refreshTokenVersion" as value should be int
	if claimKey == "refreshTokenVersion" {
		if v, ok := value.(float64); ok {
			// Convert to int64 only if the target type is int64
			if _, ok := any(zero).(int64); ok {
				convertedValue := int64(v)
				return any(convertedValue).(T), nil
			}
		}
	}

	// Attempt to assert value to the requested type
	typedValue, ok := value.(T)
	if !ok {
		return zero, fmt.Errorf("claim %s is not of expected type %T", claimKey, zero)
	}

	return typedValue, nil
}
