package currency

import (
	"math"
	"math/big"
	"strconv"
)

func RoundCurrency(value float64) float64 {
	return math.Round(value*100) / 100
}

func IsNumber(value float64) bool {
	// A value is a number if it's not NaN and not infinite
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

// Decimal products are calculated exactly, with half-up rounding at the boundary.
func MultiplyAndRound(values ...float64) float64 {
	product := big.NewRat(1, 1)
	for _, v := range values {
		r, ok := new(big.Rat).SetString(strconv.FormatFloat(v, 'f', -1, 64))
		if !ok {
			return math.Inf(1)
		}
		product.Mul(product, r)
	}
	product.Mul(product, big.NewRat(100, 1))
	n, rem := new(big.Int), new(big.Int)
	n.QuoRem(product.Num(), product.Denom(), rem)
	if new(big.Int).Mul(rem, big.NewInt(2)).Cmp(product.Denom()) >= 0 {
		n.Add(n, big.NewInt(1))
	}
	value, _ := new(big.Rat).SetFrac(n, big.NewInt(100)).Float64()
	return value
}
