#!/usr/bin/env ruby
# patch-turbomodule.rb — Patches RCTTurboModule.mm for iOS 26 SIGABRT fix
# See: https://github.com/facebook/react-native/issues/54859

pods_root = ARGV[0]
abort "Usage: patch-turbomodule.rb <pods_root>" unless pods_root

turbo_files = Dir.glob(File.join(pods_root, '**', 'RCTTurboModule.mm'))
if turbo_files.empty?
  puts "[patch-turbomodule] No RCTTurboModule.mm found in #{pods_root}"
  exit 0
end

turbo_files.each do |turbo_mm|
  source = File.read(turbo_mm)

  if source.include?('shouldVoidMethodsExecuteSync_)')
    puts "[patch-turbomodule] Already patched: #{turbo_mm}"
    next
  end

  original = '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);'

  unless source.include?(original)
    puts "[patch-turbomodule] Pattern not found in: #{turbo_mm}"
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
  replacement = lines.join("\n")

  patched_source = source.sub(original, replacement)
  File.write(turbo_mm, patched_source)
  puts "[patch-turbomodule] Patched: #{turbo_mm}"
end
