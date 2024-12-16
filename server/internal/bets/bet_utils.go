package bets

import (
	"fmt"
	"math"
)

// validateBet ensures the bet has a non-negative amount and positive odds
func validateBet(bet ActiveBet) bool {
	return bet.Amount >= 0 && bet.Odds > 0
}

func CalculateTotalBetsAmount(bets []ActiveBet) float64 {
	var totalBetsAmount float64
	for _, bet := range bets {
		totalBetsAmount += bet.Amount
	}

	return totalBetsAmount
}

func CalculateTotalStake(stakeMultiplier float64, bets []ActiveBet) float64 {
	return CalculateTotalBetsAmount(bets) + stakeMultiplier
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

func CalculateSingularBetReturn(bets []ActiveBet) float64 {
	var totalReturn float64
	for _, bet := range bets {
		if !validateBet(bet) {
			continue
		}
		totalReturn += bet.Amount * bet.Odds
	}
	return math.Round(totalReturn*100) / 100 // Round to two decimal places
}

func CalculateAccumulatorBetReturn(betSlip BetSlip) (float64, error) {
	if len(betSlip.ActiveBets) == 0 {
		return 0, fmt.Errorf("no bets in the slip")
	}

	odds := GetBetOdds(betSlip.ActiveBets)
	totalOdds, err := CalculateTotalDecimalOdds(odds)
	if err != nil {
		return 0, fmt.Errorf("error calculating total decimal odds: %w", err)
	}

	totalReturn := betSlip.StakeMultiplier * totalOdds
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
	totalStake := betsAmount + betSlip.StakeMultiplier

	totalSingularBetReturn := CalculateSingularBetReturn(betSlip.ActiveBets)
	totalAccumulatorBetReturn, err := CalculateAccumulatorBetReturn(betSlip)
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
