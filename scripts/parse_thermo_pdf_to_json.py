#!/usr/bin/env python3
import argparse
import json
import re
from typing import Any, Dict, List, Optional


def _safe_float(s: str) -> Optional[float]:
    if s is None:
        return None
    t = str(s).strip()
    if not t:
        return None
    # Remove thousands separators and non-numeric trailing chars
    t = t.replace(",", "")
    t = re.sub(r"[^0-9+\-\.Ee]", "", t)
    try:
        return float(t)
    except Exception:
        return None


def _normalize_header(cell: str) -> str:
    return re.sub(r"\s+", " ", (cell or "").strip().lower())


def _extract_with_camelot(pdf_path: str) -> List[List[List[str]]]:
    try:
        import camelot
    except Exception:
        return []

    tables_cells: List[List[List[str]]] = []
    try:
        # Try lattice first (works on ruled tables)
        tables = camelot.read_pdf(pdf_path, pages="all", flavor="lattice")
        for t in tables:
            tables_cells.append(t.df.values.tolist())
        if not tables_cells:
            # Fallback to stream
            tables = camelot.read_pdf(pdf_path, pages="all", flavor="stream")
            for t in tables:
                tables_cells.append(t.df.values.tolist())
    except Exception:
        return tables_cells
    return tables_cells


def _extract_with_pdfplumber(pdf_path: str) -> List[List[List[str]]]:
    try:
        import pdfplumber
    except Exception:
        return []

    tables_cells: List[List[List[str]]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_tables: List[List[List[str]]] = []
            # Try multiple strategies in order of strictness
            strategies = [
                {"vertical_strategy": "lines", "horizontal_strategy": "lines"},
                {"vertical_strategy": "lines", "horizontal_strategy": "text"},
                {"vertical_strategy": "text", "horizontal_strategy": "text"},
            ]
            for ts in strategies:
                try:
                    page_tables = page.extract_tables(table_settings=ts)
                except Exception:
                    page_tables = []
                if page_tables:
                    break
            for tbl in page_tables or []:
                if not tbl:
                    continue
                normalized = [[(c if c is not None else "") for c in row] for row in tbl]
                tables_cells.append(normalized)
    return tables_cells


def _find_columns(header: List[str]) -> Dict[str, int]:
    # Return indices for the expected columns
    cols = {"formula": -1, "state": -1, "enthalpy": -1, "entropy": -1, "gibbs": -1}
    norm = [_normalize_header(h) for h in header]
    for i, h in enumerate(norm):
        if cols["formula"] == -1 and ("formula" in h or h == "species" or h == "name"):
            cols["formula"] = i
        if cols["state"] == -1 and ("state of matter" in h or h == "state" or "state" in h):
            cols["state"] = i
        if cols["enthalpy"] == -1 and ("enthalpy" in h):
            cols["enthalpy"] = i
        if cols["entropy"] == -1 and ("entropy" in h):
            cols["entropy"] = i
        if cols["gibbs"] == -1 and ("gibbs" in h or "free energy" in h):
            cols["gibbs"] = i
    return cols


def _rows_to_records(table: List[List[str]]) -> List[Dict[str, Any]]:
    if not table:
        return []
    header = table[0]
    cols = _find_columns(header)
    if cols["formula"] == -1:
        return []

    records: List[Dict[str, Any]] = []
    for row in table[1:]:
        if not any(cell and str(cell).strip() for cell in row):
            continue
        try:
            formula = row[cols["formula"]] if cols["formula"] >= 0 and cols["formula"] < len(row) else ""
            enthalpy = row[cols["enthalpy"]] if cols["enthalpy"] >= 0 and cols["enthalpy"] < len(row) else ""
            state = row[cols["state"]] if cols["state"] >= 0 and cols["state"] < len(row) else ""
            entropy = row[cols["entropy"]] if cols["entropy"] >= 0 and cols["entropy"] < len(row) else ""
            gibbs = row[cols["gibbs"]] if cols["gibbs"] >= 0 and cols["gibbs"] < len(row) else ""

            enthalpy_val = _safe_float(enthalpy)
            entropy_val = _safe_float(entropy)
            gibbs_val = _safe_float(gibbs)

            # Normalize state to phase when possible
            phase = ""
            st = (state or "").strip().lower()
            if st in {"(g)", "g", "gas"}: phase = "gas"
            elif st in {"(l)", "l", "liquid"}: phase = "liquid"
            elif st in {"(s)", "s", "solid"}: phase = "solid"
            elif "aq" in st: phase = "aqueous"

            record = {
                "common_name": "",  # PDF does not provide common names
                "structure": (formula or "").strip(),
                "enthalpy_of_formation_0K": "",  # not provided by this PDF
                "enthalpy_of_formation_298K": enthalpy_val if enthalpy_val is not None else "",
                "entropy_298K": entropy_val if entropy_val is not None else "",
                "gibbs_free_energy_298K": gibbs_val if gibbs_val is not None else "",
                "phase": phase,
                "uncertainty_value": "",
                "molecular_mass": "",
                "molecular_mass_uncertainty": "",
                "cas_rn": "",
                "relative_rank": "",
            }
            records.append(record)
        except Exception:
            # Skip malformed row
            continue
    return records


def parse_pdf_to_json(pdf_path: str) -> (List[Dict[str, Any]], List[str]):
    logs: List[str] = []
    # Try Camelot first
    tables = _extract_with_camelot(pdf_path)
    logs.append(f"camelot_tables={len(tables)}")
    if not tables:
        tables = _extract_with_pdfplumber(pdf_path)
        logs.append(f"pdfplumber_tables={len(tables)}")

    all_records: List[Dict[str, Any]] = []
    for tbl in tables:
        recs = _rows_to_records(tbl)
        all_records.extend(recs)
    logs.append(f"records_after_tables={len(all_records)}")
    # If still empty, attempt a basic text scrape as a last resort
    if not all_records:
        try:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    lines = [ln for ln in text.splitlines() if ln.strip()]
                    # Heuristic: detect rows that have at least 3 whitespace-separated numeric columns after a formula token
                    for ln in lines:
                        parts = re.split(r"\s{2,}", ln.strip())
                        if len(parts) < 3:
                            continue
                        # First part likely formula; last parts may contain numbers
                        nums = [p for p in parts[1:] if _safe_float(p) is not None]
                        if len(nums) >= 1:
                            record = {
                                "common_name": "",
                                "structure": parts[0],
                                "phase": "",
                                "enthalpy_of_formation_0K": "",
                                "enthalpy_of_formation_298K": _safe_float(nums[0]) or "",
                                "entropy_298K": _safe_float(nums[1]) if len(nums) > 1 else "",
                                "gibbs_free_energy_298K": _safe_float(nums[2]) if len(nums) > 2 else "",
                                "uncertainty_value": "",
                                "molecular_mass": "",
                                "molecular_mass_uncertainty": "",
                                "cas_rn": "",
                                "relative_rank": "",
                            }
                            all_records.append(record)
            logs.append(f"records_after_text_scrape={len(all_records)}")
        except Exception:
            logs.append("text_scrape_failed")
    return all_records, logs


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse thermodynamic PDF to chem-engine JSON schema")
    parser.add_argument("input_pdf", help="Path to the PDF file")
    parser.add_argument("output_json", help="Path to write JSON output")
    parser.add_argument("-v", "--verbose", action="store_true", help="Print debug info to stdout")
    parser.add_argument("-d", "--debug", action="store_true", help="Print first few lines of each page for debugging")
    args = parser.parse_args()

    data, logs = parse_pdf_to_json(args.input_pdf)
    if args.debug:
        try:
            import pdfplumber
            with pdfplumber.open(args.input_pdf) as pdf:
                for i, page in enumerate(pdf.pages[:3]):  # First 3 pages
                    text = page.extract_text() or ""
                    lines = [ln.strip() for ln in text.splitlines() if ln.strip()][:10]  # First 10 lines
                    print(f"=== PAGE {i+1} ===")
                    for j, line in enumerate(lines):
                        print(f"{j+1:2d}: {line}")
                    print()
        except Exception as e:
            print(f"Debug failed: {e}")
    with open(args.output_json, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    if args.verbose:
        print("; ".join(logs))


if __name__ == "__main__":
    main()


