"""
webapp-testing: página dinámica — admin/citas.html

admin/citas.html llama a Supabase por fetch(), lo cual falla bajo
file:// por CORS. Por eso necesita servirse por HTTP real — corre este
script a través de with_server.py, no directamente.

Uso:
    python3 .agents/skills/webapp-testing/scripts/with_server.py \\
      --server "python3 -m http.server 8899" --port 8899 \\
      -- python3 tests/test_admin.py
"""
import os
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output')
URL = 'http://localhost:8899/admin/citas.html'


def run():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    console_logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 900, 'height': 700})

        page.on('console', lambda msg: console_logs.append(f'[{msg.type}] {msg.text}'))
        page.on('pageerror', lambda err: console_logs.append(f'[pageerror] {err}'))

        page.goto(URL)
        page.wait_for_load_state('networkidle')  # crítico: esperar a que corra el JS

        print(f"Título: {page.title()}")
        print(f"Encabezado visible: {page.locator('h1, h2').first.text_content()}")

        page.screenshot(path=os.path.join(OUTPUT_DIR, 'admin.png'))

        browser.close()

    cors_errors = [l for l in console_logs if 'CORS' in l or 'Failed to fetch' in l]
    if cors_errors:
        print(f"\nFALLÓ: errores de CORS/fetch: {cors_errors}")
        raise SystemExit(1)

    print("\nOK: sin errores de CORS/fetch (el servidor real evita el problema de file://)")
    print(f"Total mensajes de consola: {len(console_logs)}")


if __name__ == '__main__':
    run()
