package env

import (
	"fmt"
	"os"
	"strings"
)

// LoadSecretFiles supports the Docker secret-file convention without putting
// secret values in service definitions or process arguments. Only explicitly
// named keys are loaded; errors never include file contents.
func LoadSecretFiles(keys ...string) error {
	for _, key := range keys {
		path := os.Getenv(key + "_FILE")
		if path == "" {
			continue
		}
		if os.Getenv(key) != "" {
			return fmt.Errorf("configure either %s or %s_FILE, not both", key, key)
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %s_FILE: %w", key, err)
		}
		value := strings.TrimRight(string(data), "\r\n")
		if value == "" {
			return fmt.Errorf("%s_FILE must contain a non-empty secret", key)
		}
		if err := os.Setenv(key, value); err != nil {
			return fmt.Errorf("load %s_FILE: %w", key, err)
		}
	}
	return nil
}
