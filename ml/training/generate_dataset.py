"""
RiskShield AI — Synthetic Transaction Dataset Generator
--------------------------------------------------------
Creates a realistic, purely SYNTHETIC payment transaction dataset for demo
and model-training purposes. No real people, accounts, or payment
instruments are used anywhere in this file.

Design goals (see project spec, section "Synthetic Dataset"):
  * 1,000-5,000 transactions, generated per-customer in time order so that
    velocity / device-history / location-history fields are internally
    consistent (not just random noise).
  * High-risk transactions generally combine several signals (amount
    deviation + new device + new location + velocity + failed attempts),
    but the dataset is deliberately NOT perfectly separable: some normal
    transactions have a harmless "new device" (a customer's new phone),
    and some risky transactions are missing one or two of the usual flags.

Output: ml/training/data/synthetic_transactions.csv
"""

import csv
import os
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta

random.seed(42)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "synthetic_transactions.csv")

NUM_CUSTOMERS = 220
NOW = datetime(2026, 8, 23, 12, 0, 0)
LOOKBACK_DAYS = 120

LOCATIONS = [
    "Hyderabad", "Bengaluru", "Mumbai", "Delhi", "Chennai", "Pune",
    "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Chandigarh", "Lucknow",
    "Visakhapatnam", "Nagpur", "Indore", "Surat",
]
IP_REGION_BY_LOCATION = {
    "Hyderabad": "IN-TG", "Bengaluru": "IN-KA", "Mumbai": "IN-MH", "Delhi": "IN-DL",
    "Chennai": "IN-TN", "Pune": "IN-MH", "Kolkata": "IN-WB", "Ahmedabad": "IN-GJ",
    "Jaipur": "IN-RJ", "Kochi": "IN-KL", "Chandigarh": "IN-CH", "Lucknow": "IN-UP",
    "Visakhapatnam": "IN-AP", "Nagpur": "IN-MH", "Indore": "IN-MP", "Surat": "IN-GJ",
}
UNUSUAL_LOCATIONS = ["Unknown Region", "VPN Exit Node (SG)", "VPN Exit Node (NL)", "Unregistered ISP Block"]

MERCHANT_POOL = [
    ("MER-1001", "QuickCart Store", "e-commerce"),
    ("MER-1002", "Metro Grocers", "groceries"),
    ("MER-1003", "StreamPlay Subscriptions", "entertainment"),
    ("MER-1004", "UrbanEats Delivery", "food_delivery"),
    ("MER-1005", "CityRide Cabs", "transport"),
    ("MER-1006", "BrightGadgets Electronics", "electronics"),
    ("MER-1007", "PrimeFashion Apparel", "fashion"),
    ("MER-1008", "SkyLine Airlines", "travel"),
    ("MER-1009", "HomeStay Bookings", "travel"),
    ("MER-1010", "PowerFit Gym Memberships", "fitness"),
    ("MER-1011", "MediCare Pharmacy", "healthcare"),
    ("MER-1012", "BrightBooks Reading Store", "retail"),
    ("MER-1013", "FreshMart Supermarket", "groceries"),
    ("MER-1014", "PixelPlay Game Store", "entertainment"),
    ("MER-1015", "TopUp Wallet Recharge", "utilities"),
    ("MER-1016", "GreenLeaf Utilities", "utilities"),
    ("MER-1017", "SwiftCourier Services", "logistics"),
    ("MER-1018", "LuxeStay Hotels", "travel"),
    ("MER-1019", "OneClick Electronics Mart", "electronics"),
    ("MER-1020", "DailyFresh Essentials", "groceries"),
]

PAYMENT_METHODS = ["upi", "card", "netbanking", "wallet"]
PAYMENT_METHOD_WEIGHTS = [0.5, 0.28, 0.12, 0.10]

# Device IDs must be globally unique (the database enforces this, just like a
# real device fingerprint or IMEI would be). A plain random number can
# coincidentally repeat across different customers, so we use a simple
# incrementing counter instead — guaranteed unique, every time.
_device_counter = 10000


def next_device_id() -> str:
    global _device_counter
    _device_counter += 1
    return f"DEV-{_device_counter}"


@dataclass
class Customer:
    customer_id: str
    account_created: datetime
    home_location: str
    home_device: str
    baseline_amount: float
    profile: str  # "clean" | "occasional_risk" | "high_risk"
    known_devices: set = field(default_factory=set)
    known_locations: set = field(default_factory=set)
    device_first_seen: dict = field(default_factory=dict)


def make_customers(n):
    customers = []
    profiles = (
        ["clean"] * int(n * 0.82)
        + ["occasional_risk"] * int(n * 0.12)
        + ["high_risk"] * (n - int(n * 0.82) - int(n * 0.12))
    )
    random.shuffle(profiles)

    for i in range(n):
        cust_id = f"CUST-{1000 + i}"
        account_age_days = random.choice(
            [random.randint(0, 6), random.randint(7, 30), random.randint(31, 180), random.randint(181, 1800)]
        )
        account_created = NOW - timedelta(days=account_age_days)
        home_location = random.choice(LOCATIONS)
        home_device = next_device_id()
        # Log-ish spread of "typical" spend per customer
        baseline_amount = round(random.choice([
            random.uniform(200, 800),
            random.uniform(800, 2500),
            random.uniform(2500, 6000),
            random.uniform(6000, 20000),
        ]), 2)
        cust = Customer(
            customer_id=cust_id,
            account_created=account_created,
            home_location=home_location,
            home_device=home_device,
            baseline_amount=baseline_amount,
            profile=profiles[i],
        )
        cust.known_devices.add(home_device)
        cust.known_locations.add(home_location)
        cust.device_first_seen[home_device] = max(account_created, NOW - timedelta(days=LOOKBACK_DAYS))
        customers.append(cust)
    return customers


def gen_timestamps(customer: Customer):
    """Generate a plausible, time-ordered list of transaction timestamps for one customer."""
    txn_count = {
        "clean": random.randint(4, 30),
        "occasional_risk": random.randint(6, 25),
        "high_risk": random.randint(5, 22),
    }[customer.profile]

    start = max(customer.account_created, NOW - timedelta(days=LOOKBACK_DAYS))
    span_days = max(1, (NOW - start).days)

    timestamps = []
    i = 0
    while i < txn_count:
        offset_days = random.uniform(0, span_days)
        ts = start + timedelta(days=offset_days, hours=random.uniform(0, 24))
        timestamps.append(ts)
        i += 1

    # Occasionally cluster a burst of transactions close together (velocity pattern),
    # more likely for occasional_risk / high_risk profiles.
    burst_chance = {"clean": 0.05, "occasional_risk": 0.35, "high_risk": 0.55}[customer.profile]
    if random.random() < burst_chance and len(timestamps) >= 2:
        anchor = random.choice(timestamps)
        burst_size = random.randint(2, 6)
        for _ in range(burst_size):
            timestamps.append(anchor + timedelta(minutes=random.uniform(0.5, 9)))

    timestamps.sort()
    return timestamps


def decide_label(customer: Customer):
    """Decide the ground-truth label for one transaction based on customer profile,
    with randomness so the dataset is not perfectly separable."""
    roll = random.random()
    if customer.profile == "clean":
        return "fraud" if roll < 0.005 else ("suspicious" if roll < 0.03 else "normal")
    if customer.profile == "occasional_risk":
        return "fraud" if roll < 0.06 else ("suspicious" if roll < 0.28 else "normal")
    # high_risk
    return "fraud" if roll < 0.30 else ("suspicious" if roll < 0.55 else "normal")


def build_transaction(customer: Customer, ts: datetime, label: str, all_customer_ts):
    is_new_device = False
    is_new_location = False
    device_id = customer.home_device
    location = customer.home_location

    # -- Device selection -----------------------------------------------
    device_roll = random.random()
    if label == "normal":
        if device_roll < 0.06:  # benign new device (e.g. got a new phone)
            device_id = next_device_id()
            is_new_device = True
        else:
            device_id = random.choice(list(customer.known_devices))
    elif label == "suspicious":
        if device_roll < 0.55:
            device_id = next_device_id()
            is_new_device = True
        else:
            device_id = random.choice(list(customer.known_devices))
    else:  # fraud
        if device_roll < 0.80:
            device_id = next_device_id()
            is_new_device = True
        else:
            device_id = random.choice(list(customer.known_devices))

    if is_new_device or device_id not in customer.device_first_seen:
        customer.device_first_seen.setdefault(device_id, ts)
    customer.known_devices.add(device_id)
    device_age_days = max(0, (ts - customer.device_first_seen[device_id]).days)

    # -- Location selection -----------------------------------------------
    location_roll = random.random()
    if label == "normal":
        if location_roll < 0.04:
            location = random.choice([l for l in LOCATIONS if l != customer.home_location])
            is_new_location = location not in customer.known_locations
        else:
            location = customer.home_location
    elif label == "suspicious":
        if location_roll < 0.45:
            location = random.choice([l for l in LOCATIONS if l != customer.home_location] + UNUSUAL_LOCATIONS[:1])
            is_new_location = location not in customer.known_locations
        else:
            location = customer.home_location
    else:  # fraud
        if location_roll < 0.70:
            location = random.choice(UNUSUAL_LOCATIONS + [l for l in LOCATIONS if l != customer.home_location])
            is_new_location = location not in customer.known_locations
        else:
            location = customer.home_location
    customer.known_locations.add(location)
    ip_region = IP_REGION_BY_LOCATION.get(location, "XX-UNK")

    # -- Amount -------------------------------------------------------------
    base = customer.baseline_amount
    if label == "normal":
        amount = max(50, random.gauss(base, base * 0.35))
    elif label == "suspicious":
        multiplier = random.uniform(2.5, 5.5)
        amount = max(200, random.gauss(base * multiplier, base * 0.5))
    else:  # fraud
        multiplier = random.uniform(3.5, 10)
        amount = max(500, random.gauss(base * multiplier, base * 0.8))
    amount = round(amount, 2)

    # -- Failed attempts & velocity ------------------------------------------
    if label == "normal":
        failed_attempts = random.choices([0, 1, 2], weights=[0.88, 0.10, 0.02])[0]
    elif label == "suspicious":
        failed_attempts = random.choices([0, 1, 2, 3, 4], weights=[0.35, 0.25, 0.2, 0.12, 0.08])[0]
    else:
        failed_attempts = random.choices([0, 2, 3, 4, 5, 6, 7], weights=[0.15, 0.15, 0.2, 0.2, 0.15, 0.1, 0.05])[0]

    window_10min = sum(1 for t in all_customer_ts if abs((t - ts).total_seconds()) <= 600)
    window_24h = sum(1 for t in all_customer_ts if abs((t - ts).total_seconds()) <= 86400)

    # -- Account age at time of transaction ----------------------------------
    account_age_days = max(0, (ts - customer.account_created).days)

    # -- Historical average (as known *before* this transaction) ------------
    historical_avg = round(customer.baseline_amount, 2)

    payment_method = random.choices(PAYMENT_METHODS, weights=PAYMENT_METHOD_WEIGHTS)[0]

    # previous_device / previous_location filled in by caller (needs order)
    return {
        "timestamp": ts,
        "customer_id": customer.customer_id,
        "amount": amount,
        "currency": "INR",
        "payment_method": payment_method,
        "device_id": device_id,
        "location": location,
        "ip_region": ip_region,
        "account_age_days": account_age_days,
        "failed_attempts": failed_attempts,
        "transactions_last_10min": window_10min,
        "transactions_last_24h": window_24h,
        "historical_avg_amount": historical_avg,
        "device_age_days": device_age_days,
        "is_new_device": is_new_device,
        "is_new_location": is_new_location,
        "risk_label": label,
    }


def generate():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    customers = make_customers(NUM_CUSTOMERS)

    rows = []
    txn_counter = 100001
    for customer in customers:
        timestamps = gen_timestamps(customer)
        labels = [decide_label(customer) for _ in timestamps]

        prev_device = None
        prev_location = None
        built = []
        for ts, label in zip(timestamps, labels):
            row = build_transaction(customer, ts, label, timestamps)
            row["previous_device"] = prev_device
            row["previous_location"] = prev_location
            built.append(row)
            prev_device = row["device_id"]
            prev_location = row["location"]

        for row in built:
            merchant_id, merchant_name, _category = random.choice(MERCHANT_POOL)
            rows.append({
                "transaction_id": f"TXN-{txn_counter}",
                "customer_id": row["customer_id"],
                "merchant_id": merchant_id,
                "merchant_name": merchant_name,
                "amount": row["amount"],
                "currency": row["currency"],
                "timestamp": row["timestamp"].isoformat(),
                "device_id": row["device_id"],
                "location": row["location"],
                "ip_region": row["ip_region"],
                "payment_method": row["payment_method"],
                "account_age_days": row["account_age_days"],
                "failed_attempts": row["failed_attempts"],
                "transactions_last_10min": row["transactions_last_10min"],
                "transactions_last_24h": row["transactions_last_24h"],
                "historical_avg_amount": row["historical_avg_amount"],
                "device_age_days": row["device_age_days"],
                "is_new_device": row["is_new_device"],
                "is_new_location": row["is_new_location"],
                "previous_location": row["previous_location"] or "",
                "previous_device": row["previous_device"] or "",
                "risk_label": row["risk_label"],
            })
            txn_counter += 1

    rows.sort(key=lambda r: r["timestamp"])

    fieldnames = list(rows[0].keys())
    with open(OUTPUT_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    label_counts = {}
    for r in rows:
        label_counts[r["risk_label"]] = label_counts.get(r["risk_label"], 0) + 1

    print(f"Generated {len(rows)} synthetic transactions -> {OUTPUT_PATH}")
    print(f"Customers: {len(customers)}")
    print(f"Label distribution: {label_counts}")


if __name__ == "__main__":
    generate()
