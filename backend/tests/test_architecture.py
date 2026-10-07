"""Layer boundaries: presentation -> application -> data, domain shared."""
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORBIDDEN = {
    "presentation": {"data"},
    "application": {"presentation"},
    "data": {"application", "presentation"},
    "domain": {"data", "application", "presentation"},
}


def imported_top_modules(path: Path) -> set[str]:
    mods = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            mods |= {a.name.split(".")[0] for a in node.names}
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            mods.add(node.module.split(".")[0])
    return mods


def test_layer_imports():
    violations = []
    for layer, banned in FORBIDDEN.items():
        for f in (ROOT / layer).rglob("*.py"):
            bad = imported_top_modules(f) & banned
            if bad:
                violations.append(f"{f.relative_to(ROOT)} imports {sorted(bad)}")
    assert not violations, violations


def test_presentation_does_not_import_data_explicitly():
    for f in (ROOT / "presentation").rglob("*.py"):
        assert "data" not in imported_top_modules(f), f
