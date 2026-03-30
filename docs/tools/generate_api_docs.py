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
    lines = [l for l in lines if not is_separator(l)]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()

    html_parts = []
    i = 0
    if lines and lines[0].strip():
        html_parts.append(f'<p><strong>{html.escape(lines[0].strip())}</strong></p>')
        i = 1
        while i < len(lines) and not lines[i].strip():
            i += 1

    while i < len(lines):
        line = lines[i]

        if not line.strip():
            i += 1
            continue

        if re.match(r'^[A-Z][^:\n]{2,50}:$', line.strip()):
            html_parts.append(f'<p><strong>{html.escape(line.strip())}</strong></p>')
            i += 1
            continue

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

        paragraph_lines = []
        while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith('- '):
            paragraph_lines.append(lines[i].strip())
            i += 1
        if paragraph_lines:
            html_parts.append(f'<p>{html.escape(" ".join(paragraph_lines))}</p>')

    return "\n".join(html_parts)


# ---------------------------------------------------------------------------
# JSDoc function extraction
# ---------------------------------------------------------------------------

_JSDOC_BLOCK = r'/\*\*([\s\S]*?)\*/'
_FUNC_DECLARATION = (
    r'(?:'
    r'window\.(\w+)\s*=\s*(?:async\s+)?function\s*\w*\s*\(([^)]*)\)'   # window.name = function(...)
    r'|'
    r'(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)'        # function name(...)
    r')'
)
_JSDOC_FUNC_RE = re.compile(
    _JSDOC_BLOCK + r'\s*\n\s*' + _FUNC_DECLARATION,
    re.MULTILINE,
)


def parse_jsdoc_tags(raw_comment):
    """Parse a raw /** ... */ comment string into structured fields."""
    # Strip /** and */ markers
    inner = re.sub(r'^\s*/\*\*', '', raw_comment)
    inner = re.sub(r'\*/\s*$', '', inner)
    description_lines = []
    params = []
    returns = None
    throws = []
    current_tag = None
    current_content = []

    def flush():
        nonlocal current_tag, current_content
        if current_tag == '@param':
            m = re.match(
                r'\{([^}]+)\}\s+(\w+)\s*[-–]?\s*(.*)',
                ' '.join(current_content).strip(),
            )
            if m:
                params.append({'type': m.group(1), 'name': m.group(2), 'desc': m.group(3).strip()})
        elif current_tag in ('@returns', '@return'):
            m = re.match(r'\{([^}]+)\}\s*(.*)', ' '.join(current_content).strip())
            if m:
                nonlocal returns
                returns = {'type': m.group(1), 'desc': m.group(2).strip()}
        elif current_tag == '@throws':
            throws.append(' '.join(current_content).strip())
        current_tag = None
        current_content = []

    for raw_line in inner.splitlines():
        line = raw_line.strip()
        if line.startswith('*'):
            line = line[1:].lstrip()
        if not line:
            if current_tag is None:
                description_lines.append('')
            continue
        tag_match = re.match(r'(@\w+)\s*(.*)', line)
        if tag_match:
            flush()
            current_tag = tag_match.group(1)
            current_content = [tag_match.group(2)] if tag_match.group(2) else []
        elif current_tag:
            current_content.append(line)
        else:
            if not line.startswith('=') and not re.fullmatch(r'[=\-]{4,}', line):
                description_lines.append(line)

    flush()

    # Collapse description: skip separator lines, join non-empty
    desc_clean = []
    for dl in description_lines:
        if re.fullmatch(r'[=\-]{4,}', dl.strip()):
            continue
        if dl.strip():
            desc_clean.append(dl.strip())
    description = ' '.join(desc_clean)

    return {
        'description': description,
        'params': params,
        'returns': returns,
        'throws': throws,
    }


def extract_documented_functions(js_text):
    """Return list of dicts for every JSDoc-annotated function in the file."""
    results = []
    for match in _JSDOC_FUNC_RE.finditer(js_text):
        raw_comment = '/**' + match.group(1) + '*/'
        # Groups 2,3 = window.name form; groups 4,5 = plain function form
        if match.group(2):
            name = match.group(2)
            params_str = match.group(3).strip()
        else:
            name = match.group(4)
            params_str = match.group(5).strip()
        if not name:
            continue
        info = parse_jsdoc_tags(raw_comment)
        results.append({'name': name, 'params_str': params_str, 'info': info})
    return results


def render_function_table(functions):
    """Render a list of documented functions as an HTML section."""
    if not functions:
        return ''
    parts = ['<div class="api-functions">']
    parts.append('<h3>Public API Functions</h3>')
    for fn in functions:
        name = fn['name']
        params_str = html.escape(fn['params_str'])
        info = fn['info']
        desc = html.escape(info['description']) if info['description'] else ''
        parts.append('<div class="api-func">')
        parts.append(f'<p class="api-sig"><code>{html.escape(name)}({params_str})</code></p>')
        if desc:
            parts.append(f'<p class="api-desc">{desc}</p>')
        if info['params']:
            parts.append('<table class="api-params">')
            parts.append('<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>')
            parts.append('<tbody>')
            for p in info['params']:
                parts.append(
                    f'<tr><td><code>{html.escape(p["name"])}</code></td>'
                    f'<td><code>{html.escape(p["type"])}</code></td>'
                    f'<td>{html.escape(p["desc"])}</td></tr>'
                )
            parts.append('</tbody></table>')
        if info['returns']:
            ret = info['returns']
            parts.append(
                f'<p class="api-returns"><strong>Returns:</strong> '
                f'<code>{html.escape(ret["type"])}</code>'
                + (f' — {html.escape(ret["desc"])}' if ret['desc'] else '')
                + '</p>'
            )
        if info['throws']:
            for t in info['throws']:
                parts.append(f'<p class="api-throws"><strong>Throws:</strong> {html.escape(t)}</p>')
        parts.append('</div>')
    parts.append('</div>')
    return '\n'.join(parts)


def render_js_modules(root_dir, output_path):
    js_root = os.path.join(root_dir, "js")
    module_entries = []

    for dirpath, _, filenames in os.walk(js_root):
        for filename in sorted(filenames):
            if not filename.endswith(".js"):
                continue
            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root_dir).replace("\\", "/")
            text = read_text(full_path)
            header_lines = clean_block_comment(text)
            rendered_header = render_lines_to_html(header_lines) if header_lines else "<p>No module header found.</p>"
            functions = extract_documented_functions(text)
            rendered_funcs = render_function_table(functions)
            module_entries.append((rel_path, rendered_header, rendered_funcs))

    module_entries.sort(key=lambda item: item[0].lower())

    parts = [
        '<div class="breadcrumb">QGas / API / JavaScript</div>',
        '<h1>JavaScript Modules</h1>',
        '<p>This page is generated automatically from the module headers and JSDoc annotations '
        'in <code>js/</code> on every build.</p>',
    ]

    for rel_path, rendered_header, rendered_funcs in module_entries:
        parts.append('<details class="tool-section">')
        parts.append(f'<summary><code>{html.escape(rel_path)}</code></summary>')
        parts.append('<div class="module-header">')
        parts.append(rendered_header)
        if rendered_funcs:
            parts.append(rendered_funcs)
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
