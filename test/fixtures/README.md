# Test Fixtures

This directory contains test data for integration tests.

## Required Files (not committed)

Download these files before running integration tests:

### Monaco Tiles (Small region for testing)

\`\`\`bash
# Download Monaco OSM extract
curl -L https://download.geofabrik.de/europe/monaco-latest.osm.pbf -o monaco.osm.pbf

# Build tiles using valhalla_build_tiles (requires Valhalla installed)
valhalla_build_tiles -c valhalla.json monaco.osm.pbf

# Package tiles
tar -cvf monaco.tiles.tar tiles/
\`\`\`

### Minimal Test Tiles

For unit tests, you can create minimal mock tiles:

\`\`\`bash
# Create empty tiles directory structure
mkdir -p tiles/0/000/000
touch tiles/0/000/000/000.gph
tar -cvf minimal.tiles.tar tiles/
\`\`\`

## File Descriptions

| File | Size | Description |
|------|------|-------------|
| `monaco.tiles.tar` | ~5MB | Full routing tiles for Monaco |
| `minimal.tiles.tar` | <1KB | Empty tile structure for unit tests |
| `route-request.json` | <1KB | Sample route request |
| `route-response.json` | ~10KB | Expected route response |

## Downloading Pre-built Tiles

Pre-built tiles for various regions may be available at:
- [Your CDN URL here]
- [Alternative source]

## Notes

- Do NOT commit large binary files to the repository
- Use Git LFS if you need to track large files
- Integration tests skip automatically if fixtures are missing
