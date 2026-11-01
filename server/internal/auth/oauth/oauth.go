package oauth

import (
	"golang.org/x/oauth2"
	// "golang.org/x/oauth2/github"
	"golang.org/x/oauth2/google"

	"github.com/PerrySmithMoss/BulkBets/server/config"
	googleProvider "github.com/PerrySmithMoss/BulkBets/server/internal/auth/oauth/providers/google"
)

type OAuthConfigs struct {
	OAuth2 map[string]*oauth2.Config
}

// var twitterEndpoint = oauth2.Endpoint{
// 	AuthURL:  "https://twitter.com/i/oauth2/authorize",
// 	TokenURL: "https://api.twitter.com/oauth2/token",
// }

func InitOAuthConfigs(cfg config.Config) OAuthConfigs {
	if cfg.Auth.OAuth.GoogleClientID == "" || cfg.Auth.OAuth.GoogleClientSecret == "" {
		return OAuthConfigs{OAuth2: map[string]*oauth2.Config{}}
	}
	oauth2Configs := map[string]*oauth2.Config{
		"google": {
			ClientID:     cfg.Auth.OAuth.GoogleClientID,
			ClientSecret: cfg.Auth.OAuth.GoogleClientSecret,
			RedirectURL:  "http://localhost:8080/api/v1/oauth2/google/callback",
			Endpoint:     google.Endpoint,
			Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		},
		// "github": {
		// 	ClientID:     cfg.Auth.OAuth.GithubClientID,
		// 	ClientSecret: cfg.Auth.OAuth.GithubClientSecret,
		// 	RedirectURL:  "http://localhost:8080/v1/oauth2/github/callback",
		// 	Endpoint:     github.Endpoint,
		// 	Scopes:       []string{"user:email"},
		// },
		// "twitter": {
		// 	ClientID:     cfg.Auth.OAuth.TwitterClientID,
		// 	ClientSecret: cfg.Auth.OAuth.TwitterClientSecret,
		// 	RedirectURL:  "http://localhost:8080/v1/oauth2/twitter/callback",
		// 	Scopes:       []string{"tweet.read", "users.read", "offline.access"}, // Define necessary scopes
		// 	Endpoint:     twitterEndpoint,
		// },
	}

	// TODO: add github and twitter provides ones we have the configs for both
	UseProviders(googleProvider.New(oauth2Configs["google"].ClientID, oauth2Configs["google"].ClientSecret, oauth2Configs["google"].RedirectURL))

	return OAuthConfigs{
		OAuth2: oauth2Configs,
	}
}
