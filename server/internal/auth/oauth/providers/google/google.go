package google

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/PerrySmithMoss/BulkBets/server/internal/auth/oauth/types"
)

var Endpoint = google.Endpoint

const userInfoEndpoint string = "https://www.googleapis.com/oauth2/v2/userinfo"

type GoogleProvider struct {
	Name         string
	OAuth2Config *oauth2.Config
}

type Provider struct {
	ClientKey       string
	Secret          string
	CallbackURL     string
	config          *oauth2.Config
	authCodeOptions []oauth2.AuthCodeOption
	providerName    string
}

type googleUser struct {
	ID              string `json:"id"`
	Email           string `json:"email"`
	IsEmailVerified bool   `json:"verified_email"`
	Name            string `json:"name"`
	FirstName       string `json:"given_name"`
	LastName        string `json:"family_name"`
	Picture         string `json:"picture"`
}

func New(clientKey, secret, callbackURL string, scopes ...string) *Provider {
	p := &Provider{
		ClientKey:    clientKey,
		Secret:       secret,
		CallbackURL:  callbackURL,
		providerName: "google",

		// We can get a refresh token from Google by this option.
		// See https://developers.google.com/identity/protocols/oauth2/openid-connect#access-type-param
		authCodeOptions: []oauth2.AuthCodeOption{
			oauth2.AccessTypeOffline,
		},
	}
	p.config = newConfig(p, scopes)
	return p
}

func (p *Provider) Name() string {
	return p.providerName
}

func (p *Provider) FetchUser(accessToken string) (types.OAuthUser, error) {
	user := types.OAuthUser{
		AccessToken: accessToken,
		Provider:    p.Name(),
	}

	if user.AccessToken == "" {
		return user, fmt.Errorf("%s cannot get user information without accessToken", p.providerName)
	}

	response, err := http.Get(userInfoEndpoint + "?access_token=" + accessToken)
	if err != nil {
		return user, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return user, fmt.Errorf("%s responded with a %d trying to fetch user information", p.providerName, response.StatusCode)
	}

	responseBytes, err := io.ReadAll(response.Body)
	if err != nil {
		return user, err
	}

	var u googleUser
	if err := json.Unmarshal(responseBytes, &u); err != nil {
		return user, err
	}

	// Extract the user data we got from Google into our OAuthUser
	user.Name = u.Name
	user.FirstName = u.FirstName
	user.LastName = u.LastName
	user.NickName = u.Name
	user.Email = u.Email
	user.IsEmailVerified = u.IsEmailVerified
	user.Provider = "google"
	user.AvatarURL = u.Picture
	user.UserID = u.ID

	return user, nil
}

func (p *Provider) RefreshTokenAvailable() bool {
	return true
}

func (p *Provider) RefreshToken(refreshToken string) (*oauth2.Token, error) {
	token := &oauth2.Token{RefreshToken: refreshToken}
	// ts := p.config.TokenSource(oauth.ContextForClient(p.Client()), token)
	ts := p.config.TokenSource(context.Background(), token)
	newToken, err := ts.Token()
	if err != nil {
		return nil, err
	}
	return newToken, err
}

func newConfig(provider *Provider, scopes []string) *oauth2.Config {
	c := &oauth2.Config{
		ClientID:     provider.ClientKey,
		ClientSecret: provider.Secret,
		RedirectURL:  provider.CallbackURL,
		Endpoint:     Endpoint,
		Scopes:       []string{},
	}

	if len(scopes) > 0 {
		c.Scopes = append(c.Scopes, scopes...)
	} else {
		c.Scopes = []string{"email"}
	}
	return c
}
