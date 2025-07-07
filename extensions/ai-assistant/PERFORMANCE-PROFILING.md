# Performance Profiling System

## Vue d'ensemble

Ce système de profiling complet a été implémenté pour analyser les performances de toutes les opérations de l'AI Assistant, avec un focus particulier sur la comparaison entre Whisper local et cloud.

## Architecture

### Composants principaux

1. **PerformanceProfiler** (`src/utils/performance-profiler.ts`)
   - Profiler centralisé singleton
   - Gestion des sessions de profiling
   - Persistence en LocalStorage et fichiers JSONL
   - Métriques détaillées avec métadonnées

2. **Enhanced Timing** (`src/utils/timing.ts`)
   - Extension du système de timing existant
   - Intégration transparente avec le profiler
   - Rétrocompatibilité

3. **Performance Stats UI** (`src/performance-stats.tsx`)
   - Interface utilisateur pour visualiser les statistiques
   - Comparaisons Local vs Cloud
   - Seuils de performance avec codes couleur

## Métriques collectées

### Transcription (Focus principal)
- **Local Whisper/Parakeet**:
  - Temps de transcription
  - Modèle utilisé (tiny, base, small, medium)
  - Engine (whisper/parakeet)
  - Taille du fichier audio
  - Architecture système (M1/M2/M3)

- **Cloud (OpenAI)**:
  - Temps de transcription
  - Modèle gpt-4o utilisé
  - Latence réseau incluse

### Autres opérations
- **LLM Operations**: Temps de génération de texte
- **Audio Recording**: Durée d'enregistrement
- **File Operations**: I/O performance
- **Memory Usage**: Consommation mémoire

## Utilisation

### Dans le code

```typescript
import { performanceProfiler, measureTimeAdvanced } from "./utils/performance-profiler";

// Démarrer une session
await performanceProfiler.startSession("command-name");

// Mesurer une opération avec métadonnées
const result = await measureTimeAdvanced("operation-name", async () => {
  return await someOperation();
}, {
  mode: "local", // ou "cloud"
  model: "base",
  engine: "whisper",
  audioLength: fileSize,
  // autres métadonnées pertinentes...
});

// Terminer la session
await performanceProfiler.endSession();
```

### Interface utilisateur

Accédez à **Performance Statistics** dans Raycast pour voir :
- Statistiques resumées
- Comparaisons Local vs Cloud
- Tendances par opération
- Détails par échantillon

## Données collectées

### Format des sessions
```typescript
interface PerformanceSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  command: string;
  metrics: PerformanceMetric[];
  totalDuration?: number;
}
```

### Format des métriques
```typescript
interface PerformanceMetric {
  timestamp: number;
  command: string;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: {
    mode?: string;           // "local" | "transcribe" | "online"
    model?: string;          // Modèle utilisé
    engine?: string;         // "whisper" | "parakeet"
    audioLength?: number;    // Taille fichier audio
    textLength?: number;     // Longueur du texte
    language?: string;       // Langue détectée
    platform?: string;       // macOS/Linux/Windows
    arch?: string;          // arm64/x64
    memory?: number;        // Utilisation mémoire
    error?: string;         // Message d'erreur si échec
  };
}
```

## Stockage des données

### LocalStorage
- Maximum 100 sessions récentes
- Accès rapide pour l'UI
- Nettoyage automatique

### Fichiers JSONL
- Format : `performance-logs/perf-YYYY-MM-DD.jsonl`
- Une ligne JSON par session
- Idéal pour analyse long terme
- Archivage permanent

## Analyse et insights

### Seuils de performance

#### Transcription
- 🟢 **Excellent**: < 2s
- 🟡 **Acceptable**: 2-5s  
- 🔴 **Lent**: > 5s

#### LLM Operations
- 🟢 **Excellent**: < 3s
- 🟡 **Acceptable**: 3-8s
- 🔴 **Lent**: > 8s

### Comparaisons attendues

Sur un MacBook M3, nous nous attendons à :
- **Whisper Local (base)**: 3-8s selon la longueur audio
- **Whisper Cloud**: 2-4s + latence réseau
- **Parakeet (si applicable)**: 1-3s (ultra-rapide)

## Intégration dans les commandes

### Commandes avec profiling complet
- ✅ `dictate-prompt` - Complet avec métadonnées Whisper
- ✅ `dictate` - Session de base ajoutée
- ⚠️ `translate` - Session de base ajoutée
- ⚠️ `summarize-page` - À implémenter

### Pattern d'implémentation
```typescript
export default async function Command() {
  await performanceProfiler.startSession("command-name");
  
  try {
    // Opérations avec measureTimeAdvanced()
    const result = await measureTimeAdvanced("operation", async () => {
      // travail...
    }, { metadata });
    
    await performanceProfiler.endSession();
  } catch (error) {
    await performanceProfiler.endSession(); // Important en cas d'erreur
    throw error;
  }
}
```

## Nettoyage et maintenance

- **Automatique**: Garde 30 jours de données par défaut
- **Manuel**: Commande "Clean Old Performance Data" dans l'UI
- **Fichiers**: Nettoyage des anciens fichiers JSONL

## Objectifs de performance

Ce système nous permettra de :
1. **Quantifier** réellement la différence Local vs Cloud
2. **Optimiser** les modèles selon le matériel
3. **Identifier** les goulots d'étranglement
4. **Recommander** les meilleurs paramètres par utilisateur
5. **Surveiller** la dégradation de performance

## Notes d'usage

- Le profiling a un impact minimal sur les performances (< 1ms overhead)
- Les logs sont stockés localement uniquement
- Les métadonnées système aident à corréler avec le matériel
- L'interface permet l'export pour analyse externe

## Prochaines étapes

1. Collecter des données pendant plusieurs semaines
2. Analyser les patterns par type de matériel
3. Implémenter des recommandations automatiques
4. Ajouter des alertes de performance
5. Optimiser les modèles selon les résultats