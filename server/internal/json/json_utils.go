package json_utils

import (
	"encoding/json"
	"log"
)

// LogPretty formats and logs a human-readable representation of the given data.
func LogPretty(prefix string, data interface{}) {
	// Marshal the data into indented JSON
	prettyJSON, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		log.Printf("%s: Failed to marshal data: %v", prefix, err)
		return
	}

	// Log the formatted JSON
	log.Printf("%s:\n%s", prefix, string(prettyJSON))
}
