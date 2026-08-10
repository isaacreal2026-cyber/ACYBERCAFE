import os
import re

def find_large_files(directory, threshold=300):
    large_files = []
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root or 'dist' in root or '.git' in root:
            continue
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        if len(lines) > threshold:
                            large_files.append((filepath, len(lines)))
                except Exception as e:
                    pass
    return sorted(large_files, key=lambda x: x[1], reverse=True)

def find_duplicate_blocks(directory, min_lines=6):
    lines_map = {}
    duplicates = []

    # Simple block hash matcher
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root or 'dist' in root or '.git' in root:
            continue
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        lines = [l.strip() for l in f.readlines()]

                        # Compare sliding windows of min_lines
                        for i in range(len(lines) - min_lines + 1):
                            window = tuple(lines[i:i+min_lines])
                            # skip empty or purely brace windows
                            all_empty_or_braces = all(not w or w in ['}', '{', '};', '},', '],', ']', '[', '() => {'] for w in window)
                            if all_empty_or_braces:
                                continue

                            if window in lines_map:
                                lines_map[window].append((filepath, i + 1))
                            else:
                                lines_map[window] = [(filepath, i + 1)]
                except Exception as e:
                    pass

    for window, occurrences in lines_map.items():
        if len(occurrences) > 1:
            # Filter duplicates in different places or files
            unique_occurrences = list(set(occurrences))
            if len(unique_occurrences) > 1:
                duplicates.append((window, unique_occurrences))

    return duplicates

def check_missing_documentation(directory):
    undocumented = []
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root or 'dist' in root or '.git' in root:
            continue
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Simple regex for function/class definitions
                        # matches: function name(...), const name = (...) =>, class name
                        funcs = re.findall(r'(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>|class\s+(\w+))', content)
                        total_funcs = len(funcs)
                        # Check for JSDoc / comments
                        has_comments = '/**' in content or '/*' in content or '//' in content
                        if total_funcs > 5 and not has_comments:
                            undocumented.append((filepath, total_funcs))
                except Exception as e:
                    pass
    return undocumented

def main():
    print("=== Analyzing Codebase ===")
    large_files = find_large_files('.')
    print(f"\nFound {len(large_files)} files exceeding threshold:")
    for filepath, length in large_files:
        print(f"  {filepath}: {length} lines")

    print("\nDetecting Duplicate Blocks (min 6 identical lines)...")
    duplicates = find_duplicate_blocks('.')
    # Let's filter duplicates to show the most significant ones
    duplicates = sorted(duplicates, key=lambda x: len(x[1]), reverse=True)
    seen_files_pairs = set()
    print(f"Found duplicate pattern candidates:")
    count = 0
    for window, occurrences in duplicates[:15]:
        locs = ", ".join([f"{f}:{l}" for f, l in occurrences])
        # Print if the window is substantial
        snippet = " | ".join([w for w in window if w])[:100]
        print(f"  Pattern: \"{snippet}\"")
        print(f"    Occurrences: {locs}")
        count += 1

    print("\nAnalyzing Undocumented Files...")
    undoc = check_missing_documentation('.')
    for filepath, funcs in undoc:
        print(f"  {filepath}: {funcs} functions with little or no documentation comments")

if __name__ == "__main__":
    main()
