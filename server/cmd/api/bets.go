package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"strconv"

	"github.com/PerrySmithMoss/BulkBets/server/internal/bets"
	json_utils "github.com/PerrySmithMoss/BulkBets/server/internal/json"
	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

func (app *application) createBetHandler(w http.ResponseWriter, r *http.Request) {
	var betSlip bets.BetSlip

	if err := json.NewDecoder(r.Body).Decode(&betSlip); err != nil {
		log.Printf("Error %v: ", err)
		writeJSONError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if err := validate.Struct(betSlip); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(betSlip.ActiveBets) == 0 {
		writeJSONError(w, http.StatusBadRequest, "At least one active bet is required")
		return
	}

	// Check if the bet is an accumulator
	isAccumulator := bets.IsAccumulatorBet(betSlip)

	// Validate accumulator bet rules
	if isAccumulator {
		if err := bets.IsValidAccumulatorBet(betSlip); err != nil {
			writeJSONError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	// Validate singular bets
	if len(betSlip.ActiveBets) > 1 {
		if err := bets.IsBetsValid(betSlip.ActiveBets); err != nil {
			writeJSONError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	if len(betSlip.ActiveBets) == 1 && betSlip.StakeMultiplier == nil || *betSlip.StakeMultiplier <= 0 {
		writeJSONError(w, http.StatusBadRequest, "bet must contain valid amount or stakeMultiplier")
		return
	}

	userID, ok := r.Context().Value(userCtx).(string)
	if !ok || userID == "" {
		writeJSONError(w, http.StatusUnauthorized, "Unauthorised")
		return
	}

	ctx := r.Context()
	user, err := app.store.UserRepository.GetUserByID(ctx, userID)
	if err != nil {
		log.Printf("No user with ID %s found", userID)
		writeJSONError(w, http.StatusUnauthorized, "Unauthorised")
		return
	}

	// ? TODO: Check if the division participant exists and if betting is allowed
	// participant, err := app.store.DivisionParticipantRepository.GetByID(r.Context(), betReq.DivisionParticipantID)
	// if err != nil {
	// 	writeJSONError(w, http.StatusNotFound, "Division participant not found")
	// 	return
	// }

	// ? TODO: Check if the stake multiplier is within betting limits AND
	// Check if the amount of each bet is within the betting limits?

	totalStake := bets.CalculateTotalStake(betSlip)

	// Check if user has enough funds to make bet
	if user.Balance < totalStake {
		writeJSONError(w, http.StatusForbidden, "Insufficient balance")
		return
	}

	oddsQueryKeys := make([]store.OddsKey, len(betSlip.ActiveBets))
	for i, bet := range betSlip.ActiveBets {
		oddsQueryKeys[i] = struct {
			CompetitorId string
			BetTypeId    int64
		}{
			CompetitorId: bet.CompetitorId,
			BetTypeId:    int64(bet.BetTypeId),
		}
	}

	// Fetch odds for user's bets
	// ? TODO: potential refactor to check user submitted odds against odds
	// stored in DB and if they're the same then we can continue to use the
	// same request betSlip instead of having to add the returned odds below
	// onto the request betSlip. Return error if not?
	oddsMap, err := app.store.OddsRepository.FetchOdds(ctx, oddsQueryKeys)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to retrieve odds")
		return
	}

	newActiveBets := make([]bets.ActiveBet, len(betSlip.ActiveBets))

	for i, bet := range betSlip.ActiveBets {
		newBet := bet
		potentialPayout := bets.CalculateBetPotentialPayout(bet)

		key := store.OddsKey{
			CompetitorId: bet.CompetitorId,
			BetTypeId:    bet.BetTypeId,
		}
		if odds, found := oddsMap[key]; found {
			newBet.Odds = odds

			if potentialPayout == 0 {
				newBet.PotentialPayout = nil
			} else {
				newBet.PotentialPayout = &potentialPayout
			}
		} else {
			newBet.Odds = 0.0
			payout := 0.0
			newBet.PotentialPayout = &payout
		}

		newActiveBets[i] = newBet
	}

	betSlip = bets.BetSlip{
		ActiveBets:      newActiveBets,
		StakeMultiplier: betSlip.StakeMultiplier,
	}

	// Calculate potential payout
	totals, err := bets.CalculateBetSlipTotals(betSlip)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Error parsing bet slip")
		return
	}

	multiplier := 0.0
	if betSlip.StakeMultiplier != nil {
		multiplier = *betSlip.StakeMultiplier
	}

	potentialAccumulatorPayout := (multiplier * totals.TotalDecimalOdds) - multiplier
	roundedPayout := math.Round(potentialAccumulatorPayout*100) / 100

	betSlip = bets.BetSlip{
		ActiveBets:      newActiveBets,
		StakeMultiplier: betSlip.StakeMultiplier,
		OddsAtTime:      totals.TotalDecimalOdds,
		PotentialPayout: &roundedPayout,
	}
	json_utils.LogPretty("betSlip", betSlip)

	err = app.store.BetsRepository.CreateBet(ctx, &betSlip, user)
	if err != nil {
		log.Printf("err: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Error while creating bet")
		return
	}

	app.jsonResponse(w, http.StatusCreated, nil)
}

func (app *application) getBetsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userCtx).(string)
	if !ok {
		http.Error(w, "Unauthorised", http.StatusUnauthorized)
		return
	}

	status := r.URL.Query()["status"]
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	// Validate and parse pagination parameters
	limit := 20
	offset := 0
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = min(parsedLimit, 100) // Add maximum limit
		}
	}
	if offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Add validation for status
	validStatuses := map[string]bool{
		"live":      true,
		"won":       true,
		"lost":      true,
		"pending":   true,
		"settled":   true,
		"unsettled": true,
		"void":      true,
		"cancelled": true,
	}

	for _, s := range status {
		if !validStatuses[s] {
			app.badRequestResponse(w, r, "invalid status parameter")
			return
		}
	}

	bets, err := app.store.BetsRepository.FetchUserBets(r.Context(), userID, status, limit, offset)
	if err != nil {
		switch err {
		case store.ErrNotFound:
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}

	// Add pagination metadata
	response := struct {
		Bets       []store.BetResponse `json:"bets"`
		Pagination struct {
			Limit  int `json:"limit"`
			Offset int `json:"offset"`
		} `json:"pagination"`
	}{
		Bets: bets,
		Pagination: struct {
			Limit  int `json:"limit"`
			Offset int `json:"offset"`
		}{
			Limit:  limit,
			Offset: offset,
		},
	}

	if err := app.jsonResponse(w, http.StatusOK, response); err != nil {
		log.Printf("getBetsHandler err: %v", err)
		app.internalServerError(w, r, err)
	}
}
