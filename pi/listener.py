"""Polls the website for visitor messages, shows each one on the OLED and blinks an LED."""

import os
import textwrap
import time
from datetime import datetime
from pathlib import Path

import requests

API_URL = os.environ["API_URL"].rstrip("/")
PI_TOKEN = os.environ["PI_TOKEN"]
LED_PIN = os.environ.get("LED_PIN", "onboard")
POLL_SECONDS = float(os.environ.get("POLL_SECONDS", "10"))
MAX_BACKOFF_SECONDS = 300
OLED_ADDRESS = os.environ.get("OLED_ADDRESS", "0x3C")
OLED_TIMEOUT_SECONDS = float(os.environ.get("OLED_TIMEOUT_SECONDS", "300"))

# (on, off) seconds per flash. Keep in step with PI_PATTERNS in scripts/main.js so the page mirrors the desk.
PATTERNS = {
    "wave": [(0.5, 0.5)] * 3,
    "heart": [(0.15, 0.15), (0.15, 0.6)] * 3,
    "party": [(0.08, 0.08)] * 12,
    "message": [(0.3, 0.3)] * 3,
}


class OnboardLED:
    """The board's green activity LED, driven through sysfs.

    It normally flickers with SD card activity, so the original trigger is put back after each blink.
    Writing to it needs permission; the systemd unit grants that on start.
    """

    def __init__(self):
        # Newer Raspberry Pi OS calls it ACT, older releases led0.
        self.path = next(
            (p for p in (Path("/sys/class/leds/ACT"), Path("/sys/class/leds/led0")) if p.exists()),
            None,
        )
        if self.path is None:
            raise RuntimeError("No onboard activity LED found under /sys/class/leds")
        trigger = (self.path / "trigger").read_text()
        self.default_trigger = trigger.split("[", 1)[1].split("]", 1)[0] if "[" in trigger else "none"

    def _write(self, name, value):
        (self.path / name).write_text(value)

    def play(self, pattern):
        self._write("trigger", "none")
        try:
            for on_time, off_time in pattern:
                self._write("brightness", "1")
                time.sleep(on_time)
                self._write("brightness", "0")
                time.sleep(off_time)
        finally:
            self._write("trigger", self.default_trigger)


class GpioLED:
    """An external LED on a GPIO pin."""

    def __init__(self, pin):
        from gpiozero import LED
        self.led = LED(pin)

    def play(self, pattern):
        for on_time, off_time in pattern:
            self.led.on()
            time.sleep(on_time)
            self.led.off()
            time.sleep(off_time)


def make_led():
    if LED_PIN == "onboard":
        return OnboardLED()
    return GpioLED(int(LED_PIN))


class Oled:
    """A 128x64 SSD1306 on I2C bus 1, blanked after OLED_TIMEOUT_SECONDS so the pixels don't burn in."""

    CHARS_PER_LINE = 21  # luma's default font is 6px wide
    BODY_LINES = 4

    def __init__(self, address):
        from luma.core.interface.serial import i2c
        from luma.oled.device import ssd1306
        self.device = ssd1306(i2c(port=1, address=address))
        self.shown_at = None

    def show(self, header, body):
        from luma.core.render import canvas
        lines = textwrap.wrap(body, self.CHARS_PER_LINE) or [""]
        if len(lines) > self.BODY_LINES:
            lines = lines[:self.BODY_LINES]
            lines[-1] = lines[-1][:self.CHARS_PER_LINE - 3] + "..."
        with canvas(self.device) as draw:
            # Two-colour panels are yellow across the top 16 rows, so the header sits there.
            draw.text((0, 0), header[:self.CHARS_PER_LINE], fill="white")
            draw.line((0, 12, 127, 12), fill="white")
            for i, line in enumerate(lines):
                draw.text((0, 16 + i * 12), line, fill="white")
        self.shown_at = time.monotonic()

    def blank_if_stale(self):
        if self.shown_at is not None and time.monotonic() - self.shown_at > OLED_TIMEOUT_SECONDS:
            self.device.clear()
            self.shown_at = None


def make_oled():
    if OLED_ADDRESS == "off":
        return None
    try:
        return Oled(int(OLED_ADDRESS, 16))
    except Exception as err:
        # A missing library or unplugged screen shouldn't stop the LED from working.
        print(f"OLED unavailable ({err}); carrying on without it", flush=True)
        return None


led = make_led()
oled = make_oled()


def on_message(msg):
    """Handle one visitor message."""
    sent_at = datetime.fromtimestamp(msg.get("ts", 0) / 1000)
    name = msg.get("name") or "Anonymous"
    pattern = msg.get("pattern", "message")
    text = msg.get("message") or f"*{pattern}*"
    print(f"[{sent_at:%Y-%m-%d %H:%M:%S}] {name}: {text}", flush=True)
    if oled:
        oled.show(f"{name[:15]:<15} {sent_at:%H:%M}", text)
    led.play(PATTERNS.get(pattern, PATTERNS["message"]))


def fetch_messages():
    res = requests.get(
        f"{API_URL}/api/messages",
        headers={"Authorization": f"Bearer {PI_TOKEN}"},
        timeout=15,
    )
    res.raise_for_status()
    return res.json().get("messages", [])


def main():
    where = "onboard LED" if LED_PIN == "onboard" else f"LED on GPIO{LED_PIN}"
    print(f"Listening for messages from {API_URL} ({where})", flush=True)
    if oled:
        oled.show("Pi messages", "Listening for visitors...")
    delay = POLL_SECONDS
    while True:
        try:
            for msg in fetch_messages():
                on_message(msg)
            delay = POLL_SECONDS
        except requests.RequestException as err:
            # Wi-Fi drops and server hiccups are expected; back off and keep going.
            delay = min(delay * 2, MAX_BACKOFF_SECONDS)
            print(f"Poll failed ({err}); retrying in {delay:.0f}s", flush=True)
        if oled:
            oled.blank_if_stale()
        time.sleep(delay)


if __name__ == "__main__":
    main()
