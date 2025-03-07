#!/bin/bash

package_json="src/package.json"

# Function to update the version in package.json
update_version() {
  local new_version=$1
  jq --arg new_version "$new_version" '.version = $new_version' $package_json > tmp.json && mv tmp.json $package_json
}

# Get the current version from package.json
current_version=$(jq -r '.version' $package_json)
echo "Current version: $current_version"

# Prompt the user for the new version
read -p "Enter the new version (following SemVer): " new_version

# Official SemVer regex for validation
semver_regex="^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"

# Validate the new version
if ! echo "$new_version" | grep -Eq "$semver_regex"; then
  echo "Invalid version format. Please use SemVer format (e.g., 1.0.0 or 1.0.0-alpha)."
  exit 1
fi

# Update the version in package.json
update_version $new_version
echo "Updated package.json to version $new_version"

echo "----"
echo "If you changed the major version, remember to update the docker-compose.yml file and docs (search for: ref: major version)"
echo "----"

echo "If you did everything press 'y' to commit the changes and create a new tag"
read -p "Do you want to continue? (y/n): " confirm

if [ "$confirm" != "y" ]; then
  echo "Aborted."
  exit 1
fi

# Commit the changes
git add $package_json
git commit -m "Bump version to $new_version"
echo "Committed the changes"

# Create a new Git tag
git tag -a "v$new_version" -m "Release version $new_version"
echo "Created Git tag v$new_version"

# Push the commit & tag to the remote repository
git push origin master --follow-tags
echo "Pushed Git commit and tag v$new_version to remote repository"
