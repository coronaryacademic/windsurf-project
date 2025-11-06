// Table utilities for note editor

// Helper function to trigger table save
function triggerTableSave(table) {
  if (!table) return;
  
  // Find the content container
  const content = table.closest(".content");
  if (content) {
    // Dispatch input event to trigger undo history and save
    content.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function createTable(rows, cols, existingData = null) {
  const table = document.createElement("table");
  table.className = "note-table";
  table.contentEditable = "false";

  const tbody = document.createElement("tbody");

  for (let i = 0; i < rows; i++) {
    const tr = document.createElement("tr");
    for (let j = 0; j < cols; j++) {
      const td = document.createElement("td");
      td.contentEditable = "true";
      
      // Restore content and styles if existingData is provided
      if (existingData && existingData[i] && existingData[i][j]) {
        const cellData = existingData[i][j];
        td.innerHTML = cellData.content || "&nbsp;";
        if (cellData.bgcolor) {
          td.style.backgroundColor = cellData.bgcolor;
          td.setAttribute("data-bgcolor", cellData.bgcolor);
        }
        if (cellData.color) {
          td.style.color = cellData.color;
          td.setAttribute("data-color", cellData.color);
        }
      } else {
        td.innerHTML = "&nbsp;";
      }
      
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  // Add table controls
  addTableControls(table);
  
  // Add input event listener for cell changes
  table.addEventListener("input", (e) => {
    if (e.target.tagName === "TD" || e.target.tagName === "TH") {
      triggerTableSave(table);
    }
  });

  return table;
}

function addTableControls(table) {
  // Add + buttons on hover
  table.addEventListener("mouseenter", () => {
    if (!table.querySelector(".table-add-row")) {
      addTableAddButtons(table);
    }
  });

  table.addEventListener("mouseleave", (e) => {
    // Only remove if not hovering over controls
    if (!e.relatedTarget || !e.relatedTarget.closest(".table-controls")) {
      removeTableAddButtons(table);
    }
  });
  
  // Restore cell styles from data attributes
  table.querySelectorAll("td, th").forEach(cell => {
    const bgcolor = cell.getAttribute("data-bgcolor");
    const color = cell.getAttribute("data-color");
    if (bgcolor) {
      cell.style.backgroundColor = bgcolor;
    }
    if (color) {
      cell.style.color = color;
    }
  });
}

function addTableAddButtons(table) {
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";

  // Wrap table
  if (
    table.parentNode &&
    !table.parentNode.classList.contains("table-wrapper")
  ) {
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }

  // Add row button (bottom)
  const addRowBtn = document.createElement("button");
  addRowBtn.className = "table-add-row table-controls";
  addRowBtn.innerHTML = "+";
  addRowBtn.title = "Add Row";
  addRowBtn.contentEditable = "false";
  addRowBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addTableRow(table);
  };

  // Add column button (right)
  const addColBtn = document.createElement("button");
  addColBtn.className = "table-add-col table-controls";
  addColBtn.innerHTML = "+";
  addColBtn.title = "Add Column";
  addColBtn.contentEditable = "false";
  addColBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addTableColumn(table);
  };

  wrapper.appendChild(addRowBtn);
  wrapper.appendChild(addColBtn);
}

function removeTableAddButtons(table) {
  const wrapper = table.closest(".table-wrapper");
  if (wrapper) {
    const controls = wrapper.querySelectorAll(".table-controls");
    controls.forEach((c) => c.remove());
  }
}

function addTableRow(table, afterRow = null) {
  const tbody = table.querySelector("tbody");
  const cols = table
    .querySelectorAll("tr")[0]
    .querySelectorAll("td, th").length;

  const tr = document.createElement("tr");
  for (let i = 0; i < cols; i++) {
    const td = document.createElement("td");
    td.contentEditable = "true";
    td.innerHTML = "&nbsp;";
    tr.appendChild(td);
  }

  if (afterRow) {
    afterRow.parentNode.insertBefore(tr, afterRow.nextSibling);
  } else {
    tbody.appendChild(tr);
  }
  
  // Trigger save
  triggerTableSave(table);
}

function addTableColumn(table, afterCol = null) {
  const rows = table.querySelectorAll("tr");
  const colIndex =
    afterCol !== null ? afterCol : rows[0].querySelectorAll("td, th").length;

  rows.forEach((row) => {
    const td = document.createElement("td");
    td.contentEditable = "true";
    td.innerHTML = "&nbsp;";

    if (afterCol !== null) {
      const cells = row.querySelectorAll("td, th");
      if (cells[afterCol]) {
        cells[afterCol].parentNode.insertBefore(
          td,
          cells[afterCol].nextSibling
        );
      } else {
        row.appendChild(td);
      }
    } else {
      row.appendChild(td);
    }
  });
  
  // Trigger save
  triggerTableSave(table);
}

function deleteTableRow(row) {
  const table = row.closest("table");
  const rows = table.querySelectorAll("tr");

  if (rows.length > 1) {
    row.remove();
    triggerTableSave(table);
  } else {
    alert("Cannot delete the last row");
  }
}

function deleteTableColumn(table, colIndex) {
  const rows = table.querySelectorAll("tr");
  const cols = rows[0].querySelectorAll("td, th").length;

  if (cols > 1) {
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td, th");
      if (cells[colIndex]) {
        cells[colIndex].remove();
      }
    });
    triggerTableSave(table);
  } else {
    alert("Cannot delete the last column");
  }
}

// Track active menu to close it before opening new one
let activeTableMenu = null;

function showTableContextMenu(e, element) {
  e.preventDefault();
  e.stopPropagation();

  // Close any existing menu
  if (activeTableMenu && activeTableMenu.parentNode) {
    activeTableMenu.remove();
    activeTableMenu = null;
  }

  const isCell = element.tagName === "TD" || element.tagName === "TH";
  const isRow = element.tagName === "TR";
  const isTable = element.tagName === "TABLE";

  const cell = isCell ? element : element.closest("td, th");
  const row = isRow ? element : element.closest("tr");
  const table = isTable ? element : element.closest("table");

  if (!table) return;

  const menu = document.createElement("div");
  menu.className = "ctx-menu table-context-menu";
  menu.style.left = e.pageX + "px";
  menu.style.top = e.pageY + "px";

  const items = [];

  if (cell) {
    items.push(
      {
        label: "Insert Row Above",
        action: () => addTableRow(table, row.previousElementSibling || null),
      },
      { label: "Insert Row Below", action: () => addTableRow(table, row) },
      {
        label: "Insert Column Before",
        action: () => {
          const colIndex = Array.from(row.children).indexOf(cell);
          insertColumnBefore(table, colIndex);
        },
      },
      {
        label: "Insert Column After",
        action: () => {
          const colIndex = Array.from(row.children).indexOf(cell);
          addTableColumn(table, colIndex);
        },
      },
      { label: "---" },
      { label: "Delete Row", action: () => deleteTableRow(row) },
      {
        label: "Delete Column",
        action: () => {
          const colIndex = Array.from(row.children).indexOf(cell);
          deleteTableColumn(table, colIndex);
        },
      },
      { label: "---" },
      {
        label: "Background Color",
        action: () => styleCell(cell, "background"),
      },
      { label: "Text Color", action: () => styleCell(cell, "color") },
      { label: "Style Row", action: () => styleRow(row) },
      {
        label: "Style Column",
        action: () => {
          const colIndex = Array.from(row.children).indexOf(cell);
          styleColumn(table, colIndex);
        },
      },
      { label: "---" },
      { label: "Fit to Width", action: () => fitTableToWidth(table) },
      { label: "---" },
      { label: "Insert Nested Table", action: () => insertNestedTable(cell) },
      {
        label: "Split Cell (3 rows)",
        action: () => splitCellIntoRows(cell, 3),
      },
      { label: "Split Cell (2 rows)", action: () => splitCellIntoRows(cell, 2) }
    );
  }

  if (isTable && !isCell) {
    items.push(
      { label: "Add Row", action: () => addTableRow(table) },
      { label: "Add Column", action: () => addTableColumn(table) },
      { label: "---" },
      { label: "Fit to Width", action: () => fitTableToWidth(table) },
      { label: "---" },
      { label: "Delete Table", action: () => deleteTable(table) }
    );
  }

  items.forEach((item) => {
    if (item.label === "---") {
      const hr = document.createElement("hr");
      menu.appendChild(hr);
    } else {
      const btn = document.createElement("button");
      btn.textContent = item.label;
      btn.onclick = async (evt) => {
        evt.stopPropagation();
        evt.preventDefault();
        await item.action();
        menu.remove();
      };
      menu.appendChild(btn);
    }
  });

  document.body.appendChild(menu);
  activeTableMenu = menu;

  const closeMenu = (evt) => {
    if (!menu.contains(evt.target)) {
      menu.remove();
      activeTableMenu = null;
      document.removeEventListener("click", closeMenu);
    }
  };

  setTimeout(() => {
    document.addEventListener("click", closeMenu);
  }, 0);
}

function insertColumnBefore(table, colIndex) {
  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const td = document.createElement("td");
    td.contentEditable = "true";
    td.innerHTML = "&nbsp;";
    const cells = row.querySelectorAll("td, th");
    if (cells[colIndex]) {
      row.insertBefore(td, cells[colIndex]);
    }
  });
  triggerTableSave(table);
}

async function styleCell(cell, type) {
  // Show color picker modal
  const color = await showColorPicker(`Choose ${type} color`);
  if (color) {
    if (type === "background") {
      cell.style.backgroundColor = color;
      cell.setAttribute("data-bgcolor", color);
    } else {
      cell.style.color = color;
      cell.setAttribute("data-color", color);
    }

    // Trigger input event to save the table with styles
    triggerTableSave(cell.closest("table"));
  }
}

// Color picker modal
async function showColorPicker(title) {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "color-picker-modal";
    modal.style.cssText =
      "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 16px; z-index: 10000; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 280px;";

    const colors = [
      "#ffffff",
      "#f0f0f0",
      "#d0d0d0",
      "#a0a0a0",
      "#808080",
      "#606060",
      "#404040",
      "#000000",
      "#ff0000",
      "#ff4500",
      "#ff8c00",
      "#ffd700",
      "#ffff00",
      "#adff2f",
      "#00ff00",
      "#00fa9a",
      "#00ffff",
      "#1e90ff",
      "#0000ff",
      "#8a2be2",
      "#9400d3",
      "#ff00ff",
      "#ff1493",
      "#ffc0cb",
      "#f08080",
      "#cd5c5c",
      "#dc143c",
      "#b22222",
      "#8b0000",
      "#ffa07a",
      "#ff7f50",
      "#ff6347",
      "#ffa500",
      "#ff8c00",
      "#ffd700",
      "#ffff00",
      "#ffffe0",
      "#fffacd",
      "#fafad2",
      "#ffefd5",
      "#ffe4b5",
      "#ffdab9",
      "#eee8aa",
      "#f0e68c",
      "#bdb76b",
      "#e6e6fa",
      "#d8bfd8",
      "#dda0dd",
      "#ee82ee",
      "#da70d6",
      "#ff00ff",
      "#ba55d3",
      "#9370db",
      "#8a2be2",
      "#9400d3",
      "#9932cc",
      "#8b008b",
      "#800080",
      "#4b0082",
      "#6a5acd",
      "#483d8b",
      "#191970",
      "#000080",
      "#00008b",
      "#0000cd",
      "#0000ff",
      "#1e90ff",
      "#6495ed",
      "#4169e1",
      "#87ceeb",
      "#87cefa",
      "#00bfff",
      "#add8e6",
      "#b0e0e6",
      "#afeeee",
      "#00ffff",
      "#00ced1",
      "#48d1cc",
      "#40e0d0",
      "#20b2aa",
      "#008b8b",
      "#008080",
      "#00ffff",
      "#e0ffff",
      "#7fffd4",
      "#66cdaa",
      "#3cb371",
      "#2e8b57",
      "#228b22",
      "#008000",
      "#006400",
      "#adff2f",
      "#7fff00",
      "#7cfc00",
      "#00ff00",
      "#32cd32",
      "#98fb98",
      "#90ee90",
      "#00fa9a",
      "#00ff7f",
      "#3cb371",
      "#f0fff0",
      "#f5fffa",
      "#f0f8ff",
    ];

    modal.innerHTML = `
      <h3 style="margin: 0 0 12px 0; color: var(--text); font-size: 14px;">${title}</h3>
      <div class="color-grid" style="display: grid; grid-template-columns: repeat(8, 24px); gap: 4px; margin-bottom: 12px; max-height: 200px; overflow-y: auto; padding: 4px;">
        ${colors
          .map(
            (c) =>
              `<div class="color-swatch" data-color="${c}" style="width: 24px; height: 24px; background: ${c}; border: 2px solid var(--border); border-radius: 3px; cursor: pointer;"></div>`
          )
          .join("")}
      </div>
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
        <input type="color" class="color-input" value="#3b82f6" style="width: 50px; height: 35px; border: 1px solid var(--border); border-radius: 4px; cursor: pointer;">
        <input type="text" class="color-text" value="#3b82f6" placeholder="#000000" style="flex: 1; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); font-size: 13px;">
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn-cancel" style="padding: 6px 14px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; color: var(--text); font-size: 13px;">Cancel</button>
        <button class="btn-ok" style="padding: 6px 14px; background: var(--accent); border: none; border-radius: 4px; cursor: pointer; color: white; font-size: 13px;">OK</button>
      </div>
    `;

    document.body.appendChild(modal);

    const colorInput = modal.querySelector(".color-input");
    const colorText = modal.querySelector(".color-text");
    let selectedColor = "#3b82f6";

    // Color swatches
    modal.querySelectorAll(".color-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        selectedColor = swatch.dataset.color;
        colorInput.value = selectedColor;
        colorText.value = selectedColor;
      });
    });

    // Color picker input
    colorInput.addEventListener("input", (e) => {
      selectedColor = e.target.value;
      colorText.value = selectedColor;
    });

    // Text input
    colorText.addEventListener("input", (e) => {
      selectedColor = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(selectedColor)) {
        colorInput.value = selectedColor;
      }
    });

    modal.querySelector(".btn-ok").addEventListener("click", () => {
      modal.remove();
      resolve(selectedColor);
    });

    modal.querySelector(".btn-cancel").addEventListener("click", () => {
      modal.remove();
      resolve(null);
    });
  });
}

async function styleRow(row) {
  const color = await showColorPicker("Choose row background color");
  if (color) {
    const cells = row.querySelectorAll("td, th");
    cells.forEach((cell) => {
      cell.style.backgroundColor = color;
      cell.setAttribute("data-bgcolor", color);
    });

    // Trigger input event to save the table with styles
    triggerTableSave(row.closest("table"));
  }
}

async function styleColumn(table, colIndex) {
  const color = await showColorPicker("Choose column background color");
  if (color) {
    const rows = table.querySelectorAll("tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td, th");
      if (cells[colIndex]) {
        cells[colIndex].style.backgroundColor = color;
        cells[colIndex].setAttribute("data-bgcolor", color);
      }
    });

    // Trigger input event to save the table with styles
    triggerTableSave(table);
  }
}

function deleteTable(table) {
  if (confirm("Delete this table?")) {
    const wrapper = table.closest(".table-wrapper");
    const content = table.closest(".content");
    if (wrapper) {
      wrapper.remove();
    } else {
      table.remove();
    }
    // Trigger save on content level
    if (content) {
      content.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
}

async function insertNestedTable(cell) {
  const rows = await window.modalPrompt("Nested table rows:", "2");
  if (!rows) return;
  const cols = await window.modalPrompt("Nested table columns:", "2");
  if (!cols) return;

  const numRows = parseInt(rows) || 2;
  const numCols = parseInt(cols) || 2;

  const nestedTable = createTable(numRows, numCols);
  nestedTable.style.width = "100%";
  nestedTable.style.margin = "0";
  cell.innerHTML = "";
  cell.appendChild(nestedTable);
  
  // Trigger save on the main table
  const mainTable = cell.closest("table");
  if (mainTable && !nestedTable.contains(mainTable)) {
    triggerTableSave(mainTable);
  }
}

// Parse pasted table content
function parsePastedTable(text) {
  // Try to detect table format

  // Markdown table
  if (text.includes("|") && text.includes("\n")) {
    return parseMarkdownTable(text);
  }

  // Tab-separated (Excel, ChatGPT)
  if (text.includes("\t")) {
    return parseTSVTable(text);
  }

  // Comma-separated
  if (text.includes(",")) {
    return parseCSVTable(text);
  }

  return null;
}

function parseMarkdownTable(text) {
  const lines = text.trim().split("\n");
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip separator line (e.g., |---|---|)
    if (line.match(/^\|?[\s\-:|]+\|?$/)) continue;

    // Parse row
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c);
    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

function parseTSVTable(text) {
  const lines = text.trim().split("\n");
  return lines.map((line) => line.split("\t").map((c) => c.trim()));
}

function parseCSVTable(text) {
  const lines = text.trim().split("\n");
  return lines.map((line) => {
    // Simple CSV parser (doesn't handle quotes)
    return line.split(",").map((c) => c.trim());
  });
}

function createTableFromData(data) {
  if (!data || data.length === 0) return null;

  const table = document.createElement("table");
  table.className = "note-table";
  table.contentEditable = "false";

  const tbody = document.createElement("tbody");

  data.forEach((row, i) => {
    const tr = document.createElement("tr");
    row.forEach((cellContent) => {
      const td = document.createElement("td");
      td.contentEditable = "true";
      td.textContent = cellContent;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  addTableControls(table);
  
  // Add input event listener for cell changes
  table.addEventListener("input", (e) => {
    if (e.target.tagName === "TD" || e.target.tagName === "TH") {
      triggerTableSave(table);
    }
  });

  return table;
}

function fitTableToWidth(table) {
  table.style.width = "100%";
  const cells = table.querySelectorAll("td, th");
  cells.forEach((cell) => {
    cell.style.width = "auto";
  });
}

function openTableInEditor(table) {
  // Clone the table
  const tableClone = table.cloneNode(true);
  const tableData = extractTableData(table);

  // Open table editor window
  if (typeof openTableEditorWindow === "function") {
    openTableEditorWindow(tableData, (updatedTable) => {
      // Replace original table with updated one
      table.parentNode.replaceChild(updatedTable, table);
    });
  }
}

function extractTableData(table) {
  const rows = [];
  const trs = table.querySelectorAll("tr");
  trs.forEach((tr) => {
    const row = [];
    const cells = tr.querySelectorAll("td, th");
    cells.forEach((cell) => {
      const cellData = {
        content: cell.innerHTML,
        style: cell.getAttribute("style") || "",
      };
      
      // Save color attributes
      const bgcolor = cell.getAttribute("data-bgcolor");
      const color = cell.getAttribute("data-color");
      if (bgcolor) cellData.bgcolor = bgcolor;
      if (color) cellData.color = color;
      
      row.push(cellData);
    });
    rows.push(row);
  });
  return rows;
}

function splitCellIntoRows(cell, numRows) {
  // Clear the cell content
  cell.innerHTML = "";

  // Create a nested table inside the cell with multiple rows
  const nestedTable = document.createElement("table");
  nestedTable.className = "note-table nested-table";
  nestedTable.style.width = "100%";
  nestedTable.style.margin = "0";
  nestedTable.style.border = "none";
  nestedTable.style.borderCollapse = "collapse";

  const tbody = document.createElement("tbody");
  for (let i = 0; i < numRows; i++) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.contentEditable = "true";
    td.innerHTML = "&nbsp;"; // Use non-breaking space instead of text
    td.style.border = "1px solid var(--border)";
    td.style.padding = "8px";
    td.style.minHeight = "30px";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  nestedTable.appendChild(tbody);
  cell.appendChild(nestedTable);
  cell.style.padding = "4px";
  cell.style.verticalAlign = "top";

  // Add context menu to nested table cells
  nestedTable.addEventListener("contextmenu", (e) => {
    e.stopPropagation();
    showTableContextMenu(e, e.target);
  });
  
  // Add input handler for nested table cells
  nestedTable.addEventListener("input", (e) => {
    const mainTable = cell.closest("table");
    if (mainTable && !nestedTable.contains(mainTable)) {
      triggerTableSave(mainTable);
    }
  });
  
  // Trigger save on the main table
  const mainTable = cell.closest("table");
  if (mainTable && !nestedTable.contains(mainTable)) {
    triggerTableSave(mainTable);
  }
}
