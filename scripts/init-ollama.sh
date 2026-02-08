#!/bin/sh

# Initialize Ollama with recommended models for Dynasty Chaos Tracker

echo "Waiting for Ollama service to be ready..."
sleep 5

echo "Pulling Llama 3.1 8B model (recommended for OCR and chat)..."
ollama pull llama3.1:8b

echo "Testing model..."
ollama run llama3.1:8b "Test message" --verbose

echo "Ollama initialization complete!"
echo "Available models:"
ollama list

echo ""
echo "Ollama is ready to use!"
echo "- OCR Post-Processing: llama3.1:8b"
echo "- Chat Assistant: llama3.1:8b"
echo ""
echo "You can also try other models:"
echo "  ollama pull mistral:7b      # Alternative lightweight model"
echo "  ollama pull llama3.1:70b    # Higher accuracy (requires more resources)"
