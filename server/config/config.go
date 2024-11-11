package config

import (
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
	AppEnv       string
	AppPort      string
	AppHost      string
	AppClientUrl string
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
		AppEnv:       env.GetEnv("APP_ENV", DefaultAppEnv),
		AppHost:      env.GetEnv("APP_HOST", DefaultAppHost),
		AppPort:      env.GetEnv("APP_PORT", DefaultAppPort),
		AppClientUrl: env.GetEnv("APP_CLIENT_URL", DefaultAppClient),
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
		},
		Cors: CorsConfig{
			AllowedOrigins:   env.GetEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
			AllowedMethods:   env.GetEnvAsSlice("CORS_ALLOWED_METHODS", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
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
					Exp:    env.GetEnv("REFRESH_TOKEN_TTL", "7d"), // 7 days
				},
			},
			OAuth: OAuthConfig{
				AuthStateToken:     env.GetEnv("OAUTH_STATE_TOKEN", "random_state"),
				GoogleClientID:     env.GetEnvOrError("GOOGLE_CLIENT_ID"),
				GoogleClientSecret: env.GetEnvOrError("GOOGLE_CLIENT_SECRET"),
				GithubClientID:     env.GetEnvOrError("GITHUB_CLIENT_ID"),
				GithubClientSecret: env.GetEnvOrError("GITHUB_CLIENT_SECRET"),
				XClientID:          env.GetEnvOrError("X_CLIENT_ID"),
				XClientSecret:      env.GetEnvOrError("X_CLIENT_SECRET"),
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
