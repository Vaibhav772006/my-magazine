document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const magazineId = urlParams.get("id");

  fetch("../js/magazines.json")
    .then(res => res.json())
    .then(data => {
      const magazine = data.find(m => m.id === magazineId);
      if (!magazine) return;

      document.getElementById("mag-preview-title").innerText = magazine.title;
      document.getElementById("mag-preview-subtitle").innerText = magazine.subtitle;
      document.getElementById("mag-preview-image").src = magazine.cover;
      document.getElementById("mag-preview-summary").innerText = magazine.preview;

      // ✅ Set href on the Read More button
      document.getElementById("mag-read-more").href = `magazine-view.html?id=${magazine.id}`;
    });
});
