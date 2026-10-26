#!/usr/bin/env bash
echo "==================================================================="
echo "  Starting MyDocs Cloud & File Sharing System..."
echo "==================================================================="
echo "Opening browser at http://localhost:5000 ..."
sleep 1
if which xdg-open > /dev/null; then
  xdg-open http://localhost:5000 &
elif which open > /dev/null; then
  open http://localhost:5000 &
fi
node server.js
