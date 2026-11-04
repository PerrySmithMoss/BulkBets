package config

import (
	"fmt"
	"net"
	"net/url"
	"strings"
	"sync"

	"github.com/PerrySmithMoss/BulkBets/server/internal/env"
)

const (
	DefaultAppEnv      = "development"
	DefaultAppHost     = "localhost"
	DefaultAppPort     = "8080"
	DefaultAppClient   = "http://localhost:3000"
	DefaultDBPort      = "5432"
	DefaultDBUser      = "admin"
	DefaultDBPassword  = "adminpassword"
	DefaultDBName      = "bulk_bets"
	DefaultTokenSecret = "example"
)

type AppConfig struct {
	AppEnv           string
	AppPort          string
	AppHost          string
	AppClientUrl     string
	EdgeProxySecret  string
	TrustedProxyCIDR string
}

type CorsConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	AllowCredentials bool
}

type DBConfig struct {
	DBHost               string
	DBPort               string
	DBUser               string
	DBPassword           string
	DBName               string
	DBMaxOpenConnections int
	DBMaxIdleConnections int
	DBMaxIdleTime        string
	DBSslMode            string
	DBSSLRootCert        string
}

type TokenClaimsConfig struct {
	Secret string
	Iss    string
	Exp    string
}

type TokenConfig struct {
	AccessToken  TokenClaimsConfig
	RefreshToken TokenClaimsConfig
}

type OAuthConfig struct {
	AuthStateToken     string
	GoogleClientID     string
	GoogleClientSecret string
	GithubClientID     string
	GithubClientSecret string
	XClientID          string
	XClientSecret      string
}

type Auth struct {
	Token TokenConfig
	OAuth OAuthConfig
}

type Config struct {
	App  AppConfig
	DB   DBConfig
	Auth Auth
	Cors CorsConfig
}

// configInstance holds the singleton instance of Config
var configInstance Config
var once sync.Once

// GetConfig returns the singleton instance of Config
func GetConfig() Config {
	once.Do(func() {
		configInstance = initConfig()
	})
	return configInstance
}

func initConfig() Config {
	appConfig := AppConfig{
		EdgeProxySecret:  env.GetEnv("EDGE_PROXY_SECRET", ""),
		TrustedProxyCIDR: env.GetEnv("TRUSTED_PROXY_CIDR", ""),
		AppEnv:           env.GetEnv("APP_ENV", DefaultAppEnv),
		AppHost:          env.GetEnv("APP_HOST", DefaultAppHost),
		AppPort:          env.GetEnv("APP_PORT", DefaultAppPort),
		AppClientUrl:     env.GetEnv("APP_CLIENT_URL", DefaultAppClient),
	}

	issuer := generateIssuer(appConfig)

	return Config{
		App: appConfig,
		DB: DBConfig{
			DBHost:               env.GetEnv("DB_HOST", DefaultAppHost),
			DBPort:               env.GetEnv("DB_PORT", DefaultDBPort),
			DBUser:               env.GetEnv("DB_USER", DefaultDBUser),
			DBPassword:           env.GetEnv("DB_PASSWORD", DefaultDBPassword),
			DBName:               env.GetEnv("DB_NAME", DefaultDBName),
			DBMaxOpenConnections: env.GetEnvAsInt("DB_MAX_OPEN_CONNS", 30),
			DBMaxIdleConnections: env.GetEnvAsInt("DB_MAX_IDLE_CONNS", 30),
			DBMaxIdleTime:        env.GetEnv("DB_MAX_IDLE_TIME", "15m"),
			DBSslMode:            env.GetEnv("DB_SSL_ENABLED", "disable"),
			DBSSLRootCert:        env.GetEnv("DB_SSL_ROOT_CERT", ""),
		},
		Cors: CorsConfig{
			AllowedOrigins:   env.GetEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8081", "http://127.0.0.1:8081"}),
			AllowedMethods:   env.GetEnvAsSlice("CORS_ALLOWED_METHODS", []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}),
			AllowedHeaders:   env.GetEnvAsSlice("CORS_ALLOWED_HEADERS", []string{"Accept", "Authorization", "Content-Type"}),
			AllowCredentials: env.GetEnvAsBool("CORS_ALLOW_CREDENTIALS", true),
		},
		Auth: Auth{
			Token: TokenConfig{
				AccessToken: TokenClaimsConfig{
					Secret: env.GetEnv("ACCESS_TOKEN_SECRET", DefaultTokenSecret),
					Iss:    issuer,
					Exp:    env.GetEnv("ACCESS_TOKEN_TTL", "15m"), // 15 mins
				},
				RefreshToken: TokenClaimsConfig{
					Secret: env.GetEnv("REFRESH_TOKEN_SECRET", DefaultTokenSecret),
					Iss:    issuer,
					Exp:    env.GetEnv("REFRESH_TOKEN_TTL", "168h"), // 7 days
				},
			},
			OAuth: OAuthConfig{
				AuthStateToken:     env.GetEnv("OAUTH_STATE_TOKEN", "random_state"),
				GoogleClientID:     env.GetEnv("GOOGLE_CLIENT_ID", ""),
				GoogleClientSecret: env.GetEnv("GOOGLE_CLIENT_SECRET", ""),
				GithubClientID:     env.GetEnv("GITHUB_CLIENT_ID", ""),
				GithubClientSecret: env.GetEnv("GITHUB_CLIENT_SECRET", ""),
				XClientID:          env.GetEnv("X_CLIENT_ID", ""),
				XClientSecret:      env.GetEnv("X_CLIENT_SECRET", ""),
			},
		},
	}
}

func generateIssuer(appConfig AppConfig) string {
	if appConfig.AppEnv == "production" {
		return "https://" + appConfig.AppHost
	}
	return "http://" + appConfig.AppHost + ":" + appConfig.AppPort
}

func (c Config) Validate() error {
	if c.App.AppEnv != "production" {
		return nil
	}
	for name, value := range map[string]string{"ACCESS_TOKEN_SECRET": c.Auth.Token.AccessToken.Secret, "REFRESH_TOKEN_SECRET": c.Auth.Token.RefreshToken.Secret} {
		if len(value) < 32 || strings.Contains(value, "change-for-production") || strings.Contains(value, "replace-with") || value == DefaultTokenSecret {
			return fmt.Errorf("%s must be a unique random secret of at least 32 characters", name)
		}
	}
	if c.Auth.Token.AccessToken.Secret == c.Auth.Token.RefreshToken.Secret {
		return fmt.Errorf("access and refresh secrets must differ")
	}
	if c.DB.DBPassword == DefaultDBPassword || strings.Contains(c.DB.DBPassword, "replace-with") || len(c.DB.DBPassword) < 16 {
		return fmt.Errorf("a production database password of at least 16 characters is required")
	}
	u, err := url.Parse(c.App.AppClientUrl)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.Path != "" || u.RawQuery != "" {
		return fmt.Errorf("APP_CLIENT_URL must be an HTTPS origin")
	}
	if c.App.AppHost == "localhost" || c.App.AppHost == "" {
		return fmt.Errorf("APP_HOST must be the public hostname")
	}
	return nil
}

// ConnectionString is shared by the API and one-off Swarm migration jobs.
func (c DBConfig) ConnectionString() string {
	u := url.URL{Scheme: "postgres", User: url.UserPassword(c.DBUser, c.DBPassword), Host: net.JoinHostPort(c.DBHost, c.DBPort), Path: c.DBName}
	query := u.Query()
	query.Set("sslmode", c.DBSslMode)
	if c.DBSSLRootCert != "" {
		query.Set("sslrootcert", c.DBSSLRootCert)
	}
	u.RawQuery = query.Encode()
	return u.String()
}
