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
	Results  []DivisionParticipantOutcomes `json:"results"`
	Comments *string                       `json:"comments"`
}

type DivisionParticipantOutcomes struct {
	DivisionResultId      int64               `json:"division_result_id"`
	DivisionParticipantId string              `json:"division_participant_id"`
	ResultStatus          *store.ResultStatus `json:"result_status"`
	Score                 *int8               `json:"score"`
	Position              *int8               `json:"position"`
	Comments              *string             `json:"comments"`
}

func (app *application) showDivisionResultHandler(w http.ResponseWriter, r *http.Request) {
	showId := chi.URLParam(r, "id")
	divisionId := chi.URLParam(r, "division_id")

	i, err := strconv.Atoi(showId)
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

	showDetails, err := app.store.ShowRepository.GetShowByID(ctx, i)
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

	divisionDetails, dErr := app.store.DivisionRepository.GetDivisionByID(ctx, i, parsedDivisionId)
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

	// Create division result
	divisionResultParams := store.DivisionResultParams{
		DivisionId: divisionDetails.ID,
		Comments:   showDivisionResults.Comments,
	}
	divisionResultID, err := app.store.DivisionRepository.CreateDivisionResult(ctx, divisionResultParams, user.Id)
	if err != nil {
		log.Printf("Error creating division result: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Could not create division result")
		return
	}

	// Map outcomes and insert into the database
	var outcomes []store.DivisionOutcome
	for _, o := range showDivisionResults.Results {
		outcomes = append(outcomes, store.DivisionOutcome{
			DivisionResultId:      divisionResultID,
			DivisionParticipantId: o.DivisionParticipantId,
			Position:              o.Position,
			Score:                 o.Score,
			ResultStatus:          o.ResultStatus,
			Comments:              o.Comments,
		})
	}

	// TODO: refactor so that if the method below fails it rolls back previous queries
	if err := app.store.DivisionRepository.CreateDivisionResultOutcomes(ctx, outcomes, user.Id); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Could not create division outcomes")
		return
	}

	// trigger bet settlement process (will likely have to implement Kafka/RabbitMQ
	// to asynchronously batch process all the bets tied to the division result)

	if err := app.jsonResponse(w, http.StatusCreated, divisionDetails); err != nil {
		log.Printf("showDetailsHandler err: %v", err)
		app.internalServerError(w, r, err)
	}
}
