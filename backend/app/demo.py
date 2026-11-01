"""Print a one-screen snapshot of the seeded network."""

from app.db import load_seed
from app.domain import available, dashboard


def main():
    state = load_seed()
    snap = dashboard(state)
    print("LogiCraft")
    print("  vehicles        ", snap["vehicles"])
    print("  active          ", snap["activeVehicles"])
    print("  open shipments  ", snap["openShipments"])
    print("  delayed         ", snap["delayedShipments"])
    print("  tickets         ", snap["confirmedTickets"])
    print("  overdue service ", snap["overdueMaintenance"])
    print("Low stock")
    for row in snap["lowStock"]:
        print("  {warehouse}: {sku} ({available} left, reorder {reorderAt})".format(**row))
    print("Open shipments")
    for shipment in state["shipments"]:
        if shipment["status"] in ("delivered", "cancelled"):
            continue
        units = sum(line["qty"] for line in shipment["lines"])
        print("  {reference}  {status:<12}  {customer}  {units} units".format(units=units, **shipment))
    held = sum(row["reserved"] for row in state["stock"])
    free = sum(available(row) for row in state["stock"])
    print("Stock  reserved {0}   available {1}".format(held, free))


if __name__ == "__main__":
    main()
