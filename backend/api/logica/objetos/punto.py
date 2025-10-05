from logica.libreria.tipos import coordenada


class Punto:
    def __init__(self, m: list[list[int | float]]) -> None:
        self.x = m[0][0]
        self.y = m[1][0]
        self.z = m[2][0]

    def __str__(self) -> str:
        return f"{self.vector_plano()}"

    def __repr__(self) -> str:
        return self.__str__()

    def vector_plano(self) -> list[coordenada]:
        return [self.x, self.y, self.z]
    
    def vector_anidado(self) -> list[list[coordenada]]:
        return [[self.x], [self.y], [self.z]]

    def get_tuple(self) -> tuple:
        return (self.x, self.y, self.z)
