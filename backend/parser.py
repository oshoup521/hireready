"""
parser.py — PDF Text Extractor
Uses PyMuPDF (fitz) to extract plain text from PDF files.
"""

import fitz  # PyMuPDF
import re


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract and clean plain text from a PDF given its raw bytes.

    Steps:
      1. Open the PDF from the in-memory bytes buffer.
      2. Iterate over every page and extract its text.
      3. Concatenate all page text with a newline separator.
      4. Strip excessive blank lines and leading/trailing whitespace.
      5. Return the cleaned plain-text string.

    Args:
        file_bytes: Raw bytes of the PDF file.

    Returns:
        A clean plain-text string containing all readable text from the PDF.

    Raises:
        ValueError: If the PDF cannot be opened or contains no extractable text.
    """

    # Step 1 — Open the PDF from a bytes stream (no temporary file needed)
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise ValueError(f"Failed to open PDF: {exc}") from exc

    # Step 2 & 3 — Extract text from each page and concatenate
    pages_text = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pages_text.append(page.get_text("text"))

    doc.close()

    raw_text = "\n".join(pages_text)

    # Step 4 — Clean up: collapse multiple blank lines into one, strip edges
    # Remove lines that are purely whitespace
    lines = [line.rstrip() for line in raw_text.splitlines()]
    # Collapse consecutive blank lines into a single blank line
    cleaned_lines = []
    prev_blank = False
    for line in lines:
        is_blank = line.strip() == ""
        if is_blank and prev_blank:
            continue  # Skip duplicate blank lines
        cleaned_lines.append(line)
        prev_blank = is_blank

    cleaned_text = "\n".join(cleaned_lines).strip()

    # Step 5 — Return the cleaned text
    if not cleaned_text:
        raise ValueError("No extractable text found in the PDF.")

    return cleaned_text
