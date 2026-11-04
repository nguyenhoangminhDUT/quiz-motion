import ast
from pathlib import Path


def test_inner_layers_do_not_import_frameworks_or_adapters() -> None:
    root = Path(__file__).resolve().parents[2] / "app"
    for layer in ("domain", "application"):
        for file in (root / layer).rglob("*.py"):
            imports = []
            for node in ast.walk(ast.parse(file.read_text(encoding="utf-8"))):
                if isinstance(node, ast.Import):
                    imports.extend(alias.name for alias in node.names)
                elif isinstance(node, ast.ImportFrom) and node.module:
                    imports.append(node.module)
            for imported in imports:
                assert not imported.startswith(
                    ("fastapi", "sqlalchemy", "pydantic", "app.infrastructure", "app.presentation")
                ), (file, imported)
