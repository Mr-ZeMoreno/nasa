# ----------------------------
# Instrumentación de búsqueda
# ----------------------------
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class Stats:
    nodes_expanded: int = 0            # nodos (estados parciales) visitados
    children_generated: int = 0        # hijos "lógicos" (antes de podar por A=0)
    children_valid: int = 0            # hijos que pasan filtros y se exploran
    children_pruned_zero: int = 0      # hijos descartados por A=0 (prohibidos)
    leaves_feasible: int = 0           # layouts completos válidos
    leaves_infeasible: int = 0         # layouts completos inválidos (cierre anillo)
    depth_expansions: Dict[int, int] = field(default_factory=dict)  # expansiones por profundidad
