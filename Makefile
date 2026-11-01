.PHONY: api test web demo

api:
	PYTHONPATH=backend uvicorn app.main:app --reload --port 8000

test:
	pytest -q

demo:
	PYTHONPATH=backend python3 -m app.demo

web:
	cd frontend && npm run dev
