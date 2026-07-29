import pypdf

def extract_text(pdf_path):
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    pdf_path = r"f:\NubeEra_LMS\LMS V7\LMS V7\NubeEra 1st Final-1-21.pdf"
    content = extract_text(pdf_path)
    with open("pdf_content.txt", "w", encoding="utf-8") as f:
        f.write(content)
    print("Extraction successful. Saved to pdf_content.txt")
