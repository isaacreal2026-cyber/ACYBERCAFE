#!/bin/bash
sed -i 's/import React,/import /g' src/components/AssetsView.tsx
sed -i 's/import React,/import /g' src/components/CyberAgentView.tsx
sed -i '/import { useAppStore } from "..\/store\/useAppStore";/d' src/components/AuthView.tsx
sed -i 's/AlertCircle, //g' src/components/GlobalSearch.tsx
sed -i 's/const _blob/const blob/g' src/components/ImageView.tsx
sed -i 's/const _a/const a/g' src/components/ImageView.tsx
sed -i 's/const _activeToolData =/const activeToolData =/g' src/components/ImageView.tsx
sed -i 's/const _allImages =/const allImages =/g' src/components/ImageView.tsx
sed -i 's/const _formatExists/const formatExists/g' src/components/SearchEngineView.tsx
sed -i 's/const _bgColor/const bgColor/g' src/server/agent.ts
sed -i '/import { chatWithGemini } from "..\/lib\/gemini";/d' src/store/useAppStore.ts

