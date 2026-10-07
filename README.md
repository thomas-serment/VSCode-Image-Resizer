# VSCode Image Resizer

[![Release](https://img.shields.io/github/v/release/thomas-serment/VSCode-Image-Resizer)](https://github.com/thomas-serment/VSCode-Image-Resizer/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Resize JPG, PNG and WebP images from the Explorer, in one click. 1920 px by default.

## Features

- Right-click one or many images, or a whole folder (subfolders included), and pick a size
- Two modes: longest side in pixels (1920 by default) or percentage of the original size
- Keeps the format of each image: a JPG stays a JPG, a PNG stays a PNG, a WebP stays a WebP
- Never enlarges: images already small enough are left untouched
- Photos are turned upright using their EXIF orientation, and PNG and WebP transparency is kept
- Never overwrites a file: existing names get a ` (1)`, ` (2)`... suffix
- Runs locally in the background with a progress bar you can cancel, and works on every platform with a single file

## Installation

1. Download the latest `.vsix` from the [Releases](https://github.com/thomas-serment/VSCode-Image-Resizer/releases/latest) page
2. In VS Code, run **Extensions: Install from VSIX...** and select the file

## Usage

Right-click images or a folder in the Explorer and choose **Resize Images...**, or run **Image Resizer: Resize Images...** from the Command Palette to browse for files. Choose the mode, then confirm or change the proposed size. Resized files are saved in a `resized` folder next to each source image.

| Setting | Default | Description |
| --- | --- | --- |
| `imageResizer.defaultSize` | `1920` | Proposed size, in pixels, of the longest side |
| `imageResizer.quality` | `92` | Quality of JPG and WebP files, from 1 to 100 (PNG is lossless) |
| `imageResizer.outputFolder` | `resized` | Name of the folder that receives the resized files |

## Good to know

- Only JPG, PNG and WebP are resized, so that each image keeps its format. To resize other images (HEIC, AVIF, BMP, TIFF, GIF, SVG...), convert them first with [VSCode Image Converter](https://github.com/thomas-serment/VSCode-Image-Converter)
- Metadata (EXIF, color profile) is not kept in the resized files, which also removes the GPS position of photos
- Animated WebP and PNG files are refused, because they would lose their animation
- Images above 100 megapixels or 256 MB are refused

## Requirements

VS Code 1.140 or later. Virtual workspaces are not supported. Nothing is downloaded or uploaded: every codec ships inside the extension.

## Third-party software

Decoding, resizing and encoding rely on the open source WebAssembly codecs of [jSquash](https://github.com/jamsinclair/jSquash) (Apache-2.0). Their license is in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt), which also ships inside the VSIX.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
