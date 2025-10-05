# DOCUMENTACIÓN DEL CÓDIGO - HABITATX
# Plataforma de Diseño de Hábitats Espaciales Hexagonales

================================================================================
ESTRUCTURA DEL PROYECTO
================================================================================

Este proyecto está organizado en las siguientes carpetas principales:

/lib          - Utilidades y lógica de negocio central
/data         - Catálogos de zonas y objetos
/rules        - Sistema de validación de reglas
/store        - Gestión de estado global con Zustand
/components   - Componentes React de la interfaz
/app          - Páginas y layout de Next.js

================================================================================
ARCHIVOS PRINCIPALES Y SUS FUNCIONES
================================================================================

────────────────────────────────────────────────────────────────────────────────
1. TIPOS Y DEFINICIONES (lib/types.ts)
────────────────────────────────────────────────────────────────────────────────

FUNCIÓN PRINCIPAL:
Define todas las interfaces TypeScript y tipos de datos utilizados en el proyecto.

TIPOS CLAVE:
- HexCoord: Coordenadas hexagonales axiales (q, r)
- Zone: Zona del hábitat con anillo, capacidad, celdas y tags permitidos
- HabitatObject: Objeto/equipo que se coloca en el hábitat
- Placement: Colocación de un objeto en celdas específicas
- ValidationResult: Resultado de validación con reglas pasadas/falladas
- HabitatInputs: Parámetros de entrada (tripulación, duración, funciones)
- HabitatState: Estado completo del hábitat

IMPORTANCIA:
Es la base de todo el sistema de tipos. Todos los demás archivos importan
estos tipos para garantizar consistencia y seguridad de tipos.

────────────────────────────────────────────────────────────────────────────────
2. MATEMÁTICAS HEXAGONALES (lib/hex.ts)
────────────────────────────────────────────────────────────────────────────────

FUNCIÓN PRINCIPAL:
Proporciona todas las operaciones matemáticas para trabajar con coordenadas
hexagonales en un sistema de coordenadas axiales.

FUNCIONES CLAVE:
- axialToPixel(): Convierte coordenadas hex (q,r) a píxeles (x,y)
- pixelToAxial(): Convierte píxeles a coordenadas hexagonales
- hexDistance(): Calcula distancia entre dos hexágonos
- hexRing(): Genera un anillo de hexágonos a distancia N del centro
- hexagonOfRadius(): Genera todos los hexágonos dentro de un radio
- getRingType(): Determina si un hex está en core/mid/outer
- hexNeighbors(): Obtiene los 6 vecinos de un hexágono
- hexToKey() / keyToHex(): Conversión hex ↔ string para mapas

ALGORITMO BASE:
Usa coordenadas axiales (q, r) con orientación flat-top (hexágonos con
lado plano arriba). Basado en: https://www.redblobgames.com/grids/hexagons/

IMPORTANCIA:
Es el motor matemático de todo el sistema. Sin estas funciones, no se podría
generar la cuadrícula, calcular distancias, o determinar vecindad.

────────────────────────────────────────────────────────────────────────────────
3. DIMENSIONAMIENTO (lib/dimensioning.ts)
────────────────────────────────────────────────────────────────────────────────

FUNCIÓN PRINCIPAL:
Calcula el tamaño óptimo del hábitat basado en los parámetros de entrada.

FUNCIONES CLAVE:
- calculateRadius(): Calcula el radio del hábitat
  * Fórmula: totalSlots = A*crew + B*functions + C*(days/30)
  * A=8 slots por tripulante
  * B=12 slots por función
  * C=2 slots adicionales por mes
  * Resuelve: 3R² + 3R + 1 = totalSlots (fórmula de hexágono)
  
- calculateZoneCapacities(): Distribuye celdas entre anillos
  * Core: 25% del radio
  * Mid: 65% del radio
  * Outer: resto

IMPORTANCIA:
Determina automáticamente el tamaño del hábitat para que sea suficiente
pero no excesivo. Es el primer paso en la generación del hábitat.

────────────────────────────────────────────────────────────────────────────────
4. GENERADOR DE CUADRÍCULA (lib/grid-generator.ts)
────────────────────────────────────────────────────────────────────────────────

FUNCIÓN PRINCIPAL:
Genera la cuadrícula hexagonal completa y asigna celdas a zonas.

FUNCIONES CLAVE:
- generateGrid(): Genera todas las celdas y las distribuye a zonas
  * Usa hexagonOfRadius() para crear todas las celdas
  * Clasifica cada celda por anillo (core/mid/outer)
  * Asigna celdas a zonas según su preferencia de anillo
  
- findZoneForCell(): Encuentra a qué zona pertenece una celda

ALGORITMO:
1. Genera todas las celdas hexagonales dentro del radio
2. Agrupa celdas por tipo de anillo (core/mid/outer)
3. Distribuye celdas equitativamente entre zonas del mismo anillo
4. Actualiza la capacidad de cada zona con sus celdas asignadas

IMPORTANCIA:
Crea la estructura física del hábitat. Sin esto, no habría dónde colocar objetos.

────────────────────────────────────────────────────────────────────────────────
5. COLOCACIÓN AUTOMÁTICA (lib/auto-place.ts)
────────────────────────────────────────────────────────────────────────────────

FUNCIÓN PRINCIPAL:
Algoritmo heurístico greedy para colocar automáticamente todos los objetos
en el hábitat de manera óptima.

FUNCIONES CLAVE:
- autoPlaceObjects(): Coloca todos los objetos automáticamente
  * Ordena objetos por prioridad (sleep > galley > hygiene > eclss...)
  * Para cada objeto, encuentra la mejor colocación
  * Marca celdas como ocupadas progresivamente
  
- findBestPlacement(): Encuentra la mejor ubicación para un objeto
  * Filtra zonas compatibles (tags y capacidad)
  * Genera candidatos de colocación
  * Puntúa cada candidato
  * Valida y retorna el mejor
  
- findContiguousCells(): Encuentra N celdas contiguas para objetos multi-celda
  * Usa búsqueda en anchura (BFS) desde una celda semilla
  * Garantiza que las celdas estén conectadas
  
- scorePlacement(): Puntúa una colocación candidata
  * +50 puntos: ECLSS en core
  * +40 puntos: Living en mid, noisy en outer
  * +30 puntos: Galley cerca de stowage (≤3 celdas)
  * -2 puntos por celda de distancia al centro
  * +20 puntos por utilización eficiente de zona

ALGORITMO:
Greedy con heurísticas de puntuación. No garantiza solución óptima global,
pero encuentra soluciones buenas rápidamente.

IMPORTANCIA:
Permite generar hábitats completos con un clic. Es la "inteligencia" del
sistema que decide dónde va cada cosa.

────────────────────────────────────────────────────────────────────────────────
6. MÉTRICAS (lib/metrics.ts)
────────────────────────────────────────────────────────────────────────────────

FUNCIÓN PRINCIPAL:
Calcula estadísticas y métricas del hábitat generado.

FUNCIÓN PRINCIPAL:
- calculateMetrics(): Calcula todas las métricas del hábitat
  * Utilización de celdas (total, usado, libre, %)
  * Estadísticas por zona (capacidad, uso, %)
  * Estadísticas de objetos (total, colocados, %)
  * Volumen estimado (total, usado, por tripulante)
  * Masa estimada (basada en 500kg por celda)
  * Cobertura funcional (qué funciones están presentes)

CONSTANTES:
- CELL_DIAMETER_M = 2.0m (diámetro de celda)
- CELL_HEIGHT_M = 2.5m (altura de celda)
- CELL_VOLUME_M3 ≈ 8.66m³ (volumen de prisma hexagonal)
- MASS_PER_CELL_KG = 500kg (estructura + equipo)

IMPORTANCIA:
Proporciona feedback cuantitativo sobre el diseño. Permite evaluar si el
hábitat es eficiente, tiene suficiente espacio, y cumple requisitos.

────────────────────────────────────────────────────────────────────────────────
7. VALIDACIÓN (rules/validate.ts)
────────────────────────────────────────────────────────────────────────────────

FUNCIÓN PRINCIPAL:
Sistema de validación de reglas que verifica si las colocaciones son válidas.

FUNCIONES DE VALIDACIÓN:

1. validateCapacity() - HARD
   Verifica que la zona tenga suficientes slots libres

2. validateTags() - HARD
   Verifica que todos los tags del objeto estén permitidos en la zona

3. validateNoiseSeparation() - SOFT
   Objetos ruidosos deben estar ≥2 celdas de áreas de dormir

4. validateFunctionalAdjacency() - SOFT
   Galley debe estar ≤3 celdas de stowage

5. validateProhibitedZone() - HARD
   Objetos ruidosos no pueden estar en el anillo core

6. validateAccessibility() - SOFT
   Objetos no deben estar completamente rodeados (necesitan ≥1 vecino libre)

FUNCIONES PRINCIPALES:
- validatePlacement(): Valida una colocación individual contra todas las reglas
- validateLayout(): Valida el layout completo del hábitat

SEVERIDADES:
- HARD: Bloquea la colocación (error crítico)
- SOFT: Advertencia (no bloquea, pero no es ideal)

IMPORTANCIA:
Garantiza que los hábitats generados sean seguros, funcionales y cumplan
con las mejores prácticas de diseño espacial.

────────────────────────────────────────────────────────────────────────────────
8. GESTIÓN DE ESTADO (store/use-habitat.ts)
────────────────────────────────────────────────────────────────────────────────

FUNCIÓN PRINCIPAL:
Store de Zustand que gestiona todo el estado global de la aplicación.

ESTADO:
- inputs: Parámetros de entrada (crew, duration, functions)
- radius: Radio calculado del hábitat
- zones: Array de zonas con sus celdas
- objects: Array de objetos disponibles
- placements: Array de colocaciones actuales
- mode: "auto" o "manual"
- validationResults: Resultados de validación actuales
- isGenerating: Flag de carga

ACCIONES:
- setInputs(): Actualiza parámetros de entrada
- generateHabitat(): Genera hábitat completo desde inputs
  * Calcula radio
  * Crea zonas
  * Genera cuadrícula
  * Obtiene objetos necesarios
  * Si modo auto: coloca objetos automáticamente
  * Valida layout
  
- setMode(): Cambia entre auto/manual
- addPlacement(): Añade una colocación manual
- removePlacement(): Elimina una colocación
- updatePlacement(): Actualiza una colocación existente
- setValidationResults(): Actualiza resultados de validación
- reset(): Reinicia todo al estado inicial
- exportLayout(): Exporta layout a JSON
- importLayout(): Importa layout desde JSON

IMPORTANCIA:
Es el cerebro de la aplicación. Coordina todas las operaciones y mantiene
el estado sincronizado entre todos los componentes.

────────────────────────────────────────────────────────────────────────────────
9. CATÁLOGO DE ZONAS (data/catalog-zones.ts)
────────────────────────────────────────────────────────────────────────────────

FUNCIÓN PRINCIPAL:
Define las plantillas de zonas disponibles y crea zonas basadas en funciones.

ZONAS DISPONIBLES:
- Sleep Zone (mid): Para dormitorios, tags: [sleep, living]
- Galley Zone (mid): Para cocina/comedor, tags: [food, living]
- Hygiene Zone (mid): Para baños, tags: [hygiene, living]
- ECLSS Zone (core): Soporte vital, tags: [eclss, critical]
- Exercise Zone (outer): Gimnasio, tags: [exercise, noisy]
- Medical Zone (mid): Enfermería, tags: [medical, living]
- Stowage Zone (outer): Almacenamiento, tags: [storage]
- Command Zone (core): Centro de control, tags: [command, critical]

FUNCIÓN:
- createZones(): Crea instancias de zonas basadas en funciones seleccionadas

IMPORTANCIA:
Define qué tipos de áreas puede tener el hábitat y qué objetos pueden
ir en cada una.

────────────────────────────────────────────────────────────────────────────────
10. CATÁLOGO DE OBJETOS (data/catalog-objects.ts)
────────────────────────────────────────────────────────────────────────────────

FUNCIÓN PRINCIPAL:
Define todos los objetos/equipos disponibles para colocar en el hábitat.

OBJETOS DISPONIBLES:
- Sleep Pod (1 slot): Cápsula de dormir, tags: [sleep, living]
- Galley Unit (2 slots): Cocina, tags: [food, living]
- Hygiene Station (1 slot): Baño, tags: [hygiene, living]
- ECLSS Rack (1 slot): Soporte vital, tags: [eclss, critical]
- Exercise Equipment (1 slot): Gimnasio, tags: [exercise, noisy]
- Medical Bay (2 slots): Enfermería, tags: [medical, living]
- Stowage Rack (1 slot): Almacenamiento, tags: [storage]
- Command Console (1 slot): Control, tags: [command, critical]

FUNCIÓN:
- getObjectsForFunctions(): Genera lista de objetos necesarios
  * Calcula cantidad según tripulación
  * Ejemplo: 1 sleep pod por tripulante
  * Ejemplo: 1 galley unit por cada 4 tripulantes

IMPORTANCIA:
Define qué equipamiento está disponible y cuánto se necesita según
el tamaño de la tripulación.

────────────────────────────────────────────────────────────────────────────────
11. COMPONENTES DE INTERFAZ
────────────────────────────────────────────────────────────────────────────────

app/page.tsx
- Página principal que ensambla toda la aplicación
- Layout de 3 paneles: formulario | canvas | métricas
- Coordina todos los componentes

app/layout.tsx
- Layout raíz de Next.js
- Configura fuentes (Orbitron, Inter)
- Aplica tema oscuro

components/habitat-form.tsx
- Formulario de entrada de parámetros
- Inputs: crew size, duration, functions
- Botón "Generate Habitat"

components/habitat-canvas.tsx
- Canvas 3D con Three.js
- Renderiza hexágonos con colores por zona
- Muestra objetos colocados con etiquetas de texto
- Interacción: hover, click para colocar
- Controles de órbita para rotar cámara

components/toolbar.tsx
- Barra de herramientas superior
- Selector de modo (Auto/Manual)
- Botones de exportar/importar JSON y PNG
- Botón de reset

components/object-list.tsx
- Lista de objetos disponibles
- Muestra estado: colocado/no colocado
- Click para seleccionar objeto en modo manual

components/validation-panel.tsx
- Panel de validación con semáforo
- Muestra resultados de las 6 reglas
- Colores: verde (OK), amarillo (warning), rojo (error)
- Hints para solucionar problemas

components/metrics-dashboard.tsx
- Dashboard de métricas
- Utilización de celdas y objetos
- Propiedades físicas (volumen, masa)
- Desglose por zona
- Cobertura funcional

────────────────────────────────────────────────────────────────────────────────
12. UTILIDADES
────────────────────────────────────────────────────────────────────────────────

lib/utils.ts
- Función cn(): Combina clases CSS con clsx y tailwind-merge
- Usada en todos los componentes para estilos condicionales

hooks/use-mobile.ts
- Hook para detectar si es dispositivo móvil
- Breakpoint: 768px

hooks/use-toast.ts
- Sistema de notificaciones toast
- Usado para feedback de acciones

================================================================================
FLUJO DE DATOS PRINCIPAL
================================================================================

1. GENERACIÓN DE HÁBITAT:
   Usuario ingresa parámetros → setInputs() → generateHabitat()
   ↓
   calculateRadius() calcula tamaño
   ↓
   createZones() crea zonas necesarias
   ↓
   generateGrid() asigna celdas a zonas
   ↓
   getObjectsForFunctions() obtiene objetos necesarios
   ↓
   [Si modo auto] autoPlaceObjects() coloca todo automáticamente
   ↓
   validateLayout() valida el resultado
   ↓
   Estado actualizado → UI se re-renderiza

2. COLOCACIÓN MANUAL:
   Usuario selecciona objeto → click en canvas → findZoneForCell()
   ↓
   findContiguousCells() encuentra celdas contiguas
   ↓
   validatePlacement() verifica si es válido
   ↓
   [Si válido] addPlacement() añade al estado
   ↓
   Canvas se actualiza mostrando el objeto

3. VALIDACIÓN:
   Cada cambio en placements → validateLayout()
   ↓
   Para cada placement: validatePlacement()
   ↓
   Ejecuta 6 reglas de validación
   ↓
   Resultados mostrados en ValidationPanel con colores

4. MÉTRICAS:
   Cada cambio en estado → calculateMetrics()
   ↓
   Calcula estadísticas de utilización, volumen, masa
   ↓
   MetricsDashboard muestra resultados

================================================================================
ALGORITMOS CLAVE
================================================================================

1. GENERACIÓN DE HEXÁGONOS:
   Usa coordenadas axiales (q, r) donde q + r + s = 0
   Para generar hexágono de radio R:
   - Itera q de -R a R
   - Para cada q, itera r de max(-R, -q-R) a min(R, -q+R)
   - Resultado: 3R² + 3R + 1 celdas

2. DISTANCIA HEXAGONAL:
   distance(A, B) = (|A.q - B.q| + |A.q + A.r - B.q - B.r| + |A.r - B.r|) / 2

3. BÚSQUEDA DE CELDAS CONTIGUAS:
   BFS (Breadth-First Search) desde celda semilla
   - Añade celda inicial a resultado
   - Mientras resultado < N y hay celdas en cola:
     * Saca celda de la cola
     * Para cada vecino no visitado y disponible:
       - Añade a resultado y cola
   - Garantiza contigüidad

4. PUNTUACIÓN DE COLOCACIÓN:
   score = base_score + ring_bonus + proximity_bonus - distance_penalty + utilization_bonus
   - Prioriza colocaciones que siguen mejores prácticas
   - Favorece layouts compactos y eficientes

================================================================================
DEPENDENCIAS PRINCIPALES
================================================================================

- React 19: Framework de UI
- Next.js 15: Framework de aplicación
- Three.js: Renderizado 3D del canvas
- Zustand: Gestión de estado
- Tailwind CSS v4: Estilos
- TypeScript: Tipado estático
- nanoid: Generación de IDs únicos
- lucide-react: Iconos

================================================================================
FIN DE LA DOCUMENTACIÓN
================================================================================
