#!/usr/bin/env ruby
# patch-fmt.rb — Patches fmt library for Xcode 26 consteval errors
# The FMT_STRING macro uses consteval which newer Clang rejects.
# Fix: replace FMT_STRING(...) with plain string literals, which work
# because fmt::format_to accepts const char* format strings.

pods_root = ARGV[0]
abort "Usage: patch-fmt.rb <pods_root>" unless pods_root

fmt_file = File.join(pods_root, 'fmt', 'include', 'fmt', 'format-inl.h')
unless File.exist?(fmt_file)
  puts "[patch-fmt] format-inl.h not found at #{fmt_file}"
  exit 0
end

source = File.read(fmt_file)

if source.include?('// patched-for-xcode26')
  puts "[patch-fmt] Already patched: #{fmt_file}"
  exit 0
end

# Replace FMT_STRING("...") with just "..." throughout the file
patched = source.gsub(/FMT_STRING\((".*?")\)/, '\1')

# Add marker so we don't re-patch
patched = "// patched-for-xcode26\n" + patched

# Pods files are read-only; make writable before writing
File.chmod(0644, fmt_file)
File.write(fmt_file, patched)
puts "[patch-fmt] Patched: #{fmt_file}"
