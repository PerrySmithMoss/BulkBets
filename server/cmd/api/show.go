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
	DivisionParticipantResults []DivisionParticipantResult `json:"division_participant_results"`
}

type DivisionParticipantResult struct {
	DivisionParticipantId string `json:"division_participant_id"`
	PreJudgeScore         *int8  `json:"pre_judge_score"`
	PreJudgePosition      *int8  `json:"pre_judge_position"`
	FinalScore            *int8  `json:"final_score"`
	FinalPosition         int8   `json:"final_position"`
}

func (app *application) showResultHandler(w http.ResponseWriter, r *http.Request) {
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

	divisionDetails, dErr := app.store.DivisionRepository.GetDivisionByID(r.Context(), i, parsedDivisionId)
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

	var showDivisionResults ShowDivisionResult
	if err := json.NewDecoder(r.Body).Decode(&showDivisionResults); err != nil {
		log.Printf("Error %v: ", err)
		writeJSONError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if err := validate.Struct(showDivisionResults); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// TODO: figure out why the validator isn't working for this handler and createBetHandler

	// create division result record in db

	// trigger bet settlement process (will likely have to implement Kafka/RabbitMQ
	// to asynchronously batch process all the bets tied to the division result)

	if err := app.jsonResponse(w, http.StatusOK, divisionDetails); err != nil {
		log.Printf("showDetailsHandler err: %v", err)
		app.internalServerError(w, r, err)
	}
}
