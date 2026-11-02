package main

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
	"github.com/go-chi/chi/v5"
)

func decodePortfolio(w http.ResponseWriter, r *http.Request, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 16384)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeJSONError(w, 400, "Check the request details.")
		return false
	}
	return true
}

func (app *application) walletHandler(w http.ResponseWriter, r *http.Request) {
	result, err := app.store.DemoRepository.Wallet(r.Context(), r.Context().Value(userCtx).(string))
	if err != nil {
		app.demoError(w, r, err)
		return
	}
	app.jsonResponse(w, 200, result)
}

func (app *application) transferHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Amount float64 `json:"amount"`
		Key    string  `json:"request_key"`
		Kind   string  `json:"kind"`
	}
	if !decodePortfolio(w, r, &input) {
		return
	}
	result, err := app.store.DemoRepository.Transfer(r.Context(), r.Context().Value(userCtx).(string), input.Key, input.Kind, input.Amount)
	if err != nil {
		app.demoError(w, r, err)
		return
	}
	app.jsonResponse(w, 200, result)
}

func (app *application) createSandboxHandler(w http.ResponseWriter, r *http.Request) {
	var input store.SandboxShowInput
	if !decodePortfolio(w, r, &input) {
		return
	}
	id, err := app.store.DemoRepository.CreateSandboxShow(r.Context(), r.Context().Value(userCtx).(string), input)
	if err != nil {
		app.demoError(w, r, err)
		return
	}
	app.jsonResponse(w, 201, map[string]int64{"id": id})
}

func (app *application) editSandboxHandler(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeJSONError(w, 400, "Invalid event.")
		return
	}
	var input store.SandboxEdit
	if !decodePortfolio(w, r, &input) {
		return
	}
	if err := app.store.DemoRepository.EditSandbox(r.Context(), r.Context().Value(userCtx).(string), id, input); err != nil {
		app.demoError(w, r, err)
		return
	}
	app.jsonResponse(w, 200, map[string]bool{"saved": true})
}

func (app *application) runSandboxHandler(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeJSONError(w, 400, "Invalid event.")
		return
	}
	var input struct {
		Mode string `json:"mode"`
	}
	if !decodePortfolio(w, r, &input) {
		return
	}
	user := r.Context().Value(userCtx).(string)
	if chi.URLParam(r, "action") == "preview" {
		result, err := app.store.DemoRepository.PreviewSandbox(r.Context(), user, id, input.Mode)
		if err != nil {
			app.demoError(w, r, err)
			return
		}
		app.jsonResponse(w, 200, result)
		return
	}
	if chi.URLParam(r, "action") != "run" {
		writeJSONError(w, 404, "Unknown event action.")
		return
	}
	if err := app.store.DemoRepository.RunSandbox(r.Context(), user, id, input.Mode); err != nil {
		app.demoError(w, r, err)
		return
	}
	app.jsonResponse(w, 202, map[string]string{"message": "Market closed. Results and virtual winnings will arrive automatically in about five seconds."})
}
