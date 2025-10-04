
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".space-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Datos básicos
    const nombre = form.nombre.value.trim();
    const habitat = form.habitat.value;
    const tripulantes = Number(form.tripulantes.value);
    const tipo_geometria = form.tipo_geometria.value;

    // Geometría
    let geometria = {};
    if (tipo_geometria === "cilindro") {
      geometria = {
        cilindro: {
          longitud: Number(form.longitud.value || 0),
          diametro: Number(form.diametro_cilindro.value || 0),
        },
      };
    } else if (tipo_geometria === "domo") {
      geometria = {
        domo: {
          diametro: Number(form.diametro_domo.value || 0),
        },
      };
    }

    // Prioridades: usa data-id en el orden actual
    const prioridades = [];
    document.getElementById("prioridad")
  .querySelectorAll("li")
  .forEach(li => prioridades.push(li.getAttribute("data-id")));


    // Opciones
    const mantenimiento = form.mantenimiento.checked;
    const soporte_vital = form.soporte_vital.checked;

    // Notas
    const notas = form.notas.value.trim();

    

    // JSON para la API
    const formData = {
      nombre,
      habitat,
      tripulantes,
      tipo_geometria,
      geometria,
      prioridad: prioridades,   // ej. ["galley","exercise","hygiene",...]
      mantenimiento,
      soporte_vital,
      notas,
    };

    console.log("JSON generado:", formData);

    try {
      const response = await fetch("http://localhost:5000/api/habitat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
      }

      const data = await response.json();
      console.log("Respuesta del servidor:", data);
      alert("✅ Datos enviados correctamente al servidor");
    } catch (error) {
      console.error("❌ Error al enviar los datos:", error);
      alert("Error al conectar con el servidor");
    }
  });
});
