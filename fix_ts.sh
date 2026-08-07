#!/bin/bash
sed -i 's/import React from "react";//' src/components/AssetsView.tsx
sed -i 's/import React from "react";//' src/components/CyberAgentView.tsx
sed -i 's/import { useAppStore } from "..\/store\/useAppStore";//' src/components/AuthView.tsx
sed -i 's/const DOC_RESPONSES/export const DOC_RESPONSES/' src/components/DocsView.tsx
sed -i 's/PlayCircle, //g' src/components/GlobalSearch.tsx
sed -i 's/AlertCircle, //g' src/components/GlobalSearch.tsx
sed -i 's/API_ENDPOINTS.INTERNET_ARCHIVE/API_ENDPOINTS.ARCHIVE/g' src/components/GlobalSearch.tsx
sed -i 's/Search, //g' src/components/Header.tsx
sed -i 's/\x27ai-code\x27: \x27AI Code\x27,/\x27ai-code\x27: \x27AI Code\x27, assets: \x27Assets\x27,/g' src/components/Header.tsx
sed -i 's/CreditCard, //g' src/components/HelpFaqView.tsx
sed -i 's/ScanLine, //g' src/components/HelpFaqView.tsx
sed -i 's/ServiceTicket //g' src/components/HelpFaqView.tsx
sed -i 's/const blob/const _blob/g' src/components/ImageView.tsx
sed -i 's/const a/const _a/g' src/components/ImageView.tsx
sed -i 's/AlertTriangle, //g' src/components/PrintingView.tsx
sed -i 's/const formatExists/const _formatExists/g' src/components/SearchEngineView.tsx
sed -i 's/const bgColor =/const _bgColor =/g' src/server/agent.ts
sed -i 's/import path from "path";//' src/server/pdf-ai.ts
sed -i 's/networkidle0/domcontentloaded/g' src/server/pdf-ai.ts
sed -i 's/import { chatWithGemini } from "..\/lib\/gemini";//' src/store/useAppStore.ts
sed -i 's/login: (email, name/login: (_email, _name/g' src/store/useAppStore.ts

