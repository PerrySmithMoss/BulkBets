package bets

type BetSlip struct {
	ActiveBets      []ActiveBet `json:"activeBets"`
	StakeMultiplier float64     `json:"stakeMultiplier"`
}

type ActiveBet struct {
	ShowId       int64   `json:"showId" validate:"required"`
	DivisionId   int64   `json:"divisionId" validate:"required"`
	CompetitorId string  `json:"competitorId" validate:"required"`
	BetTypeId    int64   `json:"betTypeId" validate:"required"`
	BetType      BetType `json:"betType" validate:"required"`
	Amount       float64 `json:"amount" validate:"required,gte=0.01"`
	Odds         float64 `json:"odds"`
}

type BetType string

const (
	Win  BetType = "win"
	Loss BetType = "loss"
	Draw BetType = "draw"
)
