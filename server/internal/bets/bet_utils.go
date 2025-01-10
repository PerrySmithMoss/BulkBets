package bets

import (
	"fmt"
	"math"

	"github.com/PerrySmithMoss/BulkBets/server/internal/currency"
)

// validateBet ensures the bet has a non-negative amount and positive odds
func validateBet(bet ActiveBet) bool {
	return bet.Amount >= 0 && bet.Odds > 0
}

// func betExistsInSameDivision(bets []ActiveBet) bool {
// 	// Use a map to track division IDs for O(1) lookup
// 	divisionSet := make(map[int64]struct{})

// 	for _, bet := range bets {
// 		if _, exists := divisionSet[bet.DivisionId]; exists {
// 			return true
// 		}
// 		divisionSet[bet.DivisionId] = struct{}{}
// 	}
// 	return false
// }

func IsBetsValid(bets []ActiveBet) error {
	if len(bets) == 0 {
		return fmt.Errorf("no bets")
	}

	hasValidBetAmount := false

	for _, bet := range bets {
		// Ensure at least one valid bet amount
		if currency.IsNumber(bet.Amount) && bet.Amount > 0 {
			hasValidBetAmount = true
		}
	}

	if !hasValidBetAmount {
		return fmt.Errorf("activeBets must contain a valid number greater than 0")
	}

	return nil
}

func IsAccumulatorBet(betSlip BetSlip) bool {
	// An accumulator bet requires:
	// 1. A valid, positive StakeMultiplier
	// 2. At least two active bets
	if betSlip.StakeMultiplier == nil || *betSlip.StakeMultiplier <= 0 {
		return false
	}

	return len(betSlip.ActiveBets) >= 2
}

func IsValidAccumulatorBet(betSlip BetSlip) error {
	if betSlip.StakeMultiplier == nil || *betSlip.StakeMultiplier <= 0 {
		return fmt.Errorf("stakeMultiplier must be a valid number greater than 0")
	}

	divisionSet := make(map[int64]struct{})
	hasValidBetAmount := false

	for _, bet := range betSlip.ActiveBets {
		// Check for duplicate division IDs
		if _, exists := divisionSet[bet.DivisionId]; exists {
			return fmt.Errorf("cannot bet on competitors in the same division")
		}
		divisionSet[bet.DivisionId] = struct{}{}

		// Ensure at least one valid bet amount
		if currency.IsNumber(bet.Amount) && bet.Amount > 0 {
			hasValidBetAmount = true
		}
	}

	if !hasValidBetAmount {
		return fmt.Errorf("all activeBets must contain a valid number greater than 0")
	}

	return nil
}

func CalculateTotalBetsAmount(bets []ActiveBet) float64 {
	var totalBetsAmount float64
	for _, bet := range bets {
		totalBetsAmount += bet.Amount
	}

	return totalBetsAmount
}

func CalculateTotalStake(betSlip BetSlip) float64 {
	multiplier := 0.0
	if betSlip.StakeMultiplier != nil {
		multiplier = *betSlip.StakeMultiplier
	}

	return CalculateTotalBetsAmount(betSlip.ActiveBets) + multiplier
}

func CalculateTotalDecimalOdds(odds []float64) (float64, error) {
	if len(odds) == 0 {
		return 0, fmt.Errorf("no odds provided")
	}

	totalOdds := 1.0
	for _, currOdds := range odds {
		if currOdds <= 0 {
			return 0, fmt.Errorf("invalid odds: %v (must be positive)", currOdds)
		}
		totalOdds *= currOdds
	}
	return totalOdds, nil
}

func GetBetAmounts(bets []ActiveBet) []float64 {
	amounts := make([]float64, 0, len(bets))
	for _, bet := range bets {
		amounts = append(amounts, bet.Amount)
	}
	return amounts
}

func GetBetOdds(bets []ActiveBet) []float64 {
	odds := make([]float64, 0, len(bets))
	for _, bet := range bets {
		odds = append(odds, bet.Odds)
	}
	return odds
}

func CalculateBetPotentialReturn(bet ActiveBet) float64 {
	potentialReturn := bet.Amount * bet.Odds
	return math.Round(potentialReturn*100) / 100 // Round to two decimal places
}

func CalculateSingularBetsTotalReturn(bets []ActiveBet) float64 {
	var totalReturn float64
	for _, bet := range bets {
		if !validateBet(bet) {
			continue
		}
		totalReturn += bet.Amount * bet.Odds
	}
	return math.Round(totalReturn*100) / 100 // Round to two decimal places
}

func CalculateAccumulatorBetTotalReturn(betSlip BetSlip) (float64, error) {
	if len(betSlip.ActiveBets) == 0 {
		return 0, fmt.Errorf("no bets in the slip")
	}

	odds := GetBetOdds(betSlip.ActiveBets)
	totalOdds, err := CalculateTotalDecimalOdds(odds)
	if err != nil {
		return 0, fmt.Errorf("error calculating total decimal odds: %w", err)
	}

	multiplier := 0.0
	if betSlip.StakeMultiplier != nil {
		multiplier = *betSlip.StakeMultiplier
	}

	totalReturn := multiplier * totalOdds
	return math.Round(totalReturn*100) / 100, nil // Round to two decimal places
}

type BetSlipTotals struct {
	TotalDecimalOdds  float64
	TotalStake        float64
	PotentialReturn   float64
	PotentialWinnings float64
}

func CalculateBetSlipTotals(betSlip BetSlip) (BetSlipTotals, error) {
	odds := GetBetOdds(betSlip.ActiveBets)
	totalDecimalOdds, err := CalculateTotalDecimalOdds(odds)
	if err != nil {
		return BetSlipTotals{}, fmt.Errorf("error calculating total decimal odds: %w", err)
	}

	betsAmount := CalculateTotalBetsAmount(betSlip.ActiveBets)

	multiplier := 0.0
	if betSlip.StakeMultiplier != nil {
		multiplier = *betSlip.StakeMultiplier
	}

	totalStake := betsAmount + multiplier

	totalSingularBetReturn := CalculateSingularBetsTotalReturn(betSlip.ActiveBets)
	totalAccumulatorBetReturn, err := CalculateAccumulatorBetTotalReturn(betSlip)
	if err != nil {
		return BetSlipTotals{}, fmt.Errorf("error calculating accumulator return: %w", err)
	}

	potentialReturn := totalSingularBetReturn + totalAccumulatorBetReturn
	potentialWinnings := potentialReturn - totalStake

	return BetSlipTotals{
		TotalDecimalOdds:  totalDecimalOdds,
		TotalStake:        math.Round(totalStake*100) / 100,
		PotentialReturn:   math.Round(potentialReturn*100) / 100,
		PotentialWinnings: math.Round(potentialWinnings*100) / 100,
	}, nil
}
