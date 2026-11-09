package main

import (
	"fmt"
	"os"

	"github.com/PerrySmithMoss/BulkBets/deploy/restricted/internal/release"
)

func main() {
	if err := release.Run(os.Args[1:], os.Stdin, os.Stdout, os.Stderr); err != nil {
		fmt.Fprintln(os.Stderr, "Release rejected or failed. Check the root-owned release configuration and service health.")
		os.Exit(1)
	}
}
