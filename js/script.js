// ✅ This stays in script.js
document.addEventListener("click", function (e) {
  const toggleButton = document.querySelector(".menu-toggle");
  const nav = document.getElementById("nav-links");

  if (e.target === toggleButton) {
    nav.style.display = nav.style.display === "flex" ? "none" : "flex";
  }
});
