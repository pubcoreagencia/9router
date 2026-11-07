# MASTER CONTEXT — 9Router (Upstream Fork)

**Identificador Canônico:** `9router`  
**Vertical:** Infraestrutura de IA & Proxy Gateway  
**Holding:** PUB Core Holding  
**Papel:** Fork upstream e dashboard web do 9Router  
**Status de Maturidade:** ONLINE / UPSTREAM FORK  
**Nível de Prioridade:** ALTA  
**Data de Alinhamento:** 2026-11-06  

---

## 1. Visão Executiva & Propósito
O `9router` é o fork upstream mantido pela holding para roteamento unificado de provedores de IA (OpenAI, Anthropic, Gemini, Groq, Cloudflare AI Whisper STT, Jina Reader), servindo como proxy de inteligência para agentes de codificação e ferramentas autônomas da PUB.

---

## 2. Relação com Infraestrutura em Nuvem
- **Código da Aplicação:** Este repositório (`pubcoreagencia/9router`).
- **Orquestração VPS & Deployment:** Gerenciado via `pubcoreagencia/pub-9router-cloud` (docker-compose, persistência RPC e snapshots).
- **Ingestão Vetorial:** Excluído do registry de conhecimento first-party do `pub-neural` por conter código de terceiros.
