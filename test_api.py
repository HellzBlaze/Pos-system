import json
import os
import tempfile
import threading
import time
import unittest
from urllib import request

import server
from http.server import ThreadingHTTPServer


class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        server.DB_PATH = os.path.join(cls.tmp.name, "test.db")
        server.init_db()
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 8011), server.POSHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.tmp.cleanup()

    def _json(self, path, method='GET', payload=None):
        data = None
        headers = {}
        if payload is not None:
            data = json.dumps(payload).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        req = request.Request(f'http://127.0.0.1:8011{path}', data=data, method=method, headers=headers)
        with request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))

    def test_create_and_list_order(self):
        status, number = self._json('/api/next-order-number')
        self.assertEqual(status, 200)
        self.assertEqual(number['nextOrderNumber'], 1)

        status, _ = self._json('/api/orders', 'POST', {
            'items': [{"id": 1, "name": "Bombay Sandwich", "price": 60, "quantity": 2}]
        })
        self.assertEqual(status, 201)

        status, orders = self._json('/api/orders')
        self.assertEqual(status, 200)
        self.assertEqual(len(orders), 1)
        self.assertEqual(orders[0]['totalAmount'], 120)


if __name__ == '__main__':
    unittest.main()
