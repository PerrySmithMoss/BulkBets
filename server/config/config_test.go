package config

import (
	"strings"
	"testing"
)

func TestProductionRejectsDevelopmentAndPlaceholderConfiguration(t *testing.T) {
	valid := Config{App: AppConfig{AppEnv: "production", AppHost: "demo.example.invalid", AppClientUrl: "https://demo.example.invalid"}, DB: DBConfig{DBPassword: strings.Repeat("d", 64)}, Auth: Auth{Token: TokenConfig{AccessToken: TokenClaimsConfig{Secret: strings.Repeat("a", 64)}, RefreshToken: TokenClaimsConfig{Secret: strings.Repeat("b", 64)}}}}
	if err := valid.Validate(); err != nil {
		t.Fatal(err)
	}
	cases := []func(*Config){
		func(c *Config) { c.Auth.Token.AccessToken.Secret = DefaultTokenSecret },
		func(c *Config) { c.Auth.Token.AccessToken.Secret = "replace-with-a-different-random-secret" },
		func(c *Config) { c.Auth.Token.RefreshToken.Secret = c.Auth.Token.AccessToken.Secret },
		func(c *Config) { c.DB.DBPassword = DefaultDBPassword },
		func(c *Config) { c.App.AppClientUrl = "http://demo.example.invalid" },
		func(c *Config) { c.App.AppHost = "localhost" },
	}
	for _, change := range cases {
		c := valid
		change(&c)
		if err := c.Validate(); err == nil {
			t.Error("unsafe production configuration accepted")
		}
	}
}
