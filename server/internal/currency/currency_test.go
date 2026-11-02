package currency

import "testing"

func TestDecimalPayoutRoundsHalfPenniesUp(t *testing.T) {
	for _, tc := range []struct{ stake, odds, want float64 }{{0.29, 2.5, 0.73}, {4.37, 1.5, 6.56}, {10, 2.75, 27.5}, {0, 4, 0}} {
		if got := MultiplyAndRound(tc.stake, tc.odds); got != tc.want {
			t.Errorf("%v at %v: got %v, want %v", tc.stake, tc.odds, got, tc.want)
		}
	}
}
