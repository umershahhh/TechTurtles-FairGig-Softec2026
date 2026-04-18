#!/bin/bash
# Convenience script — opens all services in new terminal tabs (macOS / Linux with gnome-terminal)
# Usage: ./start-all.sh

echo "Starting all FairGig services..."

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS - uses AppleScript to open new Terminal tabs
  osascript <<APPLE
    tell application "Terminal"
      do script "cd $(pwd)/auth-service && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8001"
      do script "cd $(pwd)/earnings-service && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8002"
      do script "cd $(pwd)/anomaly-service && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8003"
      do script "cd $(pwd)/grievance-service && npm install -s && npm start"
      do script "cd $(pwd)/analytics-service && npm install -s && npm start"
      do script "cd $(pwd)/frontend && npm install -s && npm run dev"
    end tell
APPLE
else
  echo "Manual start required. See TASK.md for commands."
  echo ""
  echo "Tab 1: cd auth-service     && pip install -r requirements.txt && uvicorn main:app --reload --port 8001"
  echo "Tab 2: cd earnings-service && pip install -r requirements.txt && uvicorn main:app --reload --port 8002"
  echo "Tab 3: cd anomaly-service  && pip install -r requirements.txt && uvicorn main:app --reload --port 8003"
  echo "Tab 4: cd grievance-service && npm install && npm start"
  echo "Tab 5: cd analytics-service && npm install && npm start"
  echo "Tab 6: cd frontend          && npm install && npm run dev"
fi
