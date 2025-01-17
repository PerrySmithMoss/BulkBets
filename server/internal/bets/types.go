package bets

type BetSlip struct {
	ActiveBets      []ActiveBet `json:"activeBets"`
	StakeMultiplier *float64    `json:"stakeMultiplier"`
	OddsAtTime      float64     `json:"odds_at_time"`
	// currently this is used in a context to mean the total
	// PotentialPayout of all the bets. Would be better to
	// rename to totalPotentialPayout or use it in a context
	// where it's means the PotentialPayout of the accumulator bet
	PotentialPayout *float64 `json:"potential_payout"`
}

type ActiveBet struct {
	ShowId          int64    `json:"showId" validate:"required"`
	DivisionId      int64    `json:"divisionId" validate:"required"`
	CompetitorId    string   `json:"competitorId" validate:"required"`
	BetTypeId       int64    `json:"betTypeId" validate:"required"`
	BetType         BetType  `json:"betType" validate:"required"`
	Amount          *float64 `json:"amount"`
	PotentialPayout *float64 `json:"potential_payout"`
	Odds            float64  `json:"odds" validate:"required"`
}

type BetType string

const (
	Win  BetType = "win"
	Loss BetType = "loss"
	Draw BetType = "draw"
)
