#!/usr/bin/env python3
import argparse
import json
import re
from typing import Any, Dict, List, Optional, Tuple


def _safe_float(value: str) -> Optional[float]:
    try:
        return float(value)
    except Exception:
        return None


def _split_cas_and_relative(token: str) -> Tuple[Optional[str], Optional[int]]:
    token = token.strip()
    if "*" in token:
        cas, rel = token.split("*", 1)
        try:
            return cas.strip() or None, int(rel.strip())
        except Exception:
            return cas.strip() or None, None
    # Sometimes CAS may be missing; try to detect a CAS-like pattern
    if re.match(r"^\d{2,7}-\d{2}-\d$", token):
        return token, None
    return None, None


def _tokenize_loose(text: str) -> List[str]:
    # Split on any whitespace; keep tokens like "±" and numbers intact
    raw = re.split(r"\s+", text.strip())
    tokens: List[str] = []
    for t in raw:
        if not t:
            continue
        # Separate trailing/leading ± if glued
        if t != "±" and "±" in t:
            # split on the first occurrence but keep numbers
            parts = re.split(r"(±)", t)
            for p in parts:
                if p is None or p == "":
                    continue
                tokens.append(p)
        else:
            tokens.append(t)
    return tokens


def parse_record(line1: str, line2: str) -> Optional[Dict[str, Any]]:
    species_name = line1.strip() or None
    tokens = _tokenize_loose(line2)
    if not tokens:
        return None

    idx = 0
    structure: Optional[str] = None

    # Determine if first token is a structure or a number
    first_is_number = _safe_float(tokens[0]) is not None
    if not first_is_number:
        structure = tokens[0]
        idx = 1

    # Next two floats: dH0 and dH298 (in the source order it's 0K then 298K)
    dH0: Optional[float] = None
    dH298: Optional[float] = None
    if idx < len(tokens):
        dH0 = _safe_float(tokens[idx]); idx += 1
    if idx < len(tokens):
        dH298 = _safe_float(tokens[idx]); idx += 1

    # Uncertainty
    uncertainty_kind: Optional[str] = None
    uncertainty_value: Optional[float] = None
    units: Optional[str] = None

    if idx < len(tokens):
        tok = tokens[idx]
        if tok.lower() == "exact":
            uncertainty_kind = "exact"
            idx += 1
        else:
            # Expect ± and a value (either glued or next token)
            if tok == "±":
                idx += 1
                if idx < len(tokens):
                    val = _safe_float(tokens[idx])
                    if val is not None:
                        uncertainty_kind = "numeric"
                        uncertainty_value = val
                        idx += 1
            elif tok.startswith("±"):
                m = re.search(r"±\s*([-+]?\d+(?:\.\d+)?)", tok)
                if m:
                    uncertainty_kind = "numeric"
                    uncertainty_value = _safe_float(m.group(1))
                idx += 1

    # Units if present (e.g., kJ/mol); only when not exact
    if uncertainty_kind != "exact" and idx < len(tokens):
        if re.match(r"^[A-Za-z]+/mol$", tokens[idx]):
            units = tokens[idx]
            idx += 1

    # Molecular mass and optional uncertainty
    molecular_mass: Optional[float] = None
    molecular_mass_unc: Optional[float] = None
    if idx < len(tokens):
        molecular_mass = _safe_float(tokens[idx])
        idx += 1
        if idx < len(tokens):
            if tokens[idx] == "±":
                idx += 1
                if idx < len(tokens):
                    molecular_mass_unc = _safe_float(tokens[idx])
                    idx += 1
            elif tokens[idx].startswith("±"):
                m = re.search(r"±\s*([-+]?\d+(?:\.\d+)?)", tokens[idx])
                if m:
                    molecular_mass_unc = _safe_float(m.group(1))
                idx += 1

    # CAS*relative (if present)
    cas: Optional[str] = None
    relative: Optional[int] = None
    if idx < len(tokens):
        last_tok = tokens[-1]
        if "*" in last_tok:
            cas, relative = _split_cas_and_relative(last_tok)

    return {
        "common_name": species_name,
        "structure": structure,
        "enthalpy_of_formation_0K": dH0,
        "enthalpy_of_formation_298K": dH298,
        "uncertainty_value": uncertainty_value,
        "molecular_mass": molecular_mass,
        "molecular_mass_uncertainty": molecular_mass_unc,
        "cas_rn": cas,
        "relative_rank": relative,
    }


def parse_file(path: str) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as f:
        lines = [ln.rstrip("\n") for ln in f]

    # Prefer starting from the first species name: "Dihydrogen"
    start = None
    for i, ln in enumerate(lines):
        if ln.strip() == "Dihydrogen":
            start = i
            break
    if start is None:
        # Fallback: find header and start after it
        for i, ln in enumerate(lines):
            if ln.strip().startswith("Species Name"):
                start = i + 1
                break
    if start is None:
        start = 0

    i = start
    while i < len(lines):
        # Skip empties
        while i < len(lines) and not lines[i].strip():
            i += 1
        if i >= len(lines):
            break

        species_name_line = lines[i].strip()
        i += 1
        if not species_name_line:
            continue

        # Accumulate following line(s) until we detect CAS*relative token
        data_lines: List[str] = []
        cas_found = False
        while i < len(lines):
            next_line = lines[i].strip()
            # If next species header detected prematurely (rare), break
            # Heuristic: a line with no digits and not containing brackets/SMILES-like chars is likely a species name
            if not next_line:
                i += 1
                continue
            tokens = _tokenize_loose(next_line)
            has_cas = any(("*" in t and re.match(r"^\d{2,7}-\d{2}-\d\*\d+$", t)) for t in tokens)
            data_lines.append(next_line)
            i += 1
            if has_cas:
                cas_found = True
                break

        data_text = " ".join(data_lines)
        rec = parse_record(species_name_line, data_text)
        if rec:
            # Replace None with empty string for all fields
            sanitized: Dict[str, Any] = {}
            for k, v in rec.items():
                sanitized[k] = "" if v is None else v
            records.append(sanitized)

    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert enthalpy.md to JSON")
    parser.add_argument("input", help="Path to enthalpy.md")
    parser.add_argument("output", help="Path to write JSON output")
    args = parser.parse_args()

    data = parse_file(args.input)
    with open(args.output, "w", encoding="utf-8") as out:
        json.dump(data, out, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()


