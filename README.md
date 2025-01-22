# Create Release GitHub Action

This GitHub Action creates a release based on the commits in a pull request.

## Inputs

### `GITHUB_TOKEN`

**Required** The GitHub token with repo scope.

### `trigger-release`

**Optional** If set to true, the action will create a release. Default is `${{ github.event.pull_request.merged }}`.

## Outputs

### `release-url`

The URL of the created release.

## Example Usage

```yaml
name: Create Release

on:
  pull_request:
    types: [closed]

jobs:
  create-release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Create Release
        uses: ./  # Use the path to your action
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Author

Volker Schmitz
