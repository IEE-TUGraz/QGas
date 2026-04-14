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

# Tempered greedy token: each character must NOT be the start of '*/'.
# This prevents the regex engine from backtracking past a comment-close
# boundary and accidentally swallowing the file-level module header.
_JSDOC_BLOCK = r'/\*\*((?:(?!\*/)[\s\S])*?)\*/'
_FUNC_DECLARATION = (
    r'(?:'
    r'window\.(\w+)\s*=\s*(?:async\s+)?function\s*\w*\s*\(([^)]*)\)'   # window.name = function(...)
    r'|'
    r'(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)'        # function name(...)
    r')'
)
_JSDOC_FUNC_RE = re.compile(
    # Allow at most ONE blank line between closing */ and the function declaration.
    # Using [ \t]* instead of \s* prevents the pattern from jumping across many lines.
    _JSDOC_BLOCK + r'[ \t]*\n(?:[ \t]*\n)?[ \t]*' + _FUNC_DECLARATION,
    re.MULTILINE,
)


def _resolve_jsdoc_links(text):
    """Resolve inline JSDoc tags and HTML-escape the result.

    Handles:
    - {@link Target}          → <code>Target</code>
    - {@link Target Label}    → <code>Label</code>
    - {@code value}           → <code>value</code>

    Plain text is HTML-escaped; only the emitted <code> tags remain as HTML.
    """
    # Step 1: replace inline tags on the raw text BEFORE html.escape so that
    # characters inside the tags (e.g. quotes) come out readable.
    placeholders = []

    def _link_repl(m):
        parts = m.group(1).strip().split(None, 1)
        label = parts[1] if len(parts) > 1 else parts[0]
        ph = f'\x00PH{len(placeholders)}\x00'
        placeholders.append(f'<code>{html.escape(label)}</code>')
        return ph

    def _code_repl(m):
        ph = f'\x00PH{len(placeholders)}\x00'
        placeholders.append(f'<code>{html.escape(m.group(1).strip())}</code>')
        return ph

    def _em_repl(m):
        ph = f'\x00PH{len(placeholders)}\x00'
        placeholders.append(f'<em>{html.escape(m.group(1).strip())}</em>')
        return ph

    text = re.sub(r'\{@link\s+([^}]+)\}', _link_repl, text)
    text = re.sub(r'\{@code\s+([^}]+)\}', _code_repl, text)
    # Also handle bare <code>...</code> and <em>...</em> HTML tags written directly in JSDoc
    text = re.sub(r'<code>([^<]+)</code>', _code_repl, text)
    text = re.sub(r'<em>([^<]+)</em>', _em_repl, text)

    # Step 2: escape the remaining plain text
    text = html.escape(text)

    # Step 3: restore the placeholder HTML snippets
    for i, snippet in enumerate(placeholders):
        text = text.replace(html.escape(f'\x00PH{i}\x00'), snippet)

    return text


def parse_jsdoc_tags(raw_comment):
    """Parse a raw /** ... */ comment string into structured fields."""
    # Strip /** and */ markers
    inner = re.sub(r'^\s*/\*\*', '', raw_comment)
    inner = re.sub(r'\*/\s*$', '', inner)
    description_lines = []
    params = []
    returns = None
    throws = []
    examples = []       # @example blocks (list of code strings)
    sideeffects = []    # @sideeffects descriptions
    internal = False    # @internal flag
    current_tag = None
    current_content = []

    def flush():
        nonlocal current_tag, current_content, returns, internal
        if current_tag == '@param':
            m = re.match(
                r'\{([^}]+)\}\s+(\w+)\s*[-–]?\s*(.*)',
                ' '.join(current_content).strip(),
            )
            if m:
                params.append({'type': m.group(1), 'name': m.group(2), 'desc': _resolve_jsdoc_links(m.group(3).strip())})
        elif current_tag in ('@returns', '@return'):
            m = re.match(r'\{([^}]+)\}\s*(.*)', ' '.join(current_content).strip())
            if m:
                returns = {'type': m.group(1), 'desc': _resolve_jsdoc_links(m.group(2).strip())}
        elif current_tag == '@throws':
            throws.append(_resolve_jsdoc_links(' '.join(current_content).strip()))
        elif current_tag == '@example':
            # Strip leading/trailing blank lines from the code block
            code_lines = current_content[:]
            while code_lines and not code_lines[0].strip():
                code_lines.pop(0)
            while code_lines and not code_lines[-1].strip():
                code_lines.pop()
            if code_lines:
                examples.append('\n'.join(code_lines))
        elif current_tag == '@sideeffects':
            desc = ' '.join(l for l in current_content if l.strip()).strip()
            if desc:
                sideeffects.append(desc)
        elif current_tag == '@internal':
            internal = True
        current_tag = None
        current_content = []

    for raw_line in inner.splitlines():
        line = raw_line.strip()
        if line.startswith('*'):
            line = line[1:].lstrip()
        if not line:
            if current_tag == '@example':
                current_content.append('')   # preserve blank lines inside code blocks
            elif current_tag is None:
                description_lines.append('')
            continue
        tag_match = re.match(r'(@\w+)\s*(.*)', line)
        if tag_match:
            flush()
            current_tag = tag_match.group(1)
            if current_tag == '@internal':
                internal = True
                current_tag = None
                current_content = []
            else:
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
    description = _resolve_jsdoc_links(' '.join(desc_clean))

    return {
        'description': description,
        'params': params,
        'returns': returns,
        'throws': throws,
        'examples': examples,
        'sideeffects': sideeffects,
        'internal': internal,
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


def _render_function_html(fn):
    """Render a single documented function as a collapsible <details> element."""
    name = fn['name']
    params_str = html.escape(fn['params_str'])
    info = fn['info']
    desc = info['description'] if info['description'] else ''
    parts = ['<details class="api-func">']
    parts.append(f'<summary class="api-sig"><code>{html.escape(name)}({params_str})</code></summary>')
    parts.append('<div class="api-func-body">')
    if desc:
        parts.append(f'<p class="api-desc">{desc}</p>')
    if info.get('sideeffects'):
        parts.append('<p class="api-sideeffects"><strong>Side Effects:</strong></p>')
        parts.append('<ul class="api-sideeffects-list">')
        for s in info['sideeffects']:
            parts.append(f'  <li>{html.escape(s)}</li>')
        parts.append('</ul>')
    if info['params']:
        parts.append('<table class="api-params">')
        parts.append('<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>')
        parts.append('<tbody>')
        for p in info['params']:
            parts.append(
                f'<tr><td><code>{html.escape(p["name"])}</code></td>'
                f'<td><code>{html.escape(p["type"])}</code></td>'
                f'<td>{p["desc"]}</td></tr>'
            )
        parts.append('</tbody></table>')
    if info['returns']:
        ret = info['returns']
        parts.append(
            f'<p class="api-returns"><strong>Returns:</strong> '
            f'<code>{html.escape(ret["type"])}</code>'
            + (f' \u2014 {ret["desc"]}' if ret['desc'] else '')
            + '</p>'
        )
    if info['throws']:
        for t in info['throws']:
            parts.append(f'<p class="api-throws"><strong>Throws:</strong> {t}</p>')
    for ex in info.get('examples', []):
        parts.append('<div class="api-example">')
        parts.append('<p><strong>Example:</strong></p>')
        parts.append(f'<pre><code class="language-javascript">{html.escape(ex)}</code></pre>')
        parts.append('</div>')
    parts.append('</div>')
    parts.append('</details>')
    return '\n'.join(parts)


def render_function_table(functions):
    """Render a list of documented functions as collapsible <details> elements."""
    if not functions:
        return ''

    public_fns = [f for f in functions if not f['info'].get('internal', False)]
    internal_fns = [f for f in functions if f['info'].get('internal', False)]

    parts = []

    if public_fns:
        parts.append('<details class="api-functions-section">')
        parts.append(
            f'<summary><strong>Public API Functions</strong>'
            f'<span class="api-func-count"> ({len(public_fns)})</span></summary>'
        )
        parts.append('<div class="api-functions">')
        for fn in public_fns:
            parts.append(_render_function_html(fn))
        parts.append('</div>')
        parts.append('</details>')

    if internal_fns:
        parts.append('<details class="api-functions-section api-internal-section">')
        parts.append(
            f'<summary><strong>Internal Helpers</strong>'
            f'<span class="api-func-count"> ({len(internal_fns)})</span></summary>'
        )
        parts.append('<div class="api-functions">')
        for fn in internal_fns:
            parts.append(_render_function_html(fn))
        parts.append('</div>')
        parts.append('</details>')

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
        '<p class="api-scope-note"><strong>API Scope:</strong> The functions documented here '
        'are primarily designed for internal module interaction within QGas. A stable subset is '
        'intentionally exposed on the global <code>window</code> object for cross-module use; '
        'these are the recommended integration points for any downstream tooling. Functions '
        'labelled <em>Internal Helpers</em> are implementation details and may change between '
        'releases.</p>',
    ]

    for rel_path, rendered_header, rendered_funcs in module_entries:
        parts.append('<details class="tool-section">')
        parts.append(f'<summary><code>{html.escape(os.path.basename(rel_path))}</code></summary>')
        parts.append('<div class="module-header">')
        parts.append(rendered_header)
        if rendered_funcs:
            parts.append(rendered_funcs)
        parts.append('</div>')
        parts.append('</details>')

    parts.append('<hr>')
    write_text(output_path, "\n".join(parts) + "\n")


# ---------------------------------------------------------------------------
# Python docstring parsing and rendering
# ---------------------------------------------------------------------------

def parse_google_docstring(docstring):
    """Parse a Google-style Python docstring into structured fields.

    Recognises ``Args:``, ``Returns:``, ``Raises:`` sections plus any other
    capitalised heading (e.g. ``Features:``, ``Actions:``, ``Routes:``) which
    is preserved as an ``extra_section`` with bullet-list items.
    """
    if not docstring:
        return {'description': '', 'args': [], 'returns': None, 'raises': [], 'extra_sections': []}

    SECTION_KEYS = {
        'Args:': 'args', 'Arguments:': 'args', 'Parameters:': 'args',
        'Returns:': 'returns', 'Return:': 'returns', 'Yields:': 'returns',
        'Raises:': 'raises', 'Raise:': 'raises', 'Throws:': 'raises',
    }
    EXTRA_HEADER_RE = re.compile(r'^[A-Z][A-Za-z ]+:$')

    current_section = 'description'
    description_lines = []
    args = []
    current_arg = None
    returns_lines = []
    raises = []
    extra_sections = []

    for line in docstring.split('\n'):
        stripped = line.strip()

        if stripped in SECTION_KEYS:
            if current_arg:
                args.append(current_arg)
                current_arg = None
            current_section = SECTION_KEYS[stripped]
            continue

        if EXTRA_HEADER_RE.match(stripped) and stripped not in SECTION_KEYS and current_section in ('description', 'extra'):
            if current_arg:
                args.append(current_arg)
                current_arg = None
            extra_sections.append({'name': stripped[:-1], 'items': []})
            current_section = 'extra'
            continue

        if current_section == 'description':
            description_lines.append(stripped)
        elif current_section == 'args':
            if stripped:
                m = re.match(r'(\w+)\s*\(([^)]+)\)\s*:\s*(.*)', stripped)
                if m:
                    if current_arg:
                        args.append(current_arg)
                    current_arg = {'name': m.group(1), 'type': m.group(2).strip(), 'desc': m.group(3).strip()}
                elif current_arg:
                    current_arg['desc'] += ' ' + stripped
        elif current_section == 'returns':
            if stripped:
                returns_lines.append(stripped)
        elif current_section == 'raises':
            if stripped:
                m = re.match(r'(\w+(?:\.\w+)*)\s*:\s*(.*)', stripped)
                if m:
                    raises.append({'type': m.group(1), 'desc': m.group(2).strip()})
                elif raises:
                    raises[-1]['desc'] += ' ' + stripped
        elif current_section == 'extra':
            if stripped.startswith('- '):
                if extra_sections:
                    extra_sections[-1]['items'].append(stripped[2:])
            elif stripped:
                if extra_sections:
                    extra_sections[-1]['items'].append(stripped)

    if current_arg:
        args.append(current_arg)

    description = ' '.join(l for l in description_lines if l)
    returns = ' '.join(returns_lines) if returns_lines else None

    return {
        'description': description,
        'args': args,
        'returns': returns,
        'raises': raises,
        'extra_sections': extra_sections,
    }


def _get_method_signature(func_node):
    """Build a human-readable parameter string from an AST FunctionDef node."""
    arg_names = [a.arg for a in func_node.args.args]
    if arg_names and arg_names[0] == 'self':
        arg_names = arg_names[1:]
    defaults = func_node.args.defaults
    offset = len(arg_names) - len(defaults)
    parts = []
    for i, name in enumerate(arg_names):
        di = i - offset
        if di >= 0:
            try:
                val = ast.literal_eval(defaults[di])
                parts.append(f'{name}={repr(val)}')
            except Exception:
                parts.append(f'{name}=...')
        else:
            parts.append(name)
    if func_node.args.vararg:
        parts.append(f'*{func_node.args.vararg.arg}')
    if func_node.args.kwarg:
        parts.append(f'**{func_node.args.kwarg.arg}')
    return ', '.join(parts)


def render_python_method_html(func_node):
    """Render a single Python method/function as a collapsible <details> block."""
    name = func_node.name
    docstring = ast.get_docstring(func_node) or ''
    info = parse_google_docstring(docstring)
    sig = _get_method_signature(func_node)

    parts = ['<details class="api-func">']
    parts.append(f'<summary class="api-sig"><code>{html.escape(name)}({html.escape(sig)})</code></summary>')
    parts.append('<div class="api-func-body">')

    if info['description']:
        parts.append(f'<p class="api-desc">{html.escape(info["description"])}</p>')

    for extra in info['extra_sections']:
        parts.append(f'<p><strong>{html.escape(extra["name"])}:</strong></p>')
        if extra['items']:
            parts.append('<ul>')
            for item in extra['items']:
                parts.append(f'  <li>{html.escape(item)}</li>')
            parts.append('</ul>')

    if info['args']:
        parts.append('<table class="api-params">')
        parts.append('<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>')
        for a in info['args']:
            parts.append(
                f'<tr><td><code>{html.escape(a["name"])}</code></td>'
                f'<td><code>{html.escape(a["type"])}</code></td>'
                f'<td>{html.escape(a["desc"])}</td></tr>'
            )
        parts.append('</tbody></table>')

    if info['returns']:
        ret_text = info['returns']
        m = re.match(r'^([^:\u2014]+)[:\u2014]\s*(.*)', ret_text)
        if m:
            ret_type = m.group(1).strip()
            ret_desc = m.group(2).strip()
            parts.append(
                f'<p class="api-returns"><strong>Returns:</strong> '
                f'<code>{html.escape(ret_type)}</code>'
                + (f' \u2014 {html.escape(ret_desc)}' if ret_desc else '')
                + '</p>'
            )
        else:
            parts.append(f'<p class="api-returns"><strong>Returns:</strong> {html.escape(ret_text)}</p>')

    for r in info['raises']:
        parts.append(
            f'<p class="api-throws"><strong>Raises:</strong> '
            f'<code>{html.escape(r["type"])}</code>'
            + (f' \u2014 {html.escape(r["desc"])}' if r['desc'] else '')
            + '</p>'
        )

    parts.append('</div></details>')
    return '\n'.join(parts)


def render_python_class_html(class_node):
    """Render a Python class with collapsible per-method documentation."""
    class_doc = ast.get_docstring(class_node) or ''
    info = parse_google_docstring(class_doc)
    methods = [
        item for item in class_node.body
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]

    parts = ['<details class="tool-section">']
    parts.append(f'<summary><code>{html.escape(class_node.name)}</code></summary>')
    parts.append('<div class="module-header">')

    if info['description']:
        parts.append(f'<p>{html.escape(info["description"])}</p>')

    if methods:
        parts.append('<details class="api-functions-section">')
        parts.append(
            f'<summary><strong>Methods</strong>'
            f'<span class="api-func-count"> ({len(methods)})</span></summary>'
        )
        parts.append('<div class="api-functions">')
        for method in methods:
            parts.append(render_python_method_html(method))
        parts.append('</div></details>')

    parts.append('</div></details>')
    return '\n'.join(parts)


def render_python_api(root_dir, output_path):
    py_path = os.path.join(root_dir, "Server.py")
    module = ast.parse(read_text(py_path))
    docstring = ast.get_docstring(module) or ""

    parts = [
        '<div class="breadcrumb">QGas / API / Python</div>',
        '<h1>Python API: Server.py</h1>',
        '<p>This page is generated automatically from <code>Server.py</code> during docs builds.</p>',
        '<h2>Module Overview</h2>',
        '<pre><span></span><code>' + html.escape(docstring) + '</code></pre>',
    ]

    classes = [node for node in module.body if isinstance(node, ast.ClassDef)]
    if classes:
        parts.append('<h2>Classes</h2>')
        for cls in classes:
            parts.append(render_python_class_html(cls))

    top_funcs = [
        node for node in module.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and not node.name.startswith('_')
    ]
    if top_funcs:
        parts.append('<h2>Module-level Functions</h2>')
        parts.append('<details class="api-functions-section" open>')
        parts.append(
            f'<summary><strong>Functions</strong>'
            f'<span class="api-func-count"> ({len(top_funcs)})</span></summary>'
        )
        parts.append('<div class="api-functions">')
        for fn in top_funcs:
            parts.append(render_python_method_html(fn))
        parts.append('</div></details>')

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
