#!/usr/bin/env python3
"""
BMIDE XML Schema Checker & Validator Utility
Description: Audits custom BMIDE XML schema templates for standard compliance.
Checks:
1. Validates XML parsing.
2. Checks that custom Business Objects have appropriate custom prefixes.
3. Checks that custom Attributes have appropriate custom prefixes (avoiding TC standard namespace pollution).
4. Verifies presence of key elements and duplicate configurations.
"""

import sys
import os
import xml.etree.ElementTree as ET

def audit_bmide_template(xml_path, custom_prefix=None):
    if not os.path.exists(xml_path):
        print(f"[ERROR] File not found: {xml_path}")
        return False
        
    print("=" * 60)
    print(f" Auditing BMIDE Schema: {os.path.basename(xml_path)}")
    print("=" * 60)
    
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except ET.ParseError as e:
        print(f"[CRITICAL] XML Syntax Parse Error: {e}")
        return False
        
    warnings = 0
    errors = 0
    custom_objs_checked = 0
    custom_attrs_checked = 0
    
    # Check Business Objects (BusinessObject, BusinessObjectType, etc.)
    # In BMIDE templates, tags are usually <BusinessObject>, <TcAttribute>, etc.
    # Namespace handling
    ns = ""
    if "}" in root.tag:
        ns = root.tag.split("}")[0] + "}"
        
    # Standard query patterns
    bo_tags = root.findall(f".//{ns}BusinessObject") + root.findall(f".//{ns}BusinessObjectType")
    attr_tags = root.findall(f".//{ns}TcAttribute") + root.findall(f".//{ns}Attribute")
    
    print(f"\n[INFO] Found {len(bo_tags)} Business Objects and {len(attr_tags)} Attributes.")
    
    if custom_prefix:
        print(f"[INFO] Auditing for custom prefix: '{custom_prefix}'")
        custom_prefix_lower = custom_prefix.lower()
        
        # Check Business Objects
        for bo in bo_tags:
            name = bo.get("name")
            if not name:
                continue
            
            # Skip checking standard TC objects (which don't usually start with custom prefix but shouldn't be defined as new in custom template unless extending)
            # We assume custom objects defined in this template should have prefix
            is_custom = bo.get("custom") == "true" or bo.get("isCustom") == "true"
            if is_custom or name.lower().startswith(custom_prefix_lower):
                custom_objs_checked += 1
                if not name.lower().startswith(custom_prefix_lower):
                    print(f"[WARNING] Custom Business Object '{name}' does not start with recommended prefix '{custom_prefix}'")
                    warnings += 1
                    
        # Check Attributes
        for attr in attr_tags:
            name = attr.get("name")
            if not name:
                continue
            
            is_custom = attr.get("custom") == "true" or attr.get("isCustom") == "true"
            # In many BMIDE templates, attributes are added to existing objects
            # Standard TC attributes don't need custom check, but custom ones do
            if is_custom:
                custom_attrs_checked += 1
                if not name.lower().startswith(custom_prefix_lower):
                    print(f"[ERROR] Custom Attribute '{name}' does not start with prefix '{custom_prefix}' (Violates naming standards!)")
                    errors += 1
    else:
        print("[INFO] No custom prefix specified. Skipping prefix naming check. Use --prefix <value> to run name check.")
        
    # Check for duplicate declarations
    declared_bos = set()
    duplicate_bos = set()
    for bo in bo_tags:
        name = bo.get("name")
        if name:
            if name in declared_bos:
                duplicate_bos.add(name)
            declared_bos.add(name)
            
    if duplicate_bos:
        print("\n[CRITICAL] Duplicate Business Object declarations found:")
        for dup in duplicate_bos:
            print(f"  - {dup}")
            errors += 1
    else:
        print("\n[SUCCESS] No duplicate Business Object declarations found.")
        
    print("\n" + "=" * 60)
    print(" AUDIT SUMMARY")
    print("-" * 60)
    print(f" Custom Objects Evaluated:   {custom_objs_checked}")
    print(f" Custom Attributes Evaluated: {custom_attrs_checked}")
    print(f" Total Warnings Raised:      {warnings}")
    print(f" Total Errors Found:         {errors}")
    print("=" * 60)
    
    if errors > 0:
        print("\n[STATUS] AUDIT FAILED. Please correct errors before deploying template.")
        return False
    else:
        print("\n[STATUS] AUDIT PASSED. Template conforms to best practices.")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python bmide-xml-helper.py <path_to_template_xml> [--prefix <custom_prefix>]")
        sys.exit(1)
        
    xml_path = sys.argv[1]
    prefix = None
    if "--prefix" in sys.argv:
        try:
            prefix_idx = sys.argv.index("--prefix")
            prefix = sys.argv[prefix_idx + 1]
        except IndexError:
            print("[ERROR] Please provide a prefix value after --prefix flag")
            sys.exit(1)
            
    success = audit_bmide_template(xml_path, prefix)
    sys.exit(0 if success else 1)
