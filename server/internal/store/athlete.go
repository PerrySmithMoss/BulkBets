package store

type Athlete struct {
	ID          string `json:"id"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Nationality string `json:"nationality"`
	Gender      string `json:"gender"`
}

type Competitor struct {
	Status           string  `json:"status"`
	ID               string  `json:"id"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	Residency        *string `json:"residency"`
	Nationality      *string `json:"nationality"`
	CountryCode      *string `json:"country_code"`
	DateOfBirth      *string `json:"date_of_birth"`
	Gender           *string `json:"gender"`
	PreJudgeScore    *int    `json:"pre_judge_score"`
	PreJudgePosition *int    `json:"pre_judge_position"`
	FinalScore       *int    `json:"final_score"`
	FinalPosition    *int    `json:"final_position"`
	Odds             []Odds  `json:"odds"`
}
