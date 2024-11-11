package main

import (
	"log"
	"net/http"

	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
)

type userKey string

const userCtx userKey = "user"

func (app *application) currentUserHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userCtx).(string)
	if !ok {
		http.Error(w, "Unauthorised", http.StatusUnauthorized)
		return
	}

	user, err := app.store.UserRepository.GetByID(r.Context(), userID)

	if err != nil {
		switch err {
		case store.ErrNotFound:
			app.notFoundResponse(w, r, err)
			return
		default:
			app.internalServerError(w, r, err)
			return
		}
	}

	if err := app.jsonResponse(w, http.StatusOK, user); err != nil {
		log.Printf("currentUserHandler err: %v", err)
		app.internalServerError(w, r, err)
	}
}
