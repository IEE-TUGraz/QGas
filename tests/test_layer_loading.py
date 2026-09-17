"""Run with python -m unittest discover -s tests (no GUI dependencies)."""
import ast
import http.server
import json
from pathlib import Path
import socket
import socketserver
import threading
import tempfile
import unittest
from functools import partial
from urllib.error import HTTPError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]


def server_class():
    tree = ast.parse((ROOT / 'Server.py').read_text(encoding='utf-8'))
    gui = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == 'CombinedGUI')
    server = next(node for node in gui.body if isinstance(node, ast.ClassDef) and node.name == 'ReusableTCPServer')
    namespace = {'socketserver': socketserver}
    exec(compile(ast.Module(body=[server], type_ignores=[]), 'Server.py', 'exec'), namespace)
    return namespace['ReusableTCPServer']


class LayerServerTests(unittest.TestCase):
    def test_optional_discovery_preserves_real_resource_errors(self):
        tree = ast.parse((ROOT / 'Server.py').read_text(encoding='utf-8'))
        handler_node = next(node for node in ast.walk(tree)
                            if isinstance(node, ast.ClassDef) and node.name == 'OptimizedHandler')
        method = next(node for node in handler_node.body
                      if isinstance(node, ast.FunctionDef) and node.name == 'do_GET')
        # Compile the real request routing inside a minimal handler class.
        handler_node.body = [method]
        import os
        namespace = {'http': __import__('http'), 'os': os}
        exec(compile(ast.Module(body=[handler_node], type_ignores=[]), 'Server.py', 'exec'), namespace)
        handler = namespace['OptimizedHandler']
        handler.log_message = lambda *args: None
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory) / 'Input' / 'project' / 'plans'
            folder.mkdir(parents=True)
            (folder / 'manifest.json').write_text('{"plans": []}')
            with server_class()(('127.0.0.1', 0), partial(handler, directory=directory)) as server:
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                base = f'http://127.0.0.1:{server.server_address[1]}'
                try:
                    for path in ['Input/project/Short_Pipes.geojson', 'Input/project/plans/missing.json', 'Input/missing/']:
                        with urlopen(f'{base}/{path}?optional=1') as response:
                            self.assertEqual(response.status, 204)
                            self.assertEqual(response.read(), b'')
                    with urlopen(f'{base}/Input/project/plans/manifest.json?optional=1') as response:
                        self.assertEqual(json.load(response), {'plans': []})
                    with urlopen(f'{base}/Input/project/plans/?optional=1') as response:
                        self.assertEqual(response.status, 200)
                    for path in ['Input/project/missing.json', 'missing.json?optional=1']:
                        with self.assertRaises(HTTPError) as error:
                            urlopen(f'{base}/{path}')
                        self.assertEqual(error.exception.code, 404)
                finally:
                    server.shutdown()
                    thread.join(2)

    def test_idle_browser_connection_does_not_block_layer_request(self):
        accepted = threading.Event()

        class Handler(http.server.BaseHTTPRequestHandler):
            def handle(self):
                accepted.set()
                super().handle()

            def do_GET(self):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'layer data')

            def log_message(self, *args):
                pass

        with server_class()(('127.0.0.1', 0), Handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            idle = socket.create_connection(server.server_address)
            try:
                self.assertTrue(accepted.wait(2))
                host, port = server.server_address
                with urlopen(f'http://{host}:{port}/productions.geojson', timeout=2) as response:
                    self.assertEqual(response.read(), b'layer data')
            finally:
                idle.close()
                server.shutdown()
                thread.join(2)

    def test_production_data_has_valid_point_coordinates(self):
        path = ROOT / 'Input/European_Gas_Dataset_approximated_comparison/productions.geojson'
        if not path.exists():
            self.skipTest('Optional comparison dataset is not installed')
        data = json.loads(path.read_text(encoding='utf-8'))
        self.assertGreater(len(data['features']), 0)
        for feature in data['features']:
            geometry = feature['geometry']
            self.assertEqual(geometry['type'], 'Point')
            longitude, latitude = geometry['coordinates']
            self.assertTrue(-180 <= longitude <= 180)
            self.assertTrue(-90 <= latitude <= 90)


if __name__ == '__main__':
    unittest.main()
