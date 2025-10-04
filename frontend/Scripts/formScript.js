document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".space-form");

    form.addEventListener("submit", async (event) => {
        event.preventDefault(); // Evita recarga de página

        // Crear objeto con los datos del formulario
        const formData = {
            nombre: form.nombre.value.trim(),
            tipo: form.tipo.value,
            capacidad: parseInt(form.capacidad.value),
            prioridades: form.prioridades.value.trim()
        };

        try {
            // Enviar JSON al backend
            //Falta levantar el servidor
            const response = await fetch("http://localhost:5000/api/habitat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            // Esperar respuesta del servidor
            const data = await response.json();
            console.log("Respuesta del servidor:", data);

            alert(" Datos enviados correctamente al servidor");
        } catch (error) {
            console.error("Error al enviar los datos:", error);
            alert("Error al conectar con el servidor");
        }
    });
});
