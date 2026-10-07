# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

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
