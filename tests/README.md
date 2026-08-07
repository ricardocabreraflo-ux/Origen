# Tests

Pruebas de UI con Playwright (skill `webapp-testing`). Requiere `pip install
playwright` — usa la versión que coincida con el Chromium ya instalado en tu
entorno, o corre `playwright install chromium` si no tienes uno.

## Páginas estáticas (sin servidor)

```bash
python3 tests/test_tarjeta.py
```

## Páginas que llaman a una API (necesitan servidor real, por CORS)

```bash
python3 .agents/skills/webapp-testing/scripts/with_server.py \
  --server "python3 -m http.server 8899" --port 8899 \
  -- python3 tests/test_admin.py
```

Las capturas de cada corrida quedan en `tests/output/` (no se versiona).
