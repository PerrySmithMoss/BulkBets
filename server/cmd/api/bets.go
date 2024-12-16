package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/PerrySmithMoss/BulkBets/server/internal/bets"
	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

func (app *application) createBetHandler(w http.ResponseWriter, r *http.Request) {
	var betSlip bets.BetSlip
	if err := json.NewDecoder(r.Body).Decode(&betSlip); err != nil {
		log.Printf("Error %v: ", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate request betSlip
	if err := validate.Struct(betSlip); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
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

	totalStake := bets.CalculateTotalStake(betSlip.StakeMultiplier, betSlip.ActiveBets)
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

		key := store.OddsKey{
			CompetitorId: bet.CompetitorId,
			BetTypeId:    bet.BetTypeId,
		}
		if odds, found := oddsMap[key]; found {
			newBet.Odds = odds
		} else {
			newBet.Odds = 0.0
		}

		newActiveBets[i] = newBet
	}

	betSlip = bets.BetSlip{
		ActiveBets:      newActiveBets,
		StakeMultiplier: betSlip.StakeMultiplier,
	}

	// Calculate potential payout
	// TODO: why are odds, potentialReturn and potentialWinnings wrong?
	totals, err := bets.CalculateBetSlipTotals(betSlip)
	log.Printf("totals %v", totals)

	// Create bet record
	// ? If a user places a mixed bet (singular + accumulator bets) we
	// will need to create individual bet records for the singular
	// bets and a bet record for the accumulator bet, right?

	// ? TODO: Deduct bet amount from user's balance (probably best to do
	// this with an event system (RabbitMQ/Kafka?), AND/OR create database
	// trigger to do this...?

	// create transaction (probably best to do this with an event
	// system (RabbitMQ/Kafka?)

	// return successful response
}
