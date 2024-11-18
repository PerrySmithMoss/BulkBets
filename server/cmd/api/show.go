package main

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
)

func (app *application) showDetailsHandler(w http.ResponseWriter, r *http.Request) {
	showId := chi.URLParam(r, "id")

	i, err := strconv.Atoi(showId)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	showDetails, err := app.store.ShowRepository.GetShowByID(r.Context(), i)
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

	if showDetails == nil {
		app.internalServerError(w, r, errors.New("no show details could be found"))
		return
	}

	if err := app.jsonResponse(w, http.StatusOK, showDetails); err != nil {
		log.Printf("showDetailsHandler err: %v", err)
		app.internalServerError(w, r, err)
	}
}
