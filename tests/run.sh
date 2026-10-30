#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
JSC=${JSC:-/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc}
exec "$JSC" -m tests/run.js
