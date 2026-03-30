import ast
import html
import os
import re


def read_text(path):
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def write_text(path, content):
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content)


def clean_block_comment(text):
    match = re.search(r"^\s*/\*\*([\s\S]*?)\*/", text)
    if not match:
        return []
    raw = match.group(1)
    lines = []
    for line in raw.splitlines():
        line = line.strip()
        if line.startswith("*"):
            line = line[1:].lstrip()
        lines.append(line)
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return lines


def is_separator(line):
    """Return True if the line is just a === or --- decoration."""
    stripped = line.strip()
    return bool(re.fullmatch(r"[=\-]{4,}", stripped))


def render_lines_to_html(lines):
    """Convert comment lines to HTML blocks: headings, bullet lists, paragraphs."""
    # Strip separator lines
    lines = [l for l in lines if not is_separator(l)]
    # Remove leading/trailing empty lines
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()

    html_parts = []
    i = 0
    # Extract title (first non-empty line before any blank line)
    if lines and lines[0].strip():
        html_parts.append(f'<p><strong>{html.escape(lines[0].strip())}</strong></p>')
        i = 1
        # skip blank line after title
        while i < len(lines) and not lines[i].strip():
            i += 1

    while i < len(lines):
        line = lines[i]

        # Blank line – just advance
        if not line.strip():
            i += 1
            continue

        # Section label: non-empty line ending with ":" that is NOT a bullet
        if re.match(r'^[A-Z][^:\n]{2,50}:$', line.strip()):
            html_parts.append(f'<p><strong>{html.escape(line.strip())}</strong></p>')
            i += 1
            continue

        # Bullet block: collect consecutive bullet lines
        if line.strip().startswith('- '):
            items = []
            while i < len(lines) and lines[i].strip().startswith('- '):
                items.append(lines[i].strip()[2:])
                i += 1
            html_parts.append('<ul>')
            for item in items:
                html_parts.append(f'  <li>{html.escape(item)}</li>')
            html_parts.append('</ul>')
            continue

        # Regular paragraph: collect until blank line
        paragraph_lines = []
        while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith('- '):
            paragraph_lines.append(lines[i].strip())
            i += 1
        if paragraph_lines:
            html_parts.append(f'<p>{html.escape(" ".join(paragraph_lines))}</p>')

    return "\n".join(html_parts)


def render_js_modules(root_dir, output_path):
    js_root = os.path.join(root_dir, "js")
    module_entries = []

    for dirpath, _, filenames in os.walk(js_root):
        for filename in sorted(filenames):
            if not filename.endswith(".js"):
                continue
            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root_dir).replace("\\", "/")
            header_lines = clean_block_comment(read_text(full_path))
            rendered = render_lines_to_html(header_lines) if header_lines else "<p>No module header found.</p>"
            module_entries.append((rel_path, rendered))

    module_entries.sort(key=lambda item: item[0].lower())

    parts = [
        '<div class="breadcrumb">QGas / API / JavaScript</div>',
        '<h1>JavaScript Modules</h1>',
        '<p>This page is generated automatically from the module headers in <code>js/</code> on every build.</p>',
    ]

    for rel_path, rendered_html in module_entries:
        parts.append('<details class="tool-section">')
        parts.append(f'<summary><code>{html.escape(rel_path)}</code></summary>')
        parts.append('<div class="module-header">')
        parts.append(rendered_html)
        parts.append('</div>')
        parts.append('</details>')

    parts.append('<hr>')
    write_text(output_path, "\n".join(parts) + "\n")


def render_python_api(root_dir, output_path):
    py_path = os.path.join(root_dir, "Server_Control.py")
    module = ast.parse(read_text(py_path))
    docstring = ast.get_docstring(module) or ""
    class_names = [
        node.name
        for node in module.body
        if isinstance(node, ast.ClassDef)
    ]

    parts = [
        '<div class="breadcrumb">QGas / API / Python</div>',
        '<h1>Python API: Server_Control.py</h1>',
        '<p>This page is generated automatically from <code>Server_Control.py</code> during docs builds.</p>',
        '<h2>Module Overview</h2>',
        '<pre><span></span><code>' + html.escape(docstring) + '</code></pre>',
    ]

    if class_names:
        parts.append('<h2>Classes</h2>')
        parts.append('<ul>')
        for name in class_names:
            parts.append(f'<li><code>{html.escape(name)}</code></li>')
        parts.append('</ul>')

    parts.append('<hr>')
    write_text(output_path, "\n".join(parts) + "\n")


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
    api_dir = os.path.join(repo_root, "docs", "api")

    render_js_modules(repo_root, os.path.join(api_dir, "js-modules.md"))
    render_python_api(repo_root, os.path.join(api_dir, "python-gui.md"))


if __name__ == "__main__":
    main()
