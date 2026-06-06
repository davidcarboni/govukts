#!/usr/bin/env bash
set -euo pipefail

BUMP=${1:-patch}
NOTE=${2:-}

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major] [\"release note\"]"
  exit 1
fi

# Must be on main
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
  echo "Error: must be on main (currently on $branch)"
  exit 1
fi

# Working tree must be clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes present"
  exit 1
fi

# Must not be behind remote
git fetch origin main
behind=$(git rev-list HEAD..origin/main --count)
if [ "$behind" -gt 0 ]; then
  echo "Error: ${behind} commit(s) behind origin/main — pull first"
  exit 1
fi

# Default release note based on bump type
if [ -z "$NOTE" ]; then
  case "$BUMP" in
    patch) NOTE="Patch release" ;;
    minor) NOTE="Minor release" ;;
    major) NOTE="Major release" ;;
  esac
fi

# Bump version in package.json only — commit and tag are created below
npm version "$BUMP" --no-git-tag-version
version=$(node -p "require('./package.json').version")
tag="v${version}"

echo "Preparing release ${tag}..."

# Prepend changelog entry to README
RELEASE_TAG="$tag" RELEASE_NOTE="$NOTE" node -e "
const fs = require('fs');
const readme = fs.readFileSync('README.md', 'utf8');
const entry = '### ' + process.env.RELEASE_TAG + '\n' + process.env.RELEASE_NOTE + '\n';
const updated = readme.replace('## Changelog\n', '## Changelog\n\n' + entry);
if (updated === readme) { console.error('Changelog section not found in README.md'); process.exit(1); }
fs.writeFileSync('README.md', updated);
"

# Commit everything, tag, and push — the tag push triggers the publish workflow
git add -A
git commit -m "${tag}"
git tag "${tag}"
git push origin main "${tag}"

echo "Done — ${tag} pushed, publish workflow will trigger automatically"
