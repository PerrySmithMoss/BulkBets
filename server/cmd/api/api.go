package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"

	"github.com/PerrySmithMoss/BulkBets/server/config"
	"github.com/PerrySmithMoss/BulkBets/server/internal/auth"
	"github.com/PerrySmithMoss/BulkBets/server/internal/auth/oauth"
	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
)

type application struct {
	cfg           config.Config
	store         store.Storage
	authenticator *auth.TokenAuthenticator
	oauth         oauth.OAuthConfigs
	cors          *cors.Cors
}

func (app *application) mount() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Set a timeout value on the request context (ctx), that will signal
	// through ctx.Done() that the request has timed out and further
	// processing should be stopped.
	r.Use(middleware.Timeout(60 * time.Second))

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", app.healthCheckHandler)

		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", app.loginUserHandler)
			r.With(middleware.Throttle(8)).Post("/register", app.registerUserHandler)
			r.With(middleware.Throttle(8)).Post("/forgot-password", app.forgotPasswordHandler)
			r.With(middleware.Throttle(8)).Post("/reset-password", app.resetPasswordHandler)

			r.Group(func(r chi.Router) {
				r.Use(app.DeserialiseUserMiddleware)
				r.Delete("/logout", app.logoutUserHandler)
				r.Get("/token/refresh", app.tokenRenewalHandler)
			})
		})

		r.Route("/oauth2", func(r chi.Router) {
			r.Get("/{provider}", app.oauth2Handler)
			r.Get("/{provider}/callback", app.oauth2CallbackHandler)
		})

		r.Route("/users", func(r chi.Router) {
			r.Use(app.DeserialiseUserMiddleware)
			r.Use(app.RequireUserMiddleware)
			r.Get("/me", app.currentUserHandler)
		})

		r.Route("/shows", func(r chi.Router) {
			// TODO: maybe add middleware so these routes require api key/token?
			// That we we could monetise the API as well as using it for the platform itself.

			r.Get("/{id}", app.showDetailsHandler)

			r.With(app.DeserialiseUserMiddleware, app.RequirePermissionMiddleware(store.ResourceBettingResults, store.ActionWrite)).
				Post("/{show_id}/divisions/{division_id}/result", app.showDivisionResultHandler)
		})

		r.Route("/bets", func(r chi.Router) {
			r.Use(app.DeserialiseUserMiddleware)
			r.Use(app.RequireUserMiddleware)
			r.Post("/", app.createBetHandler)
			r.Get("/", app.getBetsHandler)
		})
	})

	return app.cors.Handler(r)
}

func (app *application) run(hdl http.Handler) error {
	appAddr := fmt.Sprintf(":%s", app.cfg.App.AppPort)

	srv := &http.Server{
		Addr:         appAddr,
		Handler:      hdl,
		WriteTimeout: time.Second * 30,
		ReadTimeout:  time.Second * 15,
		IdleTimeout:  time.Minute,
	}

	log.Printf("Server listening on %s:%s\n", app.cfg.App.AppHost, app.cfg.App.AppPort)

	return srv.ListenAndServe()
}
