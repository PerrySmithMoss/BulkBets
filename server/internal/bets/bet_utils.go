package bets

import (
	"fmt"
	"math"
)

// validateBet ensures the bet has a non-negative amount and positive odds
func validateBet(bet ActiveBet) bool {
	if bet.Amount == nil {
		return false // If Amount is nil, it's invalid
	}
	return *bet.Amount >= 0 && bet.Odds > 0
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

func IsBetsValid(selections []ActiveBet) error {
	if len(selections) == 0 {
		return fmt.Errorf("choose at least one selection")
	}
	for _, bet := range selections {
		if bet.Amount == nil || *bet.Amount <= 0 {
			return fmt.Errorf("enter a stake for every single, or add an accumulator stake")
		}
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
	if !IsAccumulatorBet(betSlip) {
		return fmt.Errorf("an accumulator needs a positive stake and at least two selections")
	}
	divisions := make(map[int64]bool)
	for _, bet := range betSlip.ActiveBets {
		if divisions[bet.DivisionId] {
			return fmt.Errorf("an accumulator needs selections from different divisions")
		}
		divisions[bet.DivisionId] = true
	}
	return nil
}

// Reject invalid monetary inputs before any balance calculation or database write.
func ValidateAmounts(slip BetSlip) error {
	valid := func(value *float64) bool {
		return value == nil || (!math.IsNaN(*value) && !math.IsInf(*value, 0) && *value >= 0 && *value <= 999999.99 && math.Abs(*value*100-math.Round(*value*100)) < 0.000001)
	}
	if !valid(slip.StakeMultiplier) {
		return fmt.Errorf("enter a valid stake with at most two decimal places")
	}
	if len(slip.ActiveBets) > 30 {
		return fmt.Errorf("a slip supports up to 30 selections")
	}
	seen := make(map[string]bool)
	for _, bet := range slip.ActiveBets {
		if !valid(bet.Amount) {
			return fmt.Errorf("enter a valid stake with at most two decimal places")
		}
		if seen[bet.CompetitorId] {
			return fmt.Errorf("remove duplicate selections")
		}
		seen[bet.CompetitorId] = true
	}
	if len(slip.ActiveBets) == 1 && slip.StakeMultiplier != nil && *slip.StakeMultiplier > 0 && slip.ActiveBets[0].Amount != nil && *slip.ActiveBets[0].Amount > 0 {
		return fmt.Errorf("use one stake for a single selection")
	}
	return nil
}

func CalculateTotalBetsAmount(bets []ActiveBet) float64 {
	var totalBetsAmount float64
	for _, bet := range bets {
		if bet.Amount != nil { // Check if Amount is not nil before dereferencing
			totalBetsAmount += *bet.Amount // Dereference Amount to get the float64 value
		}
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

	totalOdds = math.Round(totalOdds*100) / 100

	return totalOdds, nil
}

func GetBetAmounts(bets []ActiveBet) []float64 {
	amounts := make([]float64, 0, len(bets))
	for _, bet := range bets {
		if bet.Amount != nil {
			amounts = append(amounts, *bet.Amount)
		}
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

func CalculateBetPotentialPayout(bet ActiveBet) float64 {
	if bet.Amount == nil { // Check if Amount is nil to avoid dereferencing nil
		return 0 // Return 0 if Amount is nil
	}
	potentialReturn := *bet.Amount * bet.Odds    // Dereference bet.Amount to get the float64 value
	return math.Round(potentialReturn*100) / 100 // Round to two decimal places
}

func CalculateSingularBetsTotalReturn(bets []ActiveBet) float64 {
	var totalReturn float64
	for _, bet := range bets {
		if !validateBet(bet) {
			continue
		}
		if bet.Amount != nil { // Check if Amount is not nil
			totalReturn += *bet.Amount * bet.Odds // Dereference Amount to get the float64 value
		}
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
