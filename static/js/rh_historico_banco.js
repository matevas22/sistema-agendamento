document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".card-animate").forEach(function (card, i) {
    card.style.opacity = 0;
    setTimeout(function () {
      card.style.opacity = 1;
    }, 200 + i * 120);
  });
  let input = document.getElementById("funcionario_autocomplete");
  let hidden = document.getElementById("funcionario_id");
  let timeout = null;
  let suggestionBox = document.createElement("div");
  suggestionBox.className = "autocomplete-suggestions";
  suggestionBox.style.position = "absolute";
  suggestionBox.style.zIndex = 1000;
  suggestionBox.style.background = "#1e293b";
  suggestionBox.style.border = "1px solid #2563eb";
  suggestionBox.style.width = input.offsetWidth + "px";
  suggestionBox.style.maxHeight = "180px";
  suggestionBox.style.overflowY = "auto";
  suggestionBox.style.top = input.offsetTop + input.offsetHeight + "px";
  suggestionBox.style.left = input.offsetLeft + "px";
  input.parentNode.appendChild(suggestionBox);
  input.addEventListener("input", function () {
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      let query = input.value;
      hidden.value = "";
      if (query.length < 2) {
        suggestionBox.innerHTML = "";
        return;
      }
      fetch("/autocomplete_funcionario?q=" + encodeURIComponent(query))
        .then((resp) => resp.json())
        .then((data) => {
          suggestionBox.innerHTML = "";
          data.forEach((item) => {
            let div = document.createElement("div");
            div.textContent = item.label;
            div.className = "autocomplete-item";
            div.style.padding = "8px 12px";
            div.style.cursor = "pointer";
            div.onmouseover = function () {
              div.style.background = "#2563eb33";
            };
            div.onmouseout = function () {
              div.style.background = "transparent";
            };
            div.onclick = function () {
              input.value = item.label;
              hidden.value = item.id;
              suggestionBox.innerHTML = "";
            };
            suggestionBox.appendChild(div);
          });
        });
    }, 200);
  });
  document.addEventListener("click", function (e) {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      suggestionBox.innerHTML = "";
    }
  });
});
