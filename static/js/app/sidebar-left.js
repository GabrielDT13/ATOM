document.addEventListener('DOMContentLoaded', () => {

    function loadSidebar(endpoint, containerId) {
        fetch(endpoint)
            .then(response => response.json())
            .then(data => {
                const container = document.getElementById(containerId);
                container.innerHTML = '';

                const title = document.createElement('h3');
                title.textContent = data.title;
                container.appendChild(title);

                const ul = document.createElement('ul');

                data.items.forEach(item => {
                    const li = document.createElement('li');
                    const link = document.createElement('a');
                    link.textContent = item.name;
                    link.href = item.url;
                    li.appendChild(link);
                    ul.appendChild(li);
                });

                container.appendChild(ul);

            })
            .catch(err => {
                console.error(`Error cargando ${endpoint}:`, err);
            });
    }

    loadSidebar('/api/sidebar_left', 'sidebar-left');
});
