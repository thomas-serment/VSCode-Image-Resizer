# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.1] - 2026-10-08

### Changed

- The default quality of JPG and WebP files is now 95 (it was 92), and the README tells apart what is asked at each run from what is set in the settings

## [2.0.0] - 2026-10-07

### Added

- A size is proposed (1920 px by default, set with `imageResizer.defaultSize`), and the mode used last comes first
- Progress notification with a cancel button and a single summary at the end, with details in the Image Resizer output channel
- `imageResizer.quality` and `imageResizer.outputFolder` settings
- Photos are turned upright using their EXIF orientation, and PNG and WebP transparency is kept
- Animated WebP and PNG files are refused instead of being flattened
- Third-party licenses are listed in `THIRD-PARTY-NOTICES.txt`
- Automated tests, including every format through the bundled worker

### Changed

- Rewritten in TypeScript on WebAssembly codecs instead of sharp: one VSIX works on Linux, Windows and macOS, with no native build
- Each image keeps its format, and only JPG, PNG and WebP are resized (use VSCode Image Converter for the other formats)
- Images are never enlarged: those already small enough are left untouched and counted in the summary
- Conversions run in background workers, so the editor stays responsive
- Messages and the command are now in English, and the command id is `image-resizer.resize`
- Requires VS Code 1.140 or later, and the Node typings and the release build target Node 24, the version VS Code 1.140 runs
- The release workflow is back, based on the VSCode Shell Runner one

### Removed

- HEIC and TIFF, which were announced but could not be written back
- The sharp and `fs` dependencies

### Fixed

- The `resized` folder is no longer scanned again on the next run, which created `resized/resized`
- Existing files are never overwritten: a numeric suffix is added instead
- One notification per image is replaced by a single summary
- Several selected images are all resized, not only the first one
- Large folders no longer start every resize at once

## [1.1.1] - 2025-05-06

### Added

- Percentage mode, next to the size in pixels

### Changed

- Resized images are saved in a `resized` folder next to the source image, with their original name, instead of beside it with a `_resized_NxN` suffix

### Fixed

- The `resized` folder is created even when its parent folders do not exist yet

### Removed

- The GitHub release workflow file

## [1.1.0] - 2024-10-03

### Added

- Folders are resized recursively

## [1.0.148] - 2024-08-04

### Fixed

- Release workflow fixes (versions 1.0.1 to 1.0.148), with no change to the extension itself

## [1.0.0] - 2024-08-03

### Added

- GitHub release workflow that builds and publishes the VSIX from a version commit

## [0.0.1] - 2024-02-15

### Added

- First version: right-click images in the Explorer to resize them to a chosen size in pixels with sharp, skipping images that are already smaller
