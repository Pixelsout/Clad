"""
core/db.py
In-memory store with lightweight JSON persistence.
Data survives server restarts — critical for demo stability.
"""
import json
import os

_DB_FILE = os.path.join(os.path.dirname(__file__), "..", "db_state.json")

def _load_state():
    if os.path.exists(_DB_FILE):
        try:
            with open(_DB_FILE) as f:
                state = json.load(f)
                return (
                    state.get("workers", []),
                    state.get("policies", []),
                    state.get("claims", []),
                )
        except Exception:
            pass
    return [], [], []

def _save_state():
    try:
        with open(_DB_FILE, "w") as f:
            json.dump({"workers": workers, "policies": policies, "claims": claims}, f, indent=2)
    except Exception:
        pass

workers, policies, claims = _load_state()

def reset_db():
    """Wipe everything — useful for demo resets via /admin/reset."""
    global workers, policies, claims
    workers.clear()
    policies.clear()
    claims.clear()
    _save_state()