document.addEventListener('DOMContentLoaded', () => {

  // Función para limitar checkboxes en un contenedor específico
  function limitarGrupo(containerId, max) {
    const container = document.getElementById(containerId);

    container.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const checked = container.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length > max) {
          e.target.checked = false;
          alert(`Solo puedes seleccionar un máximo de ${max} opciones.`);
        }
      }
    });
  }

  // Aplicar a los grupos
  limitarGrupo('ejercicios', 2);
  limitarGrupo('recreativas', 2);

});