"""Polls the website for visitor messages and blinks an LED for each one."""

import os
import time
from datetime import datetime

import requests
from gpiozero import LED

API_URL = os.environ["API_URL"].rstrip("/")
PI_TOKEN = os.environ["PI_TOKEN"]
LED_PIN = int(os.environ.get("LED_PIN", "17"))
POLL_SECONDS = float(os.environ.get("POLL_SECONDS", "10"))
MAX_BACKOFF_SECONDS = 300

led = LED(LED_PIN)


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
    print(f"Listening for messages from {API_URL} (LED on GPIO{LED_PIN})", flush=True)
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
