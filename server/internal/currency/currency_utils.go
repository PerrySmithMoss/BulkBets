package currency

import "math"

func RoundCurrency(value float64) float64 {
	return math.Round(value*100) / 100
}

func IsNumber(value float64) bool {
	// A value is a number if it's not NaN and not infinite
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
