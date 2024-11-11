#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    set -a  # Automatically export all variables
    source .env
    set +a  # Stop automatically exporting
else
    echo ".env file not found. Please make sure it exists in the root directory."
    exit 1
fi

# Now you can run make with all the arguments passed to the script
make "$@"
