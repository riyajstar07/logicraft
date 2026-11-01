# LogiCraft

Fleet tracking, warehouse inventory, shipment control, and public-transit scheduling for a network running out of Mumbai, Delhi, Bengaluru, and Pune.

Built by [Riya Jaiswal](https://riyajaiswal.com).

Live site: https://logicraft-sigma.vercel.app

Sign in with `riyajstar07@gmail.com` / `logicraft`, or create an account. Each login keeps its own network in Vercel Blob.

## What you can do

- Assign drivers, schedule maintenance, and send a vehicle to the workshop.
- Watch on-hand, reserved, and available stock across three yards. Adjust counts or transfer between yards.
- Open a shipment, which reserves stock. Assign a freight vehicle, then move it through pickup, transit, and delivery. Delivery consumes the stock. Cancelling before pickup releases it.
- Run city coach services, pick seats on a 40-seat map, issue a ticket, and cancel it to free the seats.

The live site keeps this session in the browser so every action works without a hosted database. The same rules live in the Python service.

## Stack

- Console: Next.js, TypeScript, Tailwind CSS
- Service: Python, FastAPI, Pydantic, SQLite
- Tests: pytest against the HTTP API

## Run the console

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## Run the API

```bash
python3 -m pip install -r backend/requirements.txt
make api
```

- API root: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Snapshot: `make demo`
- Tests: `make test`

Docker:

```bash
docker compose up --build
```

## API sketch

| Module | Routes |
| --- | --- |
| Fleet | `POST /api/vehicles/{id}/driver`, `POST /api/maintenance`, `POST /api/vehicles/{id}/workshop` |
| Warehouse | `GET /api/inventory`, `POST /api/inventory/adjust`, `POST /api/inventory/transfer` |
| Shipments | `POST /api/shipments`, assign, advance, cancel |
| Transit | `GET /api/trips`, `POST /api/tickets`, cancel |

`backend/tests/test_e2e.py` covers the seed invariants and a full shipment plus ticket flow.
