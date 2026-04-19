# splork

tomodachi life: living the dream face paint drawer for pi pico (or any other RP2040 board)

fork of [NotNite/splork](https://github.com/NotNite/splork), originally built for splatoon 3. this version targets tomodachi life: living the dream's face paint editor, with full 84-color palette support and automatic brush/cursor setup.

## setup

### dependencies

- [deno](https://deno.land) runtime
- [pico SDK](https://github.com/raspberrypi/pico-sdk) + cmake + arm-none-eabi-gcc toolchain
- a pi pico (or any RP2040 board)

on macOS:
```bash
brew install cmake
brew install --cask gcc-arm-embedded
git clone https://github.com/raspberrypi/pico-sdk.git ~/pico-sdk --recurse-submodules
```

### preparing your image

any image works. the converter will resize and dither it to tomodachi's 84-color palette automatically. transparent pixels will be ignored.

the face paint canvas is 256x256. you can specify a custom size, but 256x256 fills the full canvas.

### generating instructions

```bash
deno run -A imageconverter2/main.ts <image path> [width] [height]
```

examples:
```bash
deno run -A imageconverter2/main.ts images/myimage.png 256 256
deno run -A imageconverter2/main.ts images/myimage.png  # uses original image dimensions
```

this outputs:
- `images/result.png` - preview of the dithered image
- `rp2040src/drawing.h` - instruction data for the firmware

the converter will print the number of colors used and an estimated draw time. a full 256x256 image with many colors can take upwards of 12 hours.

### building the firmware

```bash
cd rp2040src
mkdir build
cd build
export PICO_SDK_PATH=~/pico-sdk
cmake ..
make
```

on subsequent builds you only need `cd build`, the `export`, and `make`.

### flashing

- while holding down `BOOTSEL` on your board, plug it into your computer.
- copy `rp2040src/build/splork.uf2` to the newly mounted `RPI-RP2` drive.

### drawing

- open the face paint editor in tomodachi life.
    - select pro/artist mode, pick a blank base.
    - don't touch anything else, the firmware handles brush setup automatically.
    - tip: if docked, disconnect all other controllers to ensure the "connect your controller" UI is visible.
- connect your board with a USB cable to your switch, either while it's docked or with a USB C to A cable.
    - draw sessions can take many hours. keep your switch docked.
- press the `BOOTSEL` button on the board to start.

the firmware will:
1. wait for the switch to recognize the controller
2. dismiss the controller connection dialog
3. set the brush to 1px
4. navigate to the top-left corner
5. draw the image color by color

### my drawing wasn't perfect, some lines drifted!

that happens, unfortunately, and there isn't a great way to prevent it. the original splork has a `diffgen` tool that can generate cleanup runs from a screenshot, but it hasn't been adapted for tomodachi yet.

## changes from upstream

- image converter rewritten in deno/typescript (was python)
- full 84-color palette support (was black and white only)
- automatic dithering to palette via image-q
- automatic brush setup (1px) and cursor positioning
- firmware support for X and B buttons
- drawing algorithm uses diagonal movement, row trimming, and color ordering optimizations
- Y button for color picker navigation (was B in splatoon)

## todos

- diffgen support for tomodachi
- web patcher for easy setup without building from source
- skip drawing the canvas background color
- faster drawing via combined A+direction instructions (needs testing)

## licenses

- All code is MIT. Parts are based on other MIT projects, see "credits" section below for more detail.
- All sample images are licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/), unless otherwise stated.

## credits

- original splork by [NotNite](https://github.com/NotNite/splork)
- the rp2040 codebase is vaguely based on the official dev_hid_composite example project
- the `SwitchDescriptors.h` file is from https://github.com/FeralAI/MPG (MIT)
