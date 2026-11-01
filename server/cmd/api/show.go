package main

import (
	"encoding/json"
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

type ShowDivisionResult struct {
	Results  []store.DivisionOutcomeParams `json:"results"`
	Comments *string                       `json:"comments"`
}

func (app *application) showDivisionResultHandler(w http.ResponseWriter, r *http.Request) {
	showId := chi.URLParam(r, "show_id")
	divisionId := chi.URLParam(r, "division_id")

	parsedShowId, err := strconv.Atoi(showId)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	parsedDivisionId, dErr := strconv.Atoi(divisionId)
	if dErr != nil {
		app.internalServerError(w, r, dErr)
		return
	}

	ctx := r.Context()

	showDetails, err := app.store.ShowRepository.GetShowByID(ctx, parsedShowId)
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

	divisionDetails, dErr := app.store.DivisionRepository.GetDivisionByID(ctx, parsedDivisionId, parsedShowId)
	if dErr != nil {
		switch dErr {
		case store.ErrNotFound:
			app.notFoundResponse(w, r, dErr)
			return
		default:
			app.internalServerError(w, r, dErr)
			return
		}
	}
	if divisionDetails == nil {
		app.internalServerError(w, r, errors.New("no show details could be found"))
		return
	}

	userID, ok := r.Context().Value(userCtx).(string)
	if !ok || userID == "" {
		writeJSONError(w, http.StatusUnauthorized, "Unauthorised")
		return
	}

	user, err := app.store.UserRepository.GetUserByID(ctx, userID)
	if err != nil {
		log.Printf("No user with ID %s found", userID)
		writeJSONError(w, http.StatusUnauthorized, "Unauthorised")
		return
	}

	var showDivisionResults ShowDivisionResult
	if err := json.NewDecoder(r.Body).Decode(&showDivisionResults); err != nil {
		log.Printf("Error %v: ", err)
		writeJSONError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// TODO: figure out why the validator isn't working for this handler and createBetHandler
	if err := validate.Struct(showDivisionResults); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	divisionResultParams := store.DivisionResultParams{
		DivisionId: divisionDetails.ID,
		Comments:   showDivisionResults.Comments,
		Results:    showDivisionResults.Results,
	}
	divisionResultID, err := app.store.DivisionRepository.CreateDivisionResult(ctx, divisionResultParams, user.Id)
	if err != nil {
		log.Printf("Error creating division result: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Could not create division result")
		return
	}

	settlement := store.BetSettlement{
		DivisionID:       divisionDetails.ID,
		DivisionResultID: divisionResultID,
		Outcomes:         divisionResultParams.Results,
	}
	err = app.store.BetsRepository.SettleDivisionBets(ctx, settlement)
	if err != nil {
		log.Printf("Error settling division bets: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Could not settle bets")
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, divisionDetails); err != nil {
		log.Printf("showDetailsHandler err: %v", err)
		app.internalServerError(w, r, err)
	}
}

func (app *application) showsHandler(w http.ResponseWriter, r *http.Request) {
	shows, err := app.store.ShowRepository.ListShows(r.Context())
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, shows); err != nil {
		app.internalServerError(w, r, err)
	}
}
