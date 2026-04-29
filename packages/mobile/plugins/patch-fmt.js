/**
 * Expo config plugin that patches the fmt library for Xcode 26 consteval
 * errors. The FMT_STRING macro uses consteval which newer Clang rejects.
 * Fix: replace FMT_STRING(...) with plain string literals (fmt::format_to
 * accepts const char* format strings).
 *
 * Writes `ios/patch-fmt.rb` and injects a post_install hook that runs it.
 * Paired with patch-turbomodule.js — both are survival patches for iOS 26
 * / Xcode 26 that would otherwise be wiped by `expo prebuild --clean`.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PATCH_SCRIPT = `#!/usr/bin/env ruby
# patch-fmt.rb — Patches fmt library for Xcode 26 consteval errors
# The FMT_STRING macro uses consteval which newer Clang rejects.
# Fix: replace FMT_STRING(...) with plain string literals, which work
# because fmt::format_to accepts const char* format strings.

pods_root = ARGV[0]
abort "Usage: patch-fmt.rb <pods_root>" unless pods_root

fmt_file = File.join(pods_root, 'fmt', 'include', 'fmt', 'format-inl.h')
unless File.exist?(fmt_file)
  puts "[patch-fmt] format-inl.h not found at \#{fmt_file}"
  exit 0
end

source = File.read(fmt_file)

if source.include?('// patched-for-xcode26')
  puts "[patch-fmt] Already patched: \#{fmt_file}"
  exit 0
end

# Replace FMT_STRING("...") with just "..." throughout the file
patched = source.gsub(/FMT_STRING\\((".*?")\\)/, '\\1')

# Add marker so we don't re-patch
patched = "// patched-for-xcode26\\n" + patched

# Pods files are read-only; make writable before writing
File.chmod(0644, fmt_file)
File.write(fmt_file, patched)
puts "[patch-fmt] Patched: \#{fmt_file}"
`;

const PODFILE_INJECTION = `
    # ── patch-fmt: fix Xcode 26 consteval error in fmt library ──
    system('ruby', File.join(__dir__, 'patch-fmt.rb'), installer.sandbox.root.to_s)`;

function patchFmt(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosDir = config.modRequest.platformProjectRoot;
      const podfilePath = path.join(iosDir, "Podfile");
      const scriptPath = path.join(iosDir, "patch-fmt.rb");

      fs.writeFileSync(scriptPath, PATCH_SCRIPT, { mode: 0o755 });

      if (!fs.existsSync(podfilePath)) {
        console.warn("[patch-fmt] Podfile not found at", podfilePath);
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes("patch-fmt")) {
        console.log("[patch-fmt] Podfile already contains patch");
        return config;
      }

      const marker = "react_native_post_install(";
      const markerIdx = podfile.indexOf(marker);

      if (markerIdx === -1) {
        console.warn("[patch-fmt] Could not find react_native_post_install");
        return config;
      }

      let depth = 0;
      let i = markerIdx + marker.length;
      for (; i < podfile.length; i++) {
        if (podfile[i] === "(") depth++;
        if (podfile[i] === ")") {
          if (depth === 0) break;
          depth--;
        }
      }
      const lineEnd = podfile.indexOf("\n", i);

      podfile =
        podfile.slice(0, lineEnd) +
        "\n" +
        PODFILE_INJECTION +
        "\n" +
        podfile.slice(lineEnd);

      fs.writeFileSync(podfilePath, podfile, "utf8");
      console.log("[patch-fmt] Updated Podfile with patch hook");

      return config;
    },
  ]);
}

module.exports = patchFmt;
