package main

import (
	"log"
	"net/http"
)

func (app *application) internalServerError(w http.ResponseWriter, r *http.Request, err error) {
	// TODO: implement app logger
	// app.logger.Errorw("internal error", "method", r.Method, "path", r.URL.Path, "error", err.Error())
	log.Printf("not found error for method %s for path %s.\n%v", r.Method, r.URL.Path, err.Error())

	writeJSONError(w, http.StatusInternalServerError, "the server encountered a problem")
}

func (app *application) notFoundResponse(w http.ResponseWriter, r *http.Request, err error) {
	// TODO: implement app logger
	// app.logger.Warnf("not found error", "method", r.Method, "path", r.URL.Path, "error", err.Error())
	log.Printf("not found error %v", err)

	writeJSONError(w, http.StatusNotFound, "not found")
}

func (app *application) unauthorisedResponse(w http.ResponseWriter, r *http.Request, err error) {
	// TODO: implement app logger
	// app.logger.Warnf("not found error", "method", r.Method, "path", r.URL.Path, "error", err.Error())
	log.Printf("not found error %v", err)

	writeJSONError(w, http.StatusUnauthorized, "unauthorised")
}
