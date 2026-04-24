#!/usr/bin/env python3
"""Convert .docx files from Risorse_test into LLM-friendly markdown.

Default behavior:
- Reads .docx files from ../../Risorse_test (relative to this script).
- Skips temporary Office lock files (~$...).
- Writes one markdown file per source document into this folder.

Usage:
  python convert_docx_for_llm.py
  python convert_docx_for_llm.py --input-dir /path/to/Risorse_test --output-dir /path/to/out
"""

from __future__ import annotations

import argparse
import re
import zipfile
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}


def iter_block_items(body: ET.Element) -> Iterable[ET.Element]:
    # Preserve document order across paragraphs and tables.
    for child in list(body):
        if child.tag in {f"{{{W_NS}}}p", f"{{{W_NS}}}tbl"}:
            yield child


def extract_runs_text(parent: ET.Element) -> str:
    parts: list[str] = []
    for node in parent.findall(".//w:t", NS):
        if node.text:
            parts.append(node.text)
    text = "".join(parts)
    # Normalize internal spaces but keep line semantics handled by caller.
    return re.sub(r"[ \t]+", " ", text).strip()


def paragraph_to_markdown(p: ET.Element) -> str | None:
    text = extract_runs_text(p)
    if not text:
        return None

    style_node = p.find("./w:pPr/w:pStyle", NS)
    style = style_node.get(f"{{{W_NS}}}val", "") if style_node is not None else ""

    # Basic heading detection by Word style name.
    if style.startswith("Heading"):
        level_str = style.replace("Heading", "")
        level = 2
        if level_str.isdigit():
            level = max(1, min(6, int(level_str)))
        return f"{'#' * level} {text}"

    # Basic list detection.
    if p.find("./w:pPr/w:numPr", NS) is not None:
        return f"- {text}"

    return text


def table_to_markdown(tbl: ET.Element) -> list[str]:
    rows: list[list[str]] = []
    for tr in tbl.findall("./w:tr", NS):
        cells: list[str] = []
        for tc in tr.findall("./w:tc", NS):
            cell_text = extract_runs_text(tc)
            cells.append(cell_text)
        if any(cell.strip() for cell in cells):
            rows.append(cells)

    if not rows:
        return []

    col_count = max(len(r) for r in rows)
    normalized = [r + [""] * (col_count - len(r)) for r in rows]

    header = normalized[0]
    sep = ["---"] * col_count

    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(sep) + " |",
    ]

    for row in normalized[1:]:
        lines.append("| " + " | ".join(row) + " |")

    return lines


def docx_to_markdown(docx_path: Path) -> str:
    with zipfile.ZipFile(docx_path) as zf:
        xml_bytes = zf.read("word/document.xml")

    root = ET.fromstring(xml_bytes)
    body = root.find("w:body", NS)
    if body is None:
        return ""

    lines: list[str] = []
    for block in iter_block_items(body):
        if block.tag == f"{{{W_NS}}}p":
            line = paragraph_to_markdown(block)
            if line is not None:
                lines.append(line)
                lines.append("")
        elif block.tag == f"{{{W_NS}}}tbl":
            table_lines = table_to_markdown(block)
            if table_lines:
                lines.extend(table_lines)
                lines.append("")

    # Collapse excessive blank lines.
    output = "\n".join(lines)
    output = re.sub(r"\n{3,}", "\n\n", output).strip()
    return output + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert DOCX files to LLM-friendly markdown")
    script_dir = Path(__file__).resolve().parent
    default_input = (script_dir / "../../.." / "Risorse_test").resolve()
    default_output = script_dir

    parser.add_argument("--input-dir", type=Path, default=default_input)
    parser.add_argument("--output-dir", type=Path, default=default_output)
    args = parser.parse_args()

    input_dir = args.input_dir.resolve()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    docx_files = sorted(
        p for p in input_dir.glob("*.docx") if not p.name.startswith("~$")
    )

    if not docx_files:
        print(f"No .docx files found in {input_dir}")
        return 1

    print(f"Found {len(docx_files)} docx files in {input_dir}")

    for src in docx_files:
        md_text = docx_to_markdown(src)
        out_name = src.stem + ".llm.md"
        out_path = output_dir / out_name
        out_path.write_text(md_text, encoding="utf-8")
        print(f"Written: {out_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
