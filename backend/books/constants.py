EXTRACT_PROMPT = (
    'Analyze this document and extract book metadata. '
    'Return ONLY a valid JSON object — no markdown, no extra text — with these exact fields:\n'
    '{\n'
    '  "title": "the book title",\n'
    '  "author": "author name(s)",\n'
    '  "description": "2-3 sentence summary of what this book is about",\n'
    '  "tags": ["tag1", "tag2", "tag3"]\n'
    '}\n'
    'Tags should be 3-5 short genre or topic keywords (e.g. "Fiction", "Science", "History").\n'
    'If you cannot determine a field, use an empty string or empty array.'
)

ANALYSIS_PROMPT = (
    'You are a literary analyst. Analyze this book thoroughly and return a JSON object '
    'with exactly these fields (no markdown fences, no extra text):\n'
    '{\n'
    '  "summary": "3-4 paragraph deep summary covering the main ideas and structure",\n'
    '  "key_themes": ["theme 1", "theme 2", "theme 3", "theme 4", "theme 5"],\n'
    '  "target_audience": "Who will benefit most from this book",\n'
    '  "difficulty": "Beginner | Intermediate | Advanced",\n'
    '  "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4", "takeaway 5"],\n'
    '  "writing_style": "Brief description of the author\'s style, tone, and approach",\n'
    '  "notable_quote": "One memorable or representative quote from the book, or empty string if none"\n'
    '}\n'
    'Be specific and insightful. Base your analysis on the actual content, not generic descriptions.'
)
