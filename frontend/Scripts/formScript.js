document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".space-form");

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // evita recargar la página

    // Obtener datos del formulario
    const nombre = form.nombre.value.trim();
    const habitat = form.habitat.value;
    const tripulantes = parseInt(form.tripulantes.value, 10);
    const tipo_geometria = form.tipo_geometria.value;

    // Geometría dinámica
    let geometria = {};
    if (tipo_geometria === "cilindro") {
      geometria = {
        cilindro: {
          longitud: parseFloat(form.longitud.value) || 0,
          diametro: parseFloat(form.diametro_cilindro.value) || 0,
        },
      };
    } else if (tipo_geometria === "domo") {
      geometria = {
        domo: {
          diametro: parseFloat(form.diametro_domo.value) || 0,
        },
      };
    }

    // Prioridades (puede ser un textarea o lista UL)
    let prioridades = [];
    if (form.prioridad && form.prioridad.tagName === "TEXTAREA") {
      prioridades = form.prioridad.value
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    } else if (form.prioridad && form.prioridad.tagName === "UL") {
      prioridades = Array.from(form.prioridad.querySelectorAll("li")).map(
        (li) => li.textContent.trim()
      );
    }

    // Booleans
    const mantenimiento = form.mantenimiento.checked;
    const soporte_vital = form.soporte_vital.checked;

    // Notas
    const notas = form.notas.value.trim();

    // Construir JSON final
    const formData = {
      nombre,
      habitat,
      tripulantes,
      tipo_geometria,
      geometria,
      prioridad: prioridades,
      mantenimiento,
      soporte_vital,
      notas,
    };

    console.log("JSON generado:", formData);

    try {
      const response = await fetch("http://localhost:5000/api/habitat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("Respuesta del servidor:", data);

      alert("✅ Datos enviados correctamente al servidor");
    } catch (error) {
      console.error("❌ Error al enviar los datos:", error);
      alert("Error al conectar con el servidor");
    }
  });
});
