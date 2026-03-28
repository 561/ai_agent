#!/bin/bash
if [ -f "/opt/AI Agent/chrome-sandbox" ]; then
  chown root "/opt/AI Agent/chrome-sandbox"
  chmod 4755 "/opt/AI Agent/chrome-sandbox"
fi
