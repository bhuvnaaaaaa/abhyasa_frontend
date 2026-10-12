"""
ABHYASA - DOCX TO SEED DATA EXTRACTOR (HTML VERSION)
======================================================
Preserves tables, images, chemical formulas (subscript/superscript),
and bold/italic formatting by converting docx -> HTML using mammoth,
then storing HTML strings in your MongoDB seed data.

Images are saved to backend/uploads/ and referenced by URL.

Usage:
  py extract_content.py

Requires:
  pip install mammoth --break-system-packages   (or just: pip install mammoth)
"""

import re
import os
import sys

try:
    import mammoth
except ImportError:
    print("❌ mammoth is not installed. Run: pip install mammoth")
    sys.exit(1)


# ─────────────────────────────────────────────
# CONFIG — edit this list for every chapter you add
# ─────────────────────────────────────────────
CHAPTERS = [
    {
        "subject": "Biology",
        "number": 1,
        "title": "Cell — The Structural and Functional Unit of Life",
        "description": "Basic structural unit of all living organisms",
        "docx": "Biology_Chapter_1_Cell_-_The_Structural_and_Functional_Unit_of_Life.docx",
    },
    {
        "subject": "Geography",
        "number": 1,
        "title": "Interpretation of Topographical Maps",
        "description": "Understanding topographical maps and their features",
        "docx": "Geography_Chapter_1_Interpretation_of_Topographical_Maps.docx",
    },
    {
        "subject": "Physics",
        "number": 2,
        "title": "Work, Energy and Power",
        "description": "Concepts of work, energy and power in physics",
        "docx": "Physics_Chapter_2_Work,_Energy_and_Power.docx",
    },
    {
        "subject": "Chemistry",
        "number": 3,
        "title": "Acids, Bases and Salts",
        "description": "Properties and reactions of acids, bases and salts",
        "docx": "Chemistry_Chapter_3_Acids_Bases_and_Salts.docx",
    },
]

DOCX_FOLDER = "content_docs"
OUTPUT_FOLDER = "seed/data"
UPLOADS_FOLDER = "uploads"          # images saved here
UPLOADS_URL_PREFIX = "/uploads"     # how they're referenced from frontend


# ─────────────────────────────────────────────
# DOCX -> HTML CONVERSION (with image extraction)
# ─────────────────────────────────────────────

def convert_docx_to_html(docx_path, image_prefix):
    """
    Converts a docx file to HTML using mammoth.
    Images are saved to UPLOADS_FOLDER with names like:
      {image_prefix}_img1.png, {image_prefix}_img2.png, ...
    Returns the HTML string.
    """
    os.makedirs(UPLOADS_FOLDER, exist_ok=True)
    counter = {"n": 0}

    def convert_image(image):
        counter["n"] += 1
        ext = (image.content_type or "image/png").split("/")[-1]
        if ext == "jpeg":
            ext = "jpg"
        fname = f"{image_prefix}_img{counter['n']}.{ext}"
        with image.open() as img_bytes:
            data = img_bytes.read()
        with open(os.path.join(UPLOADS_FOLDER, fname), "wb") as f:
            f.write(data)
        return {"src": f"{UPLOADS_URL_PREFIX}/{fname}"}

    with open(docx_path, "rb") as f:
        result = mammoth.convert_to_html(
            f, convert_image=mammoth.images.img_element(convert_image)
        )

    for msg in result.messages:
        if msg.type == "error":
            print(f"  ⚠️  {msg.message}")

    return result.value


# ─────────────────────────────────────────────
# QUESTION SPLITTING (HTML-aware)
# ─────────────────────────────────────────────

def split_into_question_blocks(html):
    """
    Splits the HTML on each top-level numbered list item start
    <ol><li> ... since each one is a new question.
    Returns list of raw HTML chunks, one per question.
    """
    # Remove the very first heading/title block before "Intext Questions"
    # so it doesn't become a fake "question 0"
    html = re.sub(r'^.*?(?=<ol><li>)', '', html, count=1, flags=re.DOTALL)

    # Split right before every <ol><li> opening (each is a new question start)
    parts = re.split(r'(?=<ol><li>)', html)
    blocks = [p.strip() for p in parts if p.strip()]
    return blocks


def extract_question_and_answer(block):
    """
    A block looks like:
      <ol><li>QUESTION TEXT</li></ol> <p>ANSWER HTML...</p> <table>...</table> ...

    We split off the first <ol>...</ol> as the question,
    everything after it (until the next block, which is already handled
    by split_into_question_blocks) is the answer/explanation HTML.
    """
    match = re.match(r'(<ol>.*?</ol>)(.*)', block, flags=re.DOTALL)
    if not match:
        return None

    question_html = match.group(1)
    answer_html = match.group(2).strip()

    # Get plain question text (strip HTML tags) for the `question` field
    question_text = re.sub(r'<[^>]+>', ' ', question_html)
    question_text = re.sub(r'\s+', ' ', question_text).strip()
    # Remove leading list numbering artifacts
    question_text = question_text.strip()

    if not question_text or not answer_html:
        return None

    return {
        "type": "html",
        "question": question_text,
        "options": [],
        "answer": 0,
        "reason": answer_html   # full HTML: tables, images, formulas preserved
    }


def parse_chapter_html(html):
    blocks = split_into_question_blocks(html)
    results = []
    for block in blocks:
        parsed = extract_question_and_answer(block)
        if parsed:
            results.append(parsed)
    return results


# ─────────────────────────────────────────────
# JS OUTPUT GENERATOR
# ─────────────────────────────────────────────

def js_escape(s):
    """Escape a string for safe use inside a JS template literal (backticks)."""
    s = s.replace('\\', '\\\\')
    s = s.replace('`', '\\`')
    s = s.replace('${', '\\${')
    return s


def content_item_to_js(item, indent=6):
    pad = ' ' * indent
    pad2 = ' ' * (indent + 2)
    q = js_escape(item['question'])
    r = js_escape(item['reason'])
    return (
        f"{pad}{{\n"
        f"{pad2}type: 'html',\n"
        f"{pad2}question: `{q}`,\n"
        f"{pad2}options: [],\n"
        f"{pad2}answer: 0,\n"
        f"{pad2}reason: `{r}`\n"
        f"{pad}}}"
    )


def generate_js_for_subject(subject_name, chapters_data):
    chapters_js = []
    for ch in chapters_data:
        content_js = ',\n'.join([content_item_to_js(item) for item in ch['content']])
        ch_str = (
            f"  // ==================== CHAPTER {ch['number']} ====================\n"
            f"  {{\n"
            f"    number: {ch['number']},\n"
            f"    title: `{js_escape(ch['title'])}`,\n"
            f"    description: `{js_escape(ch['description'])}`,\n"
            f"    content: [\n{content_js}\n    ]\n"
            f"  }}"
        )
        chapters_js.append(ch_str)

    chapters_joined = ',\n'.join(chapters_js)
    return (
        f"/**\n"
        f" * ABHYASA PLATFORM - {subject_name.upper()} CURRICULUM (Grade 10)\n"
        f" * CBSE - Auto-generated (HTML content: tables, images, formulas preserved)\n"
        f" */\n"
        f"export const {subject_name} = [\n{chapters_joined}\n];\n"
    )


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    print("\n🚀 ABHYASA CONTENT EXTRACTOR (HTML MODE)\n" + "=" * 55)

    subjects = {}
    for ch_config in CHAPTERS:
        subj = ch_config["subject"]
        subjects.setdefault(subj, [])

        docx_path = os.path.join(DOCX_FOLDER, ch_config["docx"])
        if not os.path.exists(docx_path):
            print(f"  ⚠️  File not found: {docx_path} — skipping")
            continue

        print(f"\n📄 Reading: {ch_config['docx']}")
        image_prefix = f"{subj.lower()}_ch{ch_config['number']}"
        html = convert_docx_to_html(docx_path, image_prefix)

        print("  → Splitting into questions...")
        content = parse_chapter_html(html)
        img_count = html.count('<img')
        print(f"  ✅ Found {len(content)} questions, {img_count} images extracted")

        subjects[subj].append({
            "number": ch_config["number"],
            "title": ch_config["title"],
            "description": ch_config["description"],
            "content": content
        })

    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    print(f"\n📝 Writing seed files to {OUTPUT_FOLDER}/\n" + "-" * 40)

    for subject_name, chapters_data in subjects.items():
        if not chapters_data:
            continue
        js_content = generate_js_for_subject(subject_name, chapters_data)
        out_path = os.path.join(OUTPUT_FOLDER, f"{subject_name}.js")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(js_content)
        total_qs = sum(len(ch['content']) for ch in chapters_data)
        print(f"  ✅ {subject_name}.js — {len(chapters_data)} chapter(s), {total_qs} questions")

    print("\n" + "=" * 55)
    print("✅ DONE")
    print("Next steps:")
    print("  1. node seed/seedDatabase.js")
    print("  2. Make sure server.js serves the uploads/ folder statically")
    print("     (see instructions provided separately)")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    main()
