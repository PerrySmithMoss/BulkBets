package main

import (
	"context"
	"net/http"
	"time"
)

func (app *application) healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if app.ping != nil {
		if err := app.ping(ctx); err != nil {
			writeJSONError(w, 503, "Database unavailable")
			return
		}
	}
	w.Write([]byte("A-OK!"))
}
