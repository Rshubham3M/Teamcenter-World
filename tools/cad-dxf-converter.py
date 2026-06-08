#!/usr/bin/env python3
"""
CAD DXF Analyzer & Batch Metadata Extractor
Description: Parses ASCII DXF (Drawing Exchange Format) files to extract 
             metadata (headers, layers, block names, and coordinate boundaries) 
             without requiring heavyweight CAD engines (like AutoCAD or SolidWorks).
Usage: python cad-dxf-converter.py <folder_or_file_path> [--export-json]
"""

import sys
import os
import json
import re

def parse_dxf_metadata(dxf_path):
    """
    Parses key metadata from ASCII DXF file line by line.
    """
    if not os.path.exists(dxf_path):
        print(f"[ERROR] File not found: {dxf_path}")
        return None

    metadata = {
        "filename": os.path.basename(dxf_path),
        "filepath": os.path.abspath(dxf_path),
        "acad_version": "Unknown",
        "layers": set(),
        "block_count": 0,
        "line_count": 0,
        "circle_count": 0,
        "text_count": 0,
        "extents": {
            "min_x": None, "min_y": None,
            "max_x": None, "max_y": None
        }
    }

    # ACAD version map
    version_map = {
        "AC1006": "R10",
        "AC1009": "R11/R12",
        "AC1012": "R13",
        "AC1014": "R14",
        "AC1015": "AutoCAD 2000/2000i/2002",
        "AC1018": "AutoCAD 2004/2005/2006",
        "AC1021": "AutoCAD 2007/2008/2009",
        "AC1024": "AutoCAD 2010/2011/2012",
        "AC1027": "AutoCAD 2013/2014/2015/2016/2017",
        "AC1032": "AutoCAD 2018/2019/2020/2021/2022/2023/2024"
    }

    try:
        with open(dxf_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = [line.strip() for line in f.readlines()]
    except Exception as e:
        print(f"[ERROR] Failed to read file: {e}")
        return None

    # Parse DXF Group Code and Value pairs
    # Group code is on line N, value is on line N+1
    i = 0
    total_lines = len(lines)
    
    current_section = None
    in_header = False
    
    while i < total_lines - 1:
        group_code = lines[i]
        val = lines[i+1]
        
        # Check sections
        if group_code == "0" and val == "SECTION":
            in_section = True
            i += 2
            continue
        
        if group_code == "2" and i > 0 and lines[i-1] == "SECTION":
            current_section = val
            if current_section == "HEADER":
                in_header = True
            i += 2
            continue
            
        if group_code == "0" and val == "ENDSEC":
            current_section = None
            in_header = False
            i += 2
            continue

        # Extract ACAD version from Header
        if in_header and group_code == "9" and val == "$ACADVER":
            if i + 3 < total_lines:
                version_code = lines[i+3]
                metadata["acad_version"] = version_map.get(version_code, f"Code: {version_code}")
        
        # Extract Extents (Bounding Box)
        if in_header:
            if group_code == "9" and val == "$EXTMIN":
                metadata["extents"]["min_x"] = float(lines[i+3]) if i+3 < total_lines else None
                metadata["extents"]["min_y"] = float(lines[i+5]) if i+5 < total_lines else None
            elif group_code == "9" and val == "$EXTMAX":
                metadata["extents"]["max_x"] = float(lines[i+3]) if i+3 < total_lines else None
                metadata["extents"]["max_y"] = float(lines[i+5]) if i+5 < total_lines else None

        # Count entities & collect layer names
        if group_code == "0":
            if val == "LINE":
                metadata["line_count"] += 1
            elif val == "CIRCLE":
                metadata["circle_count"] += 1
            elif val == "TEXT" or val == "MTEXT":
                metadata["text_count"] += 1
            elif val == "BLOCK":
                metadata["block_count"] += 1

        # Check for Layer name declarations or usage
        if group_code == "8":
            metadata["layers"].add(val)

        i += 2

    # Clean up layers set to list for JSON export
    metadata["layers"] = sorted(list(metadata["layers"]))
    return metadata

def process_path(target_path, export_json=False):
    if os.path.isdir(target_path):
        print(f"[INFO] Scanning directory: {target_path}")
        dxf_files = [os.path.join(target_path, f) for f in os.listdir(target_path) if f.lower().endswith(".dxf")]
        if not dxf_files:
            print("[INFO] No .dxf files found in directory.")
            return
            
        results = {}
        for f in dxf_files:
            meta = parse_dxf_metadata(f)
            if meta:
                results[os.path.basename(f)] = meta
                print_summary(meta)
                
        if export_json and results:
            out_file = os.path.join(target_path, "dxf_metadata_report.json")
            with open(out_file, 'w', encoding='utf-8') as jf:
                json.dump(results, jf, indent=4)
            print(f"\n[SUCCESS] Exported batch report to: {out_file}")
            
    else:
        meta = parse_dxf_metadata(target_path)
        if meta:
            print_summary(meta)
            if export_json:
                out_file = target_path + ".metadata.json"
                with open(out_file, 'w', encoding='utf-8') as jf:
                    json.dump(meta, jf, indent=4)
                print(f"\n[SUCCESS] Exported report to: {out_file}")

def print_summary(meta):
    print("\n" + "=" * 60)
    print(f" CAD DATA REPORT: {meta['filename']}")
    print("-" * 60)
    print(f" AutoCAD Version Format:  {meta['acad_version']}")
    print(f" Total Layers Defined:    {len(meta['layers'])}")
    print(f"   Layers List:           {', '.join(meta['layers'][:8])}" + ("..." if len(meta['layers']) > 8 else ""))
    print(f" Block Definitions:       {meta['block_count']}")
    print(f" Entity Counts:")
    print(f"   Lines:                 {meta['line_count']}")
    print(f"   Circles:               {meta['circle_count']}")
    print(f"   Text/MText:            {meta['text_count']}")
    
    ext = meta["extents"]
    if ext["min_x"] is not None:
        print(f" Drawing Boundaries:")
        print(f"   Min (X, Y):            ({ext['min_x']:.2f}, {ext['min_y']:.2f})")
        print(f"   Max (X, Y):            ({ext['max_x']:.2f}, {ext['max_y']:.2f})")
        print(f"   Bounding Box Size:     Width={abs(ext['max_x'] - ext['min_x']):.2f}, Height={abs(ext['max_y'] - ext['min_y']):.2f}")
    print("=" * 60)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python cad-dxf-converter.py <path_to_dxf_or_folder> [--export-json]")
        sys.exit(1)
        
    target = sys.argv[1]
    export = "--export-json" in sys.argv
    process_path(target, export)
