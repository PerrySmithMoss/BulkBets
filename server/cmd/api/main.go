package main

import (
	"fmt"
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	"github.com/rs/cors"

	"github.com/PerrySmithMoss/BulkBets/server/config"
	"github.com/PerrySmithMoss/BulkBets/server/internal/auth"
	"github.com/PerrySmithMoss/BulkBets/server/internal/auth/oauth"
	"github.com/PerrySmithMoss/BulkBets/server/internal/db"
	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
)

func main() {
	err := godotenv.Load()
	if err != nil && !os.IsNotExist(err) {
		log.Fatalf("Error loading .env file: %v", err)
	}

	cfg := config.GetConfig()

	postgresqlDbAddr := fmt.Sprintf("postgres://%s:%s@%s/%s?sslmode=%s",
		cfg.DB.DBUser, cfg.DB.DBPassword, net.JoinHostPort(cfg.DB.DBHost, cfg.DB.DBPort), cfg.DB.DBName, cfg.DB.DBSslMode)

	db, err := db.New(
		postgresqlDbAddr,
		cfg.DB.DBMaxOpenConnections,
		cfg.DB.DBMaxIdleConnections,
		cfg.DB.DBMaxIdleTime,
	)
	if err != nil {
		log.Panic(err)
	}

	defer db.Close()
	log.Printf("DB connection established 👍")

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   cfg.Cors.AllowedOrigins,
		AllowedMethods:   cfg.Cors.AllowedMethods,
		AllowedHeaders:   cfg.Cors.AllowedHeaders,
		AllowCredentials: cfg.Cors.AllowCredentials,
	})

	store := store.NewStorage(db)

	oauth := oauth.InitOAuthConfigs(cfg)

	accessTokenAuthenticator := auth.NewJWTAuthenticator(
		cfg.Auth.Token.AccessToken.Secret,
		cfg.Auth.Token.AccessToken.Iss,
		cfg.Auth.Token.AccessToken.Iss,
	)

	refreshTokenAuthenticator := auth.NewJWTAuthenticator(
		cfg.Auth.Token.RefreshToken.Secret,
		cfg.Auth.Token.RefreshToken.Iss,
		cfg.Auth.Token.RefreshToken.Iss,
	)

	authenticator := &auth.TokenAuthenticator{
		AccessTokenAuthenticator:  accessTokenAuthenticator,
		RefreshTokenAuthenticator: refreshTokenAuthenticator,
	}

	app := &application{
		cfg:           cfg,
		store:         store,
		authenticator: authenticator,
		oauth:         oauth,
		cors:          corsHandler,
	}
	hdl := app.mount()

	log.Fatal(app.run(hdl))
}
