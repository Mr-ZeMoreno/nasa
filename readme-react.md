Thought for 4s### HabitatX - Plataforma de Diseño de Hábitats Espaciales

Si no ejecuta xq tira error habitat canvas

npm i three@^0.180 @types/three@^0.180 -D



## ¿Qué es esto?

HabitatX es una herramienta para diseñar estaciones espaciales hexagonales. Permite planificar dónde colocar diferentes equipos y áreas funcionales en una estación espacial, asegurando que todo cumpla con las reglas de seguridad y eficiencia.

## Los Hexágonos

Cada **hexágono representa una celda física** en la estación espacial. Piensa en ellos como "habitaciones" o "módulos" individuales que se conectan entre sí. La forma hexagonal permite:

- Conexión eficiente con 6 vecinos
- Distribución uniforme del espacio
- Fácil expansión en anillos concéntricos


## Las Zonas (Anillos de Colores)

La estación se divide en **tres anillos concéntricos**, cada uno con un propósito específico:

### Núcleo (Core - Azul oscuro)

- El centro de la estación
- Para sistemas críticos: ECLSS (soporte vital), comando, comunicaciones
- Máxima protección y accesibilidad
- Capacidad limitada (solo celdas centrales)


### Anillo Medio (Mid - Verde)

- Zona de habitabilidad principal
- Para áreas de vida: dormitorios, cocina, higiene, ejercicio, médico
- Ambiente más tranquilo
- Mayor capacidad


### Anillo Exterior (Outer - Amarillo)

- Periferia de la estación
- Para almacenamiento, equipos ruidosos, laboratorios
- Puede tener más ruido y actividad
- Máxima capacidad


## Los Objetos (Equipamiento)

Los **objetos son equipos o áreas funcionales** que se colocan en las celdas:

- **Sleep Pod**: Cápsulas de dormir (1 celda cada una)
- **Galley Unit**: Cocina/comedor (2 celdas)
- **Hygiene Station**: Baño/higiene (1 celda)
- **ECLSS Rack**: Sistema de soporte vital (1 celda)
- **Exercise Equipment**: Gimnasio (1 celda)
- **Medical Bay**: Enfermería (2 celdas)
- **Stowage Rack**: Almacenamiento (1 celda)
- **Command Console**: Centro de control (1 celda)


Cada objeto tiene:

- **Slots**: Cuántas celdas ocupa
- **Tags**: Etiquetas que indican su tipo (living, noisy, critical, etc.)
- **Priority**: Importancia para la colocación automática


## Dos Modos de Trabajo

### Modo Automático

1. Ingresas: tripulación, duración de la misión, funciones necesarias
2. El sistema calcula el tamaño óptimo del hábitat
3. Un algoritmo coloca automáticamente todos los objetos siguiendo reglas heurísticas:

1. Prioriza objetos críticos (dormir, cocina, soporte vital)
2. Respeta preferencias de zona (ECLSS en núcleo, vida en medio, ruidosos fuera)
3. Busca proximidad funcional (cocina cerca de almacenamiento)
4. Maximiza eficiencia de utilización





### Modo Manual

1. Generas el hábitat vacío
2. Seleccionas un objeto de la lista
3. Haces clic en el canvas para colocarlo
4. El sistema valida en tiempo real si la colocación es válida
5. Puedes mover o eliminar objetos haciendo clic en ellos


## Sistema de Validación (Semáforo)

El panel de validación muestra **6 reglas** con colores tipo semáforo:

### Reglas Duras (Críticas - Bloquean)

- **Capacidad de Zona**: No puedes exceder el límite de celdas por zona
- **Compatibilidad de Tags**: Los objetos deben tener tags permitidos en su zona
- **Zonas Prohibidas**: Objetos ruidosos no pueden ir en el núcleo


### Reglas Suaves (Advertencias - Recomendaciones)

- **Separación de Ruido**: Objetos ruidosos deben estar lejos de dormitorios
- **Adyacencia Funcional**: Cocina debería estar cerca de almacenamiento
- **Accesibilidad**: Los objetos no deberían quedar completamente rodeados


Cada regla muestra:

- Estado: Pasó (verde), Advertencia (amarillo), Error (rojo)
- Explicación del problema
- Sugerencia para solucionarlo


## Panel de Métricas

Muestra estadísticas en tiempo real:

- **Utilización**: Porcentaje de celdas y objetos colocados
- **Propiedades Físicas**: Volumen total, volumen usado, volumen por tripulante, masa estimada
- **Desglose por Zona**: Utilización de cada anillo
- **Cobertura Funcional**: Qué funciones requeridas/opcionales están cubiertas


## Exportar e Importar

- **Exportar JSON**: Guarda el diseño completo (zonas, objetos, colocaciones)
- **Exportar PNG**: Captura una imagen del canvas 3D
- **Importar JSON**: Carga un diseño previamente guardado