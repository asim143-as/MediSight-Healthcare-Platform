import PyPDF2
import os

pdf_path = "MediSight_AI_PRD.pdf"
md_path = "docs/PRD.md"

if not os.path.exists("docs"):
    os.makedirs("docs")

with open(pdf_path, "rb") as file:
    reader = PyPDF2.PdfReader(file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n\n"

with open(md_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Extracted PDF to docs/PRD.md")
