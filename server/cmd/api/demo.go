package main

import (
	"errors"
	"net/http"

	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
)

func (app *application) startDemoHandler(w http.ResponseWriter, r *http.Request) {
	// Reuse an existing demo on repeated clicks without discarding its balance.
	if id, ok := r.Context().Value(userCtx).(string); ok {
		user, err := app.store.UserRepository.GetUserByID(r.Context(), id)
		if err == nil && user.IsDemo {
			app.jsonResponse(w, http.StatusOK, user)
			return
		}
	}
	user, err := app.store.DemoRepository.Create(r.Context())
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if app.issueSession(w, r, user) {
		app.jsonResponse(w, http.StatusCreated, user)
	}
}

func (app *application) resetDemoHandler(w http.ResponseWriter, r *http.Request) {
	id := r.Context().Value(userCtx).(string)
	if err := app.store.DemoRepository.Reset(r.Context(), id); err != nil {
		app.demoError(w, r, err)
		return
	}
	user, err := app.store.UserRepository.GetUserByID(r.Context(), id)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	app.jsonResponse(w, http.StatusOK, user)
}

func (app *application) settleDemoHandler(w http.ResponseWriter, r *http.Request) {
	result, err := app.store.DemoRepository.Settle(r.Context(), r.Context().Value(userCtx).(string))
	if err != nil {
		app.demoError(w, r, err)
		return
	}
	app.jsonResponse(w, http.StatusOK, result)
}

func (app *application) demoError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, store.ErrDemoOnly) {
		writeJSONError(w, http.StatusForbidden, err.Error())
		return
	}
	app.internalServerError(w, r, err)
}
