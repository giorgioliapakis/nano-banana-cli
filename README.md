# Nanobanana

Generate and manipulate images with Google's Gemini models from your terminal.

```bash
npx nanobanana generate "a sunset over mountains" --json
```

## Install

```bash
npm install -g nanobanana
```

Requires Node.js 18+.

## Authentication

Set your Gemini API key using one of these methods:

```bash
# Store credentials (recommended)
nanobanana login --api-key YOUR_KEY

# Or use environment variables
export GEMINI_API_KEY="YOUR_KEY"
```

Remove stored credentials with `nanobanana logout`.

## Commands

### generate

Create images from text prompts.

```bash
nanobanana generate "a watercolor painting of a fox"
nanobanana generate "mountain landscape" -n 3 --styles watercolor,sketch
nanobanana generate "coffee shop" --aspect 16:9 --resolution 2K --json
```

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --count <n>` | Number of variations (1-8) | 1 |
| `--styles <list>` | Comma-separated styles (photorealistic, watercolor, sketch, ...) | - |
| `--variations <list>` | Variation types (lighting, angle, mood, ...) | - |
| `--format <type>` | `separate` or `grid` | separate |

### edit

Modify existing images with text instructions.

```bash
# Single file
nanobanana edit photo.png "make it black and white" --json

# Batch: same edit to multiple files
nanobanana edit *.png "add a vintage filter" --json

# Multi-reference: combine images as context
nanobanana edit --ref logo.png --ref style.png "create a banner" --json
```

| Option | Description |
|--------|-------------|
| `--ref <file>` | Reference image for combined context (repeatable) |

### restore

Enhance or repair damaged/old images.

```bash
nanobanana restore old-photo.png "enhance and colorize" --json
nanobanana restore scan1.png scan2.png "restore these photos" --json
```

### icon

Generate app icons, favicons, and UI elements.

```bash
nanobanana icon "rocket ship logo" --sizes 64,128,256,512 --json
```

| Option | Description | Default |
|--------|-------------|---------|
| `--sizes <list>` | Comma-separated pixel sizes | - |
| `--type <type>` | `app-icon`, `favicon`, `ui-element` | app-icon |
| `--style <style>` | `flat`, `skeuomorphic`, `minimal`, `modern` | modern |
| `--file-format <fmt>` | `png` or `jpeg` | png |
| `--background <bg>` | `transparent`, `white`, `black`, or color | transparent |
| `--corners <type>` | `rounded` or `sharp` | rounded |

### pattern

Generate seamless patterns and textures.

```bash
nanobanana pattern "geometric hexagons" --style geometric --colors duotone --json
```

| Option | Description | Default |
|--------|-------------|---------|
| `--size <WxH>` | Tile size (e.g. 256x256) | 256x256 |
| `--type <type>` | `seamless`, `texture`, `wallpaper` | seamless |
| `--style <style>` | `geometric`, `organic`, `abstract`, `floral`, `tech` | abstract |
| `--density <level>` | `sparse`, `medium`, `dense` | medium |
| `--colors <scheme>` | `mono`, `duotone`, `colorful` | colorful |
| `--repeat <method>` | `tile` or `mirror` | tile |

### story

Generate sequential images that tell a visual story.

```bash
nanobanana story "a seed growing into a tree" --steps 4 --json
```

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --steps <n>` | Images in sequence (2-8) | 4 |
| `--type <type>` | `story`, `process`, `tutorial`, `timeline` | story |
| `--style <style>` | `consistent` or `evolving` | consistent |
| `--layout <layout>` | `separate`, `grid`, `comic` | separate |
| `--transition <type>` | `smooth`, `dramatic`, `fade` | smooth |

### diagram

Generate technical diagrams and flowcharts.

```bash
nanobanana diagram "CI/CD pipeline" --type flowchart --json
```

| Option | Description | Default |
|--------|-------------|---------|
| `--type <type>` | `flowchart`, `architecture`, `network`, `database`, `wireframe`, `mindmap`, `sequence` | flowchart |
| `--style <style>` | `professional`, `clean`, `hand-drawn`, `technical` | professional |
| `--layout <layout>` | `horizontal`, `vertical`, `hierarchical`, `circular` | hierarchical |
| `--complexity <level>` | `simple`, `detailed`, `comprehensive` | detailed |
| `--colors <scheme>` | `mono`, `accent`, `categorical` | accent |
| `--annotations <level>` | `minimal` or `detailed` | detailed |

## Global Options

Available on all image commands:

| Option | Description | Default |
|--------|-------------|---------|
| `--aspect <ratio>` | Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:2, 21:9, ...) | - |
| `--resolution <res>` | Image resolution: `512px`, `1K`, `2K`, `4K` | 1K |
| `--model <model>` | Gemini model | gemini-3.1-flash-image-preview |
| `--seed <n>` | Seed for reproducible output | - |
| `--temperature <n>` | Sampling temperature (0.0-2.0) | model default |
| `--thinking <level>` | Thinking mode: `off`, `low`, `medium`, `high` | off |
| `--preview` | Open result in system viewer | - |
| `-o, --output <dir>` | Output directory | nanobanana-output/ |
| `--json` | Structured JSON output | - |
| `--api-key <key>` | API key override | - |

## JSON Output

All commands support `--json` for structured output:

```json
{
  "success": true,
  "message": "Successfully generated 1 image variation(s)",
  "files": ["/path/to/nanobanana-output/filename.png"]
}
```

## File Management

- Images save to `./nanobanana-output/` by default
- Filenames are derived from prompts (e.g. `sunset_over_mountains.png`)
- Duplicates get auto-numbered (`_1`, `_2`, ...)
- Input files are searched in: current directory, `./images/`, `./input/`, `./nanobanana-output/`, `~/Downloads/`, `~/Desktop/`

## License

Apache-2.0
