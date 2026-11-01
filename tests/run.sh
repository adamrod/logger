#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
JSC=${JSC:-/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc}
[ -x "$JSC" ] && exec "$JSC" -m tests/run.js
exec node --import ./tests/node-globals.js tests/run.js
