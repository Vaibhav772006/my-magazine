const urlParams = new URLSearchParams(window.location.search);
const magId = urlParams.get("id");

fetch("../js/magazines.json")
  .then(res => res.json())
  .then(data => {
    const mag = data.find(m => m.id === magId);
    if (!mag) return;

    document.getElementById("mag-view-title").innerText = mag.title;
    document.getElementById("mag-view-subtitle").innerText = mag.subtitle;
    document.getElementById("mag-view-cover").src = mag.cover;
    document.getElementById("mag-view-content").innerHTML = mag.content;

    const latestContainer = document.getElementById("mag-latest-container");
    const latestMags = data.filter(m => m.id !== magId).slice(0, 5);

    latestMags.forEach(m => {
      const card = document.createElement("a");
      card.href = `magazine-preview.html?id=${m.id}`;
      card.className = "mag-latest-card";
      card.innerHTML = `
        <img src="${m.cover}" alt="${m.title}" class="mag-latest-img" />
        <div class="mag-latest-info">
          <h4>${m.title}</h4>
          <p>${m.subtitle}</p>
        </div>
      `;
      latestContainer.appendChild(card);
    });
  });
