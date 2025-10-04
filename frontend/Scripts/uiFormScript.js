
document.addEventListener("DOMContentLoaded", () => {
  const shapeSel = document.getElementById("tipo_geometria");
  const cylinderFields = document.getElementById("cylinderFields");
  const domeFields = document.getElementById("domeFields");

  function updateGeometryFields() {
    if (!shapeSel) return;
    const v = shapeSel.value;
    if (v === "cilindro") {
      cylinderFields.style.display = "block";
      domeFields.style.display = "none";
    } else if (v === "domo") {
      domeFields.style.display = "block";
      cylinderFields.style.display = "none";
    } else {
      cylinderFields.style.display = "none";
      domeFields.style.display = "none";
    }
  }

  if (shapeSel) {
    shapeSel.addEventListener("change", updateGeometryFields);
    updateGeometryFields(); // <-- IMPORTANTE: setear estado inicial
  }

  // ---------------------------------


  // Drag & Drop prioridades robusto
(function setupPriorityDnd() {
  const list = document.getElementById("prioridad");
  if (!list) return;

  // Asegura que todos los <li> sean arrastrables
  list.querySelectorAll("li").forEach(li => li.setAttribute("draggable", "true"));

  let draggedEl = null;
  let placeholder = document.createElement("li");
  placeholder.className = "priority-placeholder";

  // Helper: obtener <li> más cercano aunque el click sea en el <span>
  function closestItem(el) {
    return el?.closest("li");
  }

  list.addEventListener("dragstart", (e) => {
    const li = closestItem(e.target);
    if (!li) return;
    draggedEl = li;
    e.dataTransfer.effectAllowed = "move";
    // Necesario para Firefox
    e.dataTransfer.setData("text/plain", li.dataset.id || li.textContent.trim());
    li.style.opacity = "0.5";

    // Inserta placeholder después del arrastrado (posición inicial)
    li.parentNode.insertBefore(placeholder, li.nextSibling);
  });

  list.addEventListener("dragend", () => {
    if (draggedEl) draggedEl.style.opacity = "";
    // Quita placeholder si quedó
    if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
    draggedEl = null;
  });

  list.addEventListener("dragover", (e) => {
    e.preventDefault(); // permite drop
    e.dataTransfer.dropEffect = "move";

    const overItem = closestItem(e.target);
    if (!overItem || overItem === placeholder) return;

    const rect = overItem.getBoundingClientRect();
    const isAfter = (e.clientY - rect.top) > rect.height / 2;

    // Inserta placeholder antes o después según el mouse
    if (isAfter) {
      overItem.parentNode.insertBefore(placeholder, overItem.nextSibling);
    } else {
      overItem.parentNode.insertBefore(placeholder, overItem);
    }
  });

  list.addEventListener("drop", (e) => {
    e.preventDefault();
    const container = list;

    if (draggedEl && placeholder.parentNode === container) {
      container.insertBefore(draggedEl, placeholder);
    }

    // Limpieza
    if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
    if (draggedEl) draggedEl.style.opacity = "";
    draggedEl = null;
  });
})();

});
