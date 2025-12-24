# Achroma

A GNOME Shell extension that toggles your display to monochrome/grayscale mode with a single click. 

Useful for reducing eye strain, improving focus, or accessibility. 

## Features

- One-click toggle for monochrome display
- Multiple color profiles to choose from
- Settings persist between sessions
- Lightweight and simple

## Profiles

| Profile | Description |
|---------|-------------|
| Grayscale | Standard full desaturation |
| Soft | Subtle 70% desaturation |
| High Contrast | Grayscale with enhanced contrast |
| Low Brightness | Darker grayscale for night use |
| Sepia | Warm vintage tone |

## Installation

### From GNOME Extensions Website

1. Visit [Achroma on extensions.gnome.org](https://extensions.gnome.org/extension/achroma)
2. Click the toggle to install

### Manual Installation

1. Clone or download this repository: 
   ```bash
   git clone https://github.com/ktauchathuranga/achroma. git
   ```

2. Copy to GNOME extensions directory:
   ```bash
   cp -r achroma ~/. local/share/gnome-shell/extensions/achroma@ktauchathuranga@gmail.com
   ```

3. Compile the schema:
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/achroma@ktauchathuranga@gmail.com/schemas/
   ```

4. Restart GNOME Shell: 
   - On Wayland: Log out and log back in
   - On X11: Press `Alt+F2`, type `r`, press Enter

5. Enable the extension:
   ```bash
   gnome-extensions enable achroma@ktauchathuranga@gmail.com
   ```

## Usage

| Action | Result |
|--------|--------|
| Left click on icon | Toggle effect on/off |
| Extension Preferences | Select color profile |

### Opening Preferences

Via command line:
```bash
gnome-extensions prefs achroma@ktauchathuranga@gmail.com
```

Or via Extension Manager app:  Click the gear icon next to Achroma. 

## Requirements

- GNOME Shell 49 or later

## Development

### Testing without logging out

Run a nested GNOME Shell session:
```bash
dbus-run-session -- gnome-shell --nested --wayland
```

### Viewing logs

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

### Reloading the extension

```bash
gnome-extensions disable achroma@ktauchathuranga@gmail.com && gnome-extensions enable achroma@ktauchathuranga@gmail.com
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue. 