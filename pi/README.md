# Pi message listener

Polls `GET /api/messages` on the website every few seconds, shows each visitor message on a 0.96" OLED and blinks an LED. The Pi only makes outbound requests, so no ports need opening on the home network.

## Wiring

### OLED (SSD1306, 128×64, I2C)

| OLED | Pi (physical pin) |
|---|---|
| VCC | 1 (3.3V) |
| GND | 9 (GND) — pin 6 is taken by the case fan |
| SCL | 5 (GPIO3) |
| SDA | 3 (GPIO2) |

Match the labels printed on the OLED, not their position: they run `GND VCC SCL SDA` on this module. Shut the Pi down before wiring.

Turn on I2C and check the screen answers at `3c`:

```bash
sudo raspi-config nonint do_i2c 0
i2cdetect -y 1
```

If the grid is all `--`, SDA and SCL are usually swapped or a header pin isn't soldered.

### External LED (optional)

GPIO17 (physical pin 11) → 330 Ω resistor → LED long leg; LED short leg → GND (physical pin 14). Set `LED_PIN=17` in `.env`. By default the onboard activity LED is used instead.

## Install

Copy this folder to `/home/admin/pi-messages` on the Pi, then:

```bash
cd ~/pi-messages
python3 -m venv --system-site-packages .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
nano .env   # set API_URL and PI_TOKEN (same value as PI_TOKEN in Vercel)
chmod 600 .env
```

`--system-site-packages` lets the venv use the GPIO libraries that ship with Raspberry Pi OS. Raspberry Pi OS blocks a plain `pip install`, so always install through `.venv/bin/pip`.

## Try it

```bash
set -a; . ./.env; set +a
.venv/bin/python listener.py
```

The screen shows "Listening for visitors...". Send a message from the website; within `POLL_SECONDS` it appears on the screen (sender and time on top, message below) and the LED blinks. The screen blanks `OLED_TIMEOUT_SECONDS` after the last message. If the screen can't be reached the listener says so and carries on with just the LED.

## Run on boot

If your username or folder is not `admin` / `/home/admin/pi-messages`, edit `pi-messages.service` first.

```bash
sudo cp pi-messages.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pi-messages
journalctl -u pi-messages -f
```
