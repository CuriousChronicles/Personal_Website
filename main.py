from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class CookedRequest(BaseModel):
    hours_until_due: float
    hours_of_sleep: float
    assignments_count: int
    percent_done: float


TIERS = [
    {
        "name": "Chilling",
        "emoji": "😎",
        "max_score": 20,
        "quotes": [
            "You've got time, sleep, and a head start. Log off — you're fine.",
            "Honestly suspicious how prepared you are. Touch grass.",
            "You're so on top of it, you're making everyone else look bad.",
        ],
    },
    {
        "name": "Slightly Toasted",
        "emoji": "🍞",
        "max_score": 40,
        "quotes": [
            "Manageable. Stop doom-scrolling and get a head start.",
            "You're warm, but not burning yet. Steady.",
            "It's giving mild panic — but you'll live. Start now.",
        ],
    },
    {
        "name": "Cooked",
        "emoji": "🍳",
        "max_score": 60,
        "quotes": [
            "Close all your tabs. All of them. Right now.",
            "Not ideal, but not over. One task at a time.",
            "The assignment is writing itself in your nightmares. Time to make it real.",
        ],
    },
    {
        "name": "Well Done",
        "emoji": "🔥",
        "max_score": 80,
        "quotes": [
            "This is the part where you find out what you're made of.",
            "You're beyond caffeine. Try spite.",
            "The vibes? Terrible. The submission? Still possible. Lock in.",
        ],
    },
    {
        "name": "Absolutely Cooked",
        "emoji": "☠️",
        "max_score": 100,
        "quotes": [
            "Pour one out for your sleep schedule.",
            "Write your name, submit, pray.",
            "We're not going to sugarcoat it. But we're rooting for you.",
            "At this point, survival mode is valid. You've got this.",
        ],
    },
]


def compute_score(req: CookedRequest) -> int:
    # Time pressure (0–30 pts)
    h = req.hours_until_due
    if h <= 2:
        time_score = 30
    elif h <= 6:
        time_score = 25
    elif h <= 12:
        time_score = 20
    elif h <= 24:
        time_score = 12
    elif h <= 48:
        time_score = 5
    else:
        time_score = 0

    # Sleep deprivation (0–30 pts)
    s = req.hours_of_sleep
    if s < 2:
        sleep_score = 30
    elif s < 4:
        sleep_score = 24
    elif s < 5:
        sleep_score = 16
    elif s < 6:
        sleep_score = 10
    elif s < 7:
        sleep_score = 4
    else:
        sleep_score = 0

    # Workload (0–20 pts)
    a = req.assignments_count
    if a <= 1:
        workload_score = 0
    elif a == 2:
        workload_score = 8
    elif a == 3:
        workload_score = 14
    elif a == 4:
        workload_score = 18
    else:
        workload_score = 20

    # Completion (0–20 pts)
    p = req.percent_done
    if p <= 10:
        completion_score = 20
    elif p <= 25:
        completion_score = 16
    elif p <= 50:
        completion_score = 12
    elif p <= 75:
        completion_score = 6
    elif p <= 90:
        completion_score = 2
    else:
        completion_score = 0

    return min(100, time_score + sleep_score + workload_score + completion_score)


@app.get("/")
def home():
    return {"status": "ok", "message": "Cooked API is running"}


@app.post("/cooked")
def get_cooked_rating(req: CookedRequest):
    score = compute_score(req)
    tier = next(t for t in TIERS if score <= t["max_score"])
    return {
        "score": score,
        "tier": tier["name"],
        "emoji": tier["emoji"],
        "quote": random.choice(tier["quotes"]),
    }
