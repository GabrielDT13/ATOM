function buildTree(container, items, isProjectFolder = false) {
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.paddingLeft = '0';

    items.sort((a, b) => {
        if (a.type === b.type) return 0;
        return a.type === 'folder' ? -1 : 1;
    });

    items.forEach(item => {
        const li = document.createElement('li');
        li.style.display = 'block';
        li.style.marginBottom = '4px';

        if (item.type === 'folder') {
            const folderHeader = document.createElement('div');
            folderHeader.classList.add('folder-header');
            folderHeader.style.display = 'flex';
            folderHeader.style.cursor = 'pointer';
            folderHeader.style.alignItems = 'center';
            folderHeader.style.justifyContent = 'space-between';
            folderHeader.style.gap = '8px';
            folderHeader.style.padding = '2px 4px';
            folderHeader.style.borderRadius = '4px';
            folderHeader.style.width = '100%';
            folderHeader.style.boxSizing = 'border-box';

            const leftContainer = document.createElement('div');
            leftContainer.style.display = 'flex';
            leftContainer.style.alignItems = 'center';
            leftContainer.style.gap = '8px';

            const icon = document.createElement('img');
            icon.src = '/static/images/folder.png';
            icon.style.width = '16px';
            icon.style.height = '16px';

            const spanText = document.createElement('span');
            spanText.textContent = item.name;

            leftContainer.appendChild(icon);
            leftContainer.appendChild(spanText);
            folderHeader.appendChild(leftContainer);

            if (isProjectFolder) {
                const statusIcon = document.createElement('img');
                statusIcon.style.width = '20px';
                statusIcon.style.height = '20px';

                if (item.html_exists) {
                    statusIcon.src = '/static/images/check.png';
                } else {
                    statusIcon.src = '/static/images/play.png';
                    statusIcon.style.cursor = 'pointer';
                    statusIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        runProject(item.name, statusIcon);
                    });
                }

                folderHeader.appendChild(statusIcon);
            }

            li.appendChild(folderHeader);

            const childrenContainer = document.createElement('div');
            childrenContainer.style.display = 'none';
            childrenContainer.style.paddingLeft = '15px';

            if (item.children && item.children.length > 0) {
                buildTree(childrenContainer, item.children, false);
            }

            li.appendChild(childrenContainer);

            folderHeader.addEventListener('click', (e) => {
                e.stopPropagation();
                childrenContainer.style.display =
                    childrenContainer.style.display === 'none' ? 'block' : 'none';
            });

        } else if (item.type === 'file') {
            const fileContainer = document.createElement('div');
            fileContainer.classList.add('file-container');
            fileContainer.style.display = 'flex';
            fileContainer.style.alignItems = 'center';
            fileContainer.style.gap = '8px';
            fileContainer.style.fontStyle = 'italic';
            fileContainer.style.cursor = 'pointer';
            fileContainer.style.padding = '4px 6px';
            fileContainer.style.borderRadius = '4px';
            fileContainer.style.width = '100%';
            fileContainer.style.boxSizing = 'border-box';

            const icon = document.createElement('img');
            icon.src = '/static/images/file.png';
            icon.style.width = '16px';
            icon.style.height = '16px';

            const spanText = document.createElement('span');
            spanText.textContent = item.name;

            fileContainer.appendChild(icon);
            fileContainer.appendChild(spanText);
            li.appendChild(fileContainer);

            fileContainer.addEventListener('click', () => {
                const project_name = item.project_name || item.parent_project;
                const username = item.username;

                if (!username || !project_name) {
                    console.error('Username or project_name missing for file', item);
                    return;
                }

                const filePath = item.path || `${project_name}/${item.name}`;
                fetch(`/view_file/${username}/${filePath}`)
                    .then(res => res.json())
                    .then(data => {
                        const panel = document.querySelector('.content-panel');
                        panel.innerHTML = '';

                        if (data.error) {
                            panel.textContent = `Error: ${data.error}`;
                        } else {
                            const fileBox = document.createElement('div');
                            fileBox.classList.add('create-project-box');

                            const title = document.createElement('h2');
                            title.textContent = item.name;
                            fileBox.appendChild(title);

                            if (item.name.toLowerCase().endsWith('.html')) {
                                const iframe = document.createElement('iframe');
                                iframe.style.width = '100%';
                                iframe.style.height = '600px';
                                iframe.style.border = '1px solid #ccc';
                                iframe.srcdoc = data.content;
                                fileBox.appendChild(iframe);
                            } else {
                                const pre = document.createElement('pre');
                                pre.style.overflowY = 'auto';
                                pre.style.whiteSpace = 'pre-wrap';
                                pre.textContent = data.content;
                                fileBox.appendChild(pre);
                            }

                            panel.appendChild(fileBox);
                        }
                    })
                    .catch(err => console.error(err));
            });

            fileContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const downloadLink = document.createElement('a');
                downloadLink.href = `/projects/${item.username}/${item.path}`;
                downloadLink.download = item.name;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            });
        }

        ul.appendChild(li);
    });

    container.appendChild(ul);
}

function runProject(projectName, statusIcon) {
    const panel = document.querySelector('.content-panel');
    panel.innerHTML = '';
    const fileBox = document.createElement('div');
    fileBox.classList.add('create-project-box');
    const title = document.createElement('h2');
    title.textContent = 'Salida RMD';
    fileBox.appendChild(title);
    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.overflowY = 'auto';
    fileBox.appendChild(pre);
    panel.appendChild(fileBox);

    if (statusIcon) {
        statusIcon.src = '';
        statusIcon.classList.add('spinner');
    }

    const eventSource = new EventSource(`/run_rmd?project_name=${encodeURIComponent(projectName)}`);

    eventSource.onmessage = (event) => {
        if (event.data === "---FIN---") {
            eventSource.close();

            fetch('/api/sidebar_right')
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('sidebar-right');
                    container.innerHTML = '';
                    const title = document.createElement('h3');
                    title.textContent = data.title;
                    container.appendChild(title);
                    buildTree(container, data.items, true);
                })
                .catch(err => console.error("Error refrescando sidebar:", err));
        } else {
            pre.textContent += event.data + "\n";
            pre.scrollTop = pre.scrollHeight;
        }
    };


    eventSource.onerror = (err) => {
        console.error("Error en SSE:", err);
        eventSource.close();

        if (statusIcon) {
            statusIcon.classList.remove('spinner');
            statusIcon.src = '/static/images/play.png';
            statusIcon.style.cursor = 'pointer';
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/sidebar_right')
        .then(res => res.json())
        .then(data => {
            console.log("Datos recibidos del backend:", data);
            const container = document.getElementById('sidebar-right');
            container.innerHTML = '';

            const title = document.createElement('h3');
            title.textContent = data.title;
            container.appendChild(title);

            if (data.items && data.items.length > 0) {
                buildTree(container, data.items, true);
            } else {
                console.warn("No hay items para mostrar en el sidebar");
            }
        })
        .catch(err => console.error("Error al cargar sidebar:", err));
});
