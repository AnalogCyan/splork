# Splork

Tomodachi Life: Living the Dream art drawer/printer for Raspberry Pi Pico (or any other RP2040 board).

Fork of [NotNite/splork](https://github.com/NotNite/splork), which forked [aveao/splork](https://github.com/aveao/splork) (the original Splatoon 3 version) to add initial Tomodachi Life support. This fork fully converts the project for Tomodachi Life: Living the Dream, with an 84-color palette, automatic editor setup, and an optimized drawing algorithm.

## Setup

### Dependencies

- [Deno](https://deno.land) runtime
- [Pico SDK](https://github.com/raspberrypi/pico-sdk) + CMake + arm-none-eabi-gcc toolchain
- A Raspberry Pi Pico (or any RP2040 board)

On macOS:
```bash
brew install cmake
brew install --cask gcc-arm-embedded
git clone https://github.com/raspberrypi/pico-sdk.git ~/pico-sdk --recurse-submodules
```

### Preparing Your Image

Any image works. The converter will resize and dither it to Tomodachi's 84-color palette automatically. Transparent pixels will be ignored.

The paint canvas is 256x256. You can specify a custom size, but 256x256 fills the full canvas.

### Generating Instructions

From the repo root:
```bash
deno run -A imageconverter2/main.ts <image path> [width] [height]
```

Examples:
```bash
deno run -A imageconverter2/main.ts images/myimage.png 256 256
deno run -A imageconverter2/main.ts images/myimage.png  # uses original image dimensions
```

This outputs:
- `images/result.png` - preview of the dithered image
- `rp2040src/drawing.h` - instruction data for the firmware

The converter will print the number of colors used and an estimated draw time. A full 256x256 image with many colors can take upwards of 12 hours.

### Building the Firmware

```bash
cd rp2040src
mkdir build
cd build
export PICO_SDK_PATH=~/pico-sdk
cmake ..
make
```

On subsequent builds you only need `cd build`, the `export`, and `make`.

### Flashing

- While holding down `BOOTSEL` on your board, plug it into your computer.
- Copy `rp2040src/build/splork.uf2` to the newly mounted `RPI-RP2` drive.

### Drawing

- Make sure the advanced/pro editor is enabled in your game settings.
- Open a new paint canvas in Tomodachi Life. Don't touch anything after opening it.
    - The firmware will automatically set the brush size, select colors, and position the cursor.
    - Tip: if docked, disconnect all other controllers to ensure the "connect your controller" UI is visible.
- Connect your board with a USB cable to your Switch, either while it's docked or with a USB-C to USB-A cable.
    - Draw sessions can take many hours. Keep your Switch docked.
- Press the `BOOTSEL` button on the board to start.

The firmware will:
1. Wait for the Switch to recognize the controller
2. Dismiss the controller connection dialog
3. Set the brush to 1px
4. Navigate to the top-left corner
5. Draw the image color by color

### My drawing wasn't perfect, some lines drifted!

That happens, unfortunately, and there isn't a great way to prevent it. The original Splork has a `diffgen` tool that can generate cleanup runs from a screenshot, but it hasn't been adapted for Tomodachi yet.

## Changes from Upstream

- Image converter rewritten in Deno/TypeScript (was Python)
- Full 84-color palette support (was black and white only)
- Automatic dithering to palette via image-q
- Automatic brush setup (1px) and cursor positioning
- Firmware support for X and B buttons
- Drawing algorithm uses diagonal movement, row trimming, and color ordering optimizations
- Y button for color picker navigation (was B in Splatoon)

## TODOs

- diffgen support for Tomodachi
- Web patcher for easy setup without building from source
- Skip drawing the canvas background color
- Faster drawing via combined A+direction instructions (needs testing)

## Licenses

- All code is MIT. Parts are based on other MIT projects, see "Credits" section below for more detail.
- All sample images are licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/), unless otherwise stated.

## Credits

- Original Splork by [ave](https://github.com/aveao/splork)
- Tomodachi Life fork by [NotNite](https://github.com/NotNite/splork)
- The RP2040 codebase is vaguely based on the official dev_hid_composite example project
- The `SwitchDescriptors.h` file is from https://github.com/FeralAI/MPG (MIT)
