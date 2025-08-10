#!/usr/bin/env python
import sys, json, pathlib
from docling.document_converter import DocumentConverter

def main():
    if len(sys.argv) < 2:
        print("Usage: convert.py <pdf_url_or_path>", file=sys.stderr)
        sys.exit(1)
    source = sys.argv[1]
    converter = DocumentConverter()
    result = converter.convert(source)
    doc = result.document
    markdown = doc.export_to_markdown()
    # print markdown to stdout
    print(markdown)

if __name__ == "__main__":
    main()
