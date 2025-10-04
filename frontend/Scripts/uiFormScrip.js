document.addEventListener("DOMContentLoaded", () => {
  const shapeSel = document.getElementById("tipo_geometria");
  const cylinderFields = document.getElementById("cylinderFields");
  const domeFields = document.getElementById("domeFields");

  // Mostrar campos según geometría seleccionada
  if (shapeSel) {
    shapeSel.addEventListener("change", () => {
      if (shapeSel.value === "cilindro") {
        cylinderFields.style.display = "block";
        domeFields.style.display = "none";
      } else if (shapeSel.value === "domo") {
        domeFields.style.display = "block";
        cylinderFields.style.display = "none";
      } else {
        cylinderFields.style.display = "none";
        domeFields.style.display = "none";
      }
    });
  }

  // Drag & Drop prioridades (ejemplo con lista UL/LI)
  const priorityList = document.getElementById("prioridad");
  if (priorityList) {
    let dragged;

    priorityList.addEventListener("dragstart", (e) => {
      dragged = e.target;
      e.target.style.opacity = 0.5;
    });

    priorityList.addEventListener("dragend", (e) => {
      e.target.style.opacity = "";
    });

    priorityList.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    priorityList.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.target.tagName === "LI" && dragged !== e.target) {
        priorityList.insertBefore(dragged, e.target.nextSibling);
      }
    });
  }
});
