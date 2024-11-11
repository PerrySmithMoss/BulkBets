package oauth

import (
	"fmt"

	"github.com/PerrySmithMoss/BulkBets/server/internal/auth/oauth/types"
	"golang.org/x/oauth2"
)

type Provider interface {
	Name() string
	FetchUser(accessToken string) (types.OAuthUser, error)
	RefreshToken(refreshToken string) (*oauth2.Token, error)
	RefreshTokenAvailable() bool
}

type Providers map[string]Provider

type OAuthProvider struct {
	Name         string
	OAuth2Config *oauth2.Config
}

var providers = Providers{}

func RegisterProvider(name string, provider Provider) {
	providers[name] = provider
}

func UseProviders(viders ...Provider) {
	for _, provider := range viders {
		providers[provider.Name()] = provider
	}
}

func GetProvider(name string) (Provider, error) {
	provider := providers[name]
	if provider == nil {
		return nil, fmt.Errorf("no provider for %s exists", name)
	}
	return provider, nil
}
