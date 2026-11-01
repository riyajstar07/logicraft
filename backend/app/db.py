"""SQLite snapshot store. The network state is one JSON document."""

import json
import os
import sqlite3
from pathlib import Path

OPEN_SHIPMENTS = {"reserved", "assigned", "picked-up", "in-transit"}


def seed_path():
    override = os.environ.get("LOGICRAFT_SEED")
    if override:
        return Path(override)
    here = Path(__file__).resolve()
    local = here.parents[2] / "frontend" / "data" / "seed.json"
    if local.exists():
        return local
    return Path("/srv/frontend/data/seed.json")


def db_path():
    return Path(os.environ.get("LOGICRAFT_DB", Path(__file__).resolve().parents[1] / "logicraft.db"))


def load_seed():
    with seed_path().open(encoding="utf-8") as handle:
        return json.load(handle)


def connect():
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(path)


def init_db():
    conn = connect()
    conn.execute("create table if not exists snapshot (id integer primary key, body text not null)")
    row = conn.execute("select body from snapshot where id = 1").fetchone()
    if row is None:
        conn.execute("insert into snapshot (id, body) values (1, ?)", (json.dumps(load_seed()),))
        conn.commit()
    conn.close()


def load_state():
    init_db()
    conn = connect()
    row = conn.execute("select body from snapshot where id = 1").fetchone()
    conn.close()
    return json.loads(row[0])


def save_state(state):
    conn = connect()
    conn.execute("update snapshot set body = ? where id = 1", (json.dumps(state),))
    conn.commit()
    conn.close()


def reset_state():
    state = load_seed()
    init_db()
    save_state(state)
    return state
