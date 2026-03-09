import json
import sqlite3
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent
DB_PATH = ROOT / "pos.db"

MENU_ITEMS = [
    {"id": 1, "name": "Bombay Sandwich", "price": 60.00, "category": "food", "imageEmoji": "🥪"},
    {"id": 2, "name": "Virgin Mint Mojito", "price": 45.00, "category": "drinks", "imageEmoji": "🍃"},
    {"id": 3, "name": "Bhel Puri", "price": 50.00, "category": "food", "imageEmoji": "🥣"},
    {"id": 4, "name": "Blue Curaçao Mojito", "price": 70.00, "category": "drinks", "imageEmoji": "🍹"},
    {"id": 5, "name": "Paneer Tikka Sandwich", "price": 75.00, "category": "food", "imageEmoji": "🧀"},
    {"id": 6, "name": "Veggie Maggi Noodles", "price": 40.00, "category": "food", "imageEmoji": "🍜"},
    {"id": 7, "name": "Aloo Tikki Chaat", "price": 55.00, "category": "food", "imageEmoji": "🥔"},
    {"id": 8, "name": "Masala Fries", "price": 45.00, "category": "food", "imageEmoji": "🍟"},
    {"id": 9, "name": "Sweet Corn Chaat", "price": 50.00, "category": "food", "imageEmoji": "🌽"},
    {"id": 10, "name": "Mini Samosas (4 pcs)", "price": 40.00, "category": "food", "imageEmoji": "🥟"},
    {"id": 11, "name": "Veg Cutlet (2 pcs)", "price": 50.00, "category": "food", "imageEmoji": "🥕"},
    {"id": 12, "name": "Chilli Cheese Toast", "price": 65.00, "category": "food", "imageEmoji": "🌶️"},
    {"id": 13, "name": "Sprout Salad Bhel", "price": 55.00, "category": "food", "imageEmoji": "🌱"},
    {"id": 14, "name": "Dahi Puri (6 pcs)", "price": 60.00, "category": "food", "imageEmoji": "🍥"},
    {"id": 15, "name": "Fresh Lime Soda", "price": 35.00, "category": "drinks", "imageEmoji": "🍋"},
    {"id": 16, "name": "Masala Chai", "price": 25.00, "category": "drinks", "imageEmoji": "☕"},
    {"id": 17, "name": "Classic Cold Coffee", "price": 60.00, "category": "drinks", "imageEmoji": "🧋"},
    {"id": 18, "name": "Watermelon Juice", "price": 50.00, "category": "drinks", "imageEmoji": "🍉"},
    {"id": 19, "name": "Mango Lassi", "price": 65.00, "category": "drinks", "imageEmoji": "🥭"},
    {"id": 20, "name": "Jaljeera Cooler", "price": 30.00, "category": "drinks", "imageEmoji": "🌿"},
]

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS order_counter (
            id INTEGER PRIMARY KEY CHECK(id = 1),
            next_display_number INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO order_counter (id, next_display_number) VALUES (1, 1);

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            display_order_number INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            subtotal REAL NOT NULL,
            tax_amount REAL NOT NULL,
            total_amount REAL NOT NULL,
            preparation_status TEXT NOT NULL,
            payment_status TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            menu_item_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
        );
        """
    )
    conn.commit()
    conn.close()

def fetch_orders():
    conn = get_conn()
    orders = conn.execute("SELECT * FROM orders ORDER BY datetime(timestamp) DESC").fetchall()
    result = []
    for row in orders:
        items = conn.execute("SELECT menu_item_id, name, price, quantity FROM order_items WHERE order_id = ?", (row["id"],)).fetchall()
        result.append({
            "orderId": row["id"],
            "displayOrderNumber": row["display_order_number"],
            "timestamp": row["timestamp"],
            "subtotal": row["subtotal"],
            "taxAmount": row["tax_amount"],
            "totalAmount": row["total_amount"],
            "preparationStatus": row["preparation_status"],
            "paymentStatus": row["payment_status"],
            "items": [
                {
                    "id": i["menu_item_id"],
                    "name": i["name"],
                    "price": i["price"],
                    "quantity": i["quantity"],
                }
                for i in items
            ],
        })
    conn.close()
    return result

class POSHandler(SimpleHTTPRequestHandler):
    def _write_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if not length:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/menu":
            return self._write_json(MENU_ITEMS)
        if path == "/api/next-order-number":
            conn = get_conn()
            number = conn.execute("SELECT next_display_number FROM order_counter WHERE id = 1").fetchone()["next_display_number"]
            conn.close()
            return self._write_json({"nextOrderNumber": number})
        if path == "/api/orders":
            return self._write_json(fetch_orders())
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/api/orders":
            return self._write_json({"error": "Not found"}, 404)

        data = self._read_json()
        items = data.get("items") or []
        if not items:
            return self._write_json({"error": "Order must include items"}, 400)

        subtotal = sum(float(item["price"]) * int(item["quantity"]) for item in items)
        tax_amount = 0
        total_amount = subtotal + tax_amount
        now = datetime.now().isoformat()

        conn = get_conn()
        cur = conn.cursor()
        display_number = cur.execute("SELECT next_display_number FROM order_counter WHERE id = 1").fetchone()["next_display_number"]
        cur.execute(
            """
            INSERT INTO orders (display_order_number, timestamp, subtotal, tax_amount, total_amount, preparation_status, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (display_number, now, subtotal, tax_amount, total_amount, "Pending", "Unpaid"),
        )
        order_id = cur.lastrowid
        for item in items:
            cur.execute(
                "INSERT INTO order_items (order_id, menu_item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
                (order_id, item["id"], item["name"], float(item["price"]), int(item["quantity"])),
            )
        cur.execute("UPDATE order_counter SET next_display_number = next_display_number + 1 WHERE id = 1")
        conn.commit()
        next_number = cur.execute("SELECT next_display_number FROM order_counter WHERE id = 1").fetchone()["next_display_number"]
        conn.close()

        self._write_json({"orderId": order_id, "displayOrderNumber": display_number, "nextOrderNumber": next_number}, 201)

    def do_PATCH(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/orders/") or not path.endswith("/status"):
            return self._write_json({"error": "Not found"}, 404)
        try:
            order_id = int(path.split("/")[3])
        except (ValueError, IndexError):
            return self._write_json({"error": "Invalid order id"}, 400)

        data = self._read_json()
        status_type = data.get("statusType")
        new_status = data.get("newStatus")
        col = None
        if status_type == "preparationStatus":
            col = "preparation_status"
        elif status_type == "paymentStatus":
            col = "payment_status"
        if not col or not new_status:
            return self._write_json({"error": "Invalid status update"}, 400)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE orders SET {col} = ? WHERE id = ?", (new_status, order_id))
        changed = cur.rowcount
        conn.commit()
        conn.close()
        if changed == 0:
            return self._write_json({"error": "Order not found"}, 404)
        return self._write_json({"success": True})

    def do_DELETE(self):
        path = urlparse(self.path).path
        conn = get_conn()
        cur = conn.cursor()
        if path == "/api/orders":
            cur.execute("DELETE FROM order_items")
            cur.execute("DELETE FROM orders")
            conn.commit()
            conn.close()
            return self._write_json({"success": True})
        if path.startswith("/api/orders/"):
            try:
                order_id = int(path.split("/")[3])
            except (ValueError, IndexError):
                conn.close()
                return self._write_json({"error": "Invalid order id"}, 400)
            cur.execute("DELETE FROM order_items WHERE order_id = ?", (order_id,))
            cur.execute("DELETE FROM orders WHERE id = ?", (order_id,))
            changed = cur.rowcount
            conn.commit()
            conn.close()
            if changed == 0:
                return self._write_json({"error": "Order not found"}, 404)
            return self._write_json({"success": True})
        conn.close()
        return self._write_json({"error": "Not found"}, 404)

if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", 8000), POSHandler)
    print("POS server running on http://localhost:8000")
    server.serve_forever()
