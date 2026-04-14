"""
MkDocs build hook – regenerates API reference pages from source before each build.

Registered in mkdocs.yml under `hooks:`. Runs automatically locally and on
ReadTheDocs so the API docs always reflect the current state of the codebase.
"""
import sys
import os


def on_pre_build(config):
    tools_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tools")
    if tools_dir not in sys.path:
        sys.path.insert(0, tools_dir)
    import generate_api_docs
    generate_api_docs.main()
