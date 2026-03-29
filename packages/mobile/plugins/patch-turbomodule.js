/**
 * Expo config plugin that patches RCTTurboModule.mm to fix SIGABRT crash
 * on iOS 26 when a void TurboModule method throws an NSException on the
 * async dispatch queue (com.meta.react.turbomodulemanager.queue).
 *
 * See: https://github.com/facebook/react-native/issues/54859
 *
 * Strategy:
 *   - expo-build-properties handles buildReactNativeFromSource (in app.json)
 *   - pnpm patchedDependencies patches the source in node_modules
 *   - This plugin injects a post_install hook as a safety net to also
 *     patch the Pods copy of RCTTurboModule.mm after pod install
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PATCH_SCRIPT = `#!/usr/bin/env ruby
# patch-turbomodule.rb — Patches RCTTurboModule.mm for iOS 26 SIGABRT fix
# See: https://github.com/facebook/react-native/issues/54859

pods_root = ARGV[0]
abort "Usage: patch-turbomodule.rb <pods_root>" unless pods_root

turbo_files = Dir.glob(File.join(pods_root, '**', 'RCTTurboModule.mm'))
if turbo_files.empty?
  puts "[patch-turbomodule] No RCTTurboModule.mm found in \#{pods_root}"
  exit 0
end

turbo_files.each do |turbo_mm|
  source = File.read(turbo_mm)

  if source.include?('shouldVoidMethodsExecuteSync_)')
    puts "[patch-turbomodule] Already patched: \#{turbo_mm}"
    next
  end

  original = '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);'

  unless source.include?(original)
    puts "[patch-turbomodule] Pattern not found in: \#{turbo_mm}"
    next
  end

  lines = [
    '      if (shouldVoidMethodsExecuteSync_) {',
    '            throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);',
    '          } else {',
    '            NSString *message = [NSString stringWithFormat:',
    '              @"Exception in void TurboModule method %s.%s: %s",',
    '              moduleName,',
    '              methodNameStr.c_str(),',
    '              exception.reason ? exception.reason.UTF8String : "(no reason)"];',
    '            RCTLogError(@"%s", message.UTF8String);',
    '          }',
  ]
  replacement = lines.join("\\n")

  patched_source = source.sub(original, replacement)
  File.write(turbo_mm, patched_source)
  puts "[patch-turbomodule] Patched: \#{turbo_mm}"
end
`;

const PODFILE_INJECTION = `
    # ── patch-turbomodule: fix iOS 26 SIGABRT in performVoidMethodInvocation ──
    system('ruby', File.join(__dir__, 'patch-turbomodule.rb'), installer.sandbox.root.to_s)`;

function patchTurboModule(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosDir = config.modRequest.platformProjectRoot;
      const podfilePath = path.join(iosDir, "Podfile");
      const scriptPath = path.join(iosDir, "patch-turbomodule.rb");

      // ── Step 1: Write the Ruby patch script ──
      fs.writeFileSync(scriptPath, PATCH_SCRIPT, { mode: 0o755 });

      // ── Step 2: Inject into Podfile post_install ──
      if (!fs.existsSync(podfilePath)) {
        console.warn("[patch-turbomodule] Podfile not found at", podfilePath);
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes("patch-turbomodule")) {
        console.log("[patch-turbomodule] Podfile already contains patch");
        return config;
      }

      const marker = "react_native_post_install(";
      const markerIdx = podfile.indexOf(marker);

      if (markerIdx === -1) {
        console.warn(
          "[patch-turbomodule] Could not find react_native_post_install"
        );
        return config;
      }

      // Find the closing paren of react_native_post_install(...)
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
      console.log(
        "[patch-turbomodule] Updated Podfile with patch hook"
      );

      return config;
    },
  ]);
}

module.exports = patchTurboModule;
