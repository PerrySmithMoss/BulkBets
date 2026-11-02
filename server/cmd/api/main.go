package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/rs/cors"

	"github.com/PerrySmithMoss/BulkBets/server/config"
	"github.com/PerrySmithMoss/BulkBets/server/internal/auth"
	"github.com/PerrySmithMoss/BulkBets/server/internal/auth/oauth"
	"github.com/PerrySmithMoss/BulkBets/server/internal/db"
	"github.com/PerrySmithMoss/BulkBets/server/internal/env"
	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
)

func main() {
	err := godotenv.Load()
	if err != nil && !os.IsNotExist(err) {
		log.Fatalf("Error loading .env file: %v", err)
	}

	if err := env.LoadSecretFiles("DB_PASSWORD", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET", "SMTP_PASSWORD", "GOOGLE_CLIENT_SECRET"); err != nil {
		log.Fatal(err)
	}
	cfg := config.GetConfig()
	if err := cfg.Validate(); err != nil {
		log.Fatal(err)
	}

	postgresqlDbAddr := cfg.DB.ConnectionString()

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
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	app.ctx = ctx
	app.ping = db.PingContext
	go func() {
		ticker := time.NewTicker(time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				workCtx, stop := context.WithTimeout(ctx, 30*time.Second)
				if err := store.DemoRepository.Maintain(workCtx); err != nil && ctx.Err() == nil {
					log.Printf("portfolio maintenance failed: %v", err)
				}
				stop()
			}
		}
	}()
	hdl := app.mount()

	if err := app.run(hdl); err != nil {
		log.Print(err)
	}
}
