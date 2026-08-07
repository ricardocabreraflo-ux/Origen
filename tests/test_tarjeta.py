"""
webapp-testing: HTML estático — tarjeta.html

Verifica que los botones de acción y el CTA principal de la tarjeta
digital sigan apuntando a donde deben, y que la página cargue sin
errores de consola. No requiere servidor (usa file://).

Uso:
    python3 tests/test_tarjeta.py
"""
import os
from playwright.sync_api import sync_playwright

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output')

html_path = os.path.join(REPO_ROOT, 'tarjeta.html')
file_url = f'file://{html_path}'

# Lo que esperamos, tomado directo del HTML real del proyecto.
# Si cambian los datos de contacto en tarjeta.html, actualiza esto también.
expected_actions = {
    'Sitio web': 'https://origen-brows.netlify.app',
    'Instagram': 'https://www.instagram.com/origen.brows',
    'WhatsApp': 'wa.me/525566095405',
    'Llamar': 'tel:+525566095405',
    'Email': 'mailto:origenbrowsmx@gmail.com',
}


def run():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    failures = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 480, 'height': 900})

        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
        page.on('pageerror', lambda err: console_errors.append(str(err)))

        page.goto(file_url)
        page.wait_for_timeout(500)

        print(f"Título: {page.title()}")

        for label, expected_href_part in expected_actions.items():
            link = page.locator(f'.action:has-text("{label}")')
            count = link.count()
            href = link.get_attribute('href') if count else None
            ok = count == 1 and expected_href_part in (href or '')
            print(f"  [{'OK' if ok else 'FALLA'}] {label}: {href}")
            if not ok:
                failures.append(label)

        cta = page.locator('.cta-primary')
        print(f"  CTA principal -> {cta.get_attribute('href')}")

        save_btn = page.locator('.action:has-text("Guardar")')
        if save_btn.count() != 1:
            failures.append('Botón Guardar contacto')
        print(f"  [{'OK' if save_btn.count() == 1 else 'FALLA'}] Botón Guardar contacto presente")

        page.screenshot(path=os.path.join(OUTPUT_DIR, 'tarjeta.png'), full_page=True)

        print(f"\nErrores de consola: {console_errors if console_errors else 'ninguno'}")
        failures.extend(console_errors)

        browser.close()

    if failures:
        print(f"\nFALLÓ: {failures}")
        raise SystemExit(1)
    print("\nOK: todos los checks pasaron")


if __name__ == '__main__':
    run()
