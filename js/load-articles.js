fetch('../js/articles.json')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('articles-container');

    data.forEach(article => {
      const card = document.createElement('a');
      card.className = 'article-card';
      card.href = `../pages/article-view.html?id=${article.id}`;

      card.innerHTML = `
        <img src="${article.cover}" alt="${article.title}" class="article-cover" />
        <h3>${article.title}</h3>
        <p>${article.subtitle}</p>
      `;

      container.appendChild(card);
    });
  })
  .catch(() => {
    document.getElementById('articles-container').textContent = 'Articles are temporarily unavailable.';
  });
