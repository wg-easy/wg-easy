#!/bin/bash

folder="src/i18n/locales"
base_file="$folder/en.json"

# Get all leaf keys from the English base file
base_keys=$(jq -r 'paths(scalars) | map(tostring) | join(".")' "$base_file")
total=$(echo "$base_keys" | wc -l)

# Loop through all JSON files in the folder
for file in "$folder"/*.json; do
  name=$(basename "$file" .json)
  translated_keys=$(jq -r 'paths(scalars) | map(tostring) | join(".")' "$file")
  done=$(comm -12 <(echo "$base_keys" | sort) <(echo "$translated_keys" | sort) | wc -l)
  percent=$((100 * done / total))
  check="[ ]"
  [ "$percent" -eq 100 ] && check="[x]"
  printf "%s %s (%d%%)\n" "- $check" "$name" "$percent"
done