#!/bin/sh
# Entrypoint for Kenyx runner containers

# Save entire payload to a temporary file to avoid variable expansion issues
cat > /tmp/payload

# Extract CODE: All lines BEFORE the separator
sed '/---KENYX-SEP---/,$d' /tmp/payload > /workspace/"$FILENAME"

# Extract INPUT: All lines AFTER the separator
sed '1,/---KENYX-SEP---/d' /tmp/payload > /workspace/input.txt

# Always work from /workspace so javac/java find the files
cd /workspace || exit 1

# Run compilation if provided — print errors to stderr so backend captures them
if [ -n "$COMPILE_CMD" ]; then
  COMPILE_OUTPUT=$(eval "$COMPILE_CMD" 2>&1)
  COMPILE_EXIT=$?
  if [ $COMPILE_EXIT -ne 0 ]; then
    echo "$COMPILE_OUTPUT" >&2
    exit 1
  fi
fi

if [ -z "$RUN_CMD" ]; then
  echo "Error: No RUN_CMD provided" >&2
  exit 1
fi

# Execute the runner with input piped, from /workspace
exec sh -c "cd /workspace && $RUN_CMD" < /workspace/input.txt
