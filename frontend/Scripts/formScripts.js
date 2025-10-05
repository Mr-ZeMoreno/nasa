document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("designForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // evitar recarga de página

    // Recoger campos básicos
    const nombre = form.nombre.value;
    const habitat = form.habitat.value;
    const tripulantes = parseInt(form.tripulantes.value);
    const tipo_geometria = form.tipo_geometria.value;

    // Recoger geometría según tipo
    let geometria = { cilindro: null, domo: null };
    if (tipo_geometria === "cilindro") {
      geometria.cilindro = {
        longitud: parseFloat(form.longitud.value || 0),
        diametro: parseFloat(form.diametro_cilindro.value || 0)
      };
      geometria.domo = null;
    } else if (tipo_geometria === "domo") {
      geometria.domo = {
        diametro: parseFloat(form.diametro_domo.value || 0)
      };
      geometria.cilindro = null;
    }

    // Recoger prioridad (lista ordenable)
    const prioridad = Array.from(document.querySelectorAll("#prioridad li")).map(li => li.dataset.id);

    // Recoger checkboxes
    const mantenimiento = form.mantenimiento.checked;
    const soporte_vital = form.soporte_vital.checked;

    // Notas
    const notas = form.notas.value;

    // Crear objeto JSON
    const payload = {
      nombre,
      habitat,
      tripulantes,
      tipo_geometria,
      geometria,
      prioridad,
      mantenimiento,
      soporte_vital,
      notas
    };

    try {
    const response = await fetch("http://localhost:8000/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Error en la petición: ${response.status}`);
    }

    // Aquí ya tenemos respuesta exitosa
    const data = await response.json();
    console.log("Respuesta del servidor:", data);

    

    } catch (err) {
    console.error(err);
    alert("Ocurrió un error al enviar el formulario.");
    }

  });
});
