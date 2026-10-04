# Pi message listener

Polls `GET /api/messages` on the website every few seconds and blinks an LED for each visitor message. The Pi only makes outbound requests, so no ports need opening on the home network.

## Wiring

GPIO17 (physical pin 11) → 330 Ω resistor → LED long leg; LED short leg → GND (physical pin 9).

## Install

Copy this folder to `/home/pi/pi-messages` on the Pi, then:

```bash
cd /home/pi/pi-messages
python3 -m venv --system-site-packages .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
nano .env   # set API_URL and PI_TOKEN (same value as PI_TOKEN in Vercel)
chmod 600 .env
```

`--system-site-packages` lets the venv use the GPIO libraries that ship with Raspberry Pi OS.

## Try it

```bash
set -a; . ./.env; set +a
.venv/bin/python listener.py
```

Send a message from the website; within `POLL_SECONDS` it prints and the LED blinks three times.

## Run on boot

If your username or folder is not `pi` / `/home/pi/pi-messages`, edit `pi-messages.service` first.

```bash
sudo cp pi-messages.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pi-messages
journalctl -u pi-messages -f
```

## Adding a screen later

Replace the body of `on_message()` in `listener.py`; nothing on the website or API needs to change.
