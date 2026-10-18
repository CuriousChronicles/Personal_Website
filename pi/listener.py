"""Polls the website for visitor messages and blinks an LED for each one."""

import os
import time
from datetime import datetime
from pathlib import Path

import requests

API_URL = os.environ["API_URL"].rstrip("/")
PI_TOKEN = os.environ["PI_TOKEN"]
LED_PIN = os.environ.get("LED_PIN", "onboard")
POLL_SECONDS = float(os.environ.get("POLL_SECONDS", "10"))
MAX_BACKOFF_SECONDS = 300


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

    def blink(self, on_time, off_time, n, background=False):
        self._write("trigger", "none")
        try:
            for _ in range(n):
                self._write("brightness", "1")
                time.sleep(on_time)
                self._write("brightness", "0")
                time.sleep(off_time)
        finally:
            self._write("trigger", self.default_trigger)


def make_led():
    if LED_PIN == "onboard":
        return OnboardLED()
    from gpiozero import LED
    return LED(int(LED_PIN))


led = make_led()


def on_message(msg):
    """Handle one visitor message. Swap this out when the screen arrives."""
    sent = datetime.fromtimestamp(msg.get("ts", 0) / 1000).strftime("%Y-%m-%d %H:%M:%S")
    name = msg.get("name") or "Anonymous"
    print(f"[{sent}] {name}: {msg.get('message', '')}", flush=True)
    led.blink(on_time=0.3, off_time=0.3, n=3, background=False)


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
        time.sleep(delay)


if __name__ == "__main__":
    main()
