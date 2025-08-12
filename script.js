document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const suggestionsList = document.getElementById('suggestions');
    const categoryButtons = document.getElementById('category-buttons');
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    const feedbackForm = document.querySelector('.feedback-form');
    const suggestionForm = document.querySelector('.suggestion-form');
    const noResultsMessage = document.getElementById('no-results');
    const searchEngineButtons = document.querySelectorAll('.search-engine-btn');
    const suggestUrlInput = document.getElementById('suggest-url');

    let links = [];
    let currentCategory = 'all';
    let selectedIndex = -1;
    let selectedSearchEngineIndex = -1;
    let debounceTimeout;

    // Fetch the data from sites.json
    fetch('sites.json')
        .then(response => response.json())
        .then(data => {
            links = data;
            initializeSite();
        })
        .catch(error => console.error('Error fetching data:', error));

    const initializeSite = () => {
        const allCategories = ['all', ...new Set(links.map(item => item.category))];
        createCategoryButtons(allCategories);
        searchInput.focus();
    };

    const createCategoryButtons = (categories) => {
        categoryButtons.innerHTML = '';
        
        categories.forEach(category => {
            const button = document.createElement('button');
            button.classList.add('category-btn');
            if (category === 'all') {
                button.classList.add('active');
            }
            button.dataset.category = category;
            button.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            if (category.toLowerCase() === 'ai') {
                button.textContent = 'AI';
            }
            categoryButtons.appendChild(button);
        });
    };

    categoryButtons.addEventListener('click', (e) => {
        if (e.target.matches('.category-btn')) {
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            filterSuggestions(searchInput.value);
            searchInput.focus();
        }
    });

    const getFaviconUrl = (link) => {
        if (link.favicon) {
            return link.favicon;
        }
        try {
            const domain = new URL(link.url).hostname;
            // Using a reliable, high-resolution favicon service
            return `https://s2.googleusercontent.com/s2/favicons?domain_url=${domain}&sz=128`;
        } catch {
            return null;
        }
    };

    const filterSuggestions = (query) => {
        suggestionsList.innerHTML = '';
        selectedIndex = -1;
        noResultsMessage.style.display = 'none';

        if (query.trim() === '') {
            return;
        }

        const filteredLinks = links.filter(link => {
            const matchesQuery = link.key.includes(query.toLowerCase());
            const matchesCategory = currentCategory === 'all' || link.category === currentCategory;
            return matchesQuery && matchesCategory;
        });

        if (filteredLinks.length === 0) {
            noResultsMessage.style.display = 'block';
            selectedSearchEngineIndex = -1;
            searchEngineButtons.forEach(btn => btn.classList.remove('selected'));
        } else {
            filteredLinks.forEach(link => {
                const li = document.createElement('li');
                li.dataset.url = link.url;
                
                const faviconUrl = getFaviconUrl(link);
                const iconElement = document.createElement('img');
                
                iconElement.onload = function() {
                    if (this.naturalWidth > 16 || this.naturalHeight > 16) {
                         iconElement.classList.add('favicon-image');
                         li.prepend(iconElement);
                    } else {
                         const placeholder = document.createElement('div');
                         placeholder.classList.add('placeholder-icon');
                         li.prepend(placeholder);
                    }
                };
                iconElement.onerror = function() {
                    const placeholder = document.createElement('div');
                    placeholder.classList.add('placeholder-icon');
                    li.prepend(placeholder);
                };
                iconElement.src = faviconUrl;
                iconElement.alt = `${link.key} Favicon`;

                const linkDetails = document.createElement('div');
                linkDetails.classList.add('link-details');
                linkDetails.innerHTML = `
                    <strong>${link.key}</strong>
                    <span>(${link.category})</span>
                `;
                
                li.appendChild(linkDetails);
                suggestionsList.appendChild(li);
            });
        }
    };

    const navigateSuggestions = (direction) => {
        const items = Array.from(suggestionsList.children);
        if (items.length === 0) return;

        if (direction === 'down') {
            selectedIndex = (selectedIndex + 1) % items.length;
        } else if (direction === 'up') {
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        }

        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    };

    const navigateSearchEngines = (direction) => {
        if (searchEngineButtons.length === 0) return;
        
        let newIndex = selectedSearchEngineIndex;
        if (direction === 'right' || direction === 'down') {
            newIndex = (newIndex + 1) % searchEngineButtons.length;
        } else if (direction === 'left' || direction === 'up') {
            newIndex = (newIndex - 1 + searchEngineButtons.length) % searchEngineButtons.length;
        }
        
        selectedSearchEngineIndex = newIndex;

        searchEngineButtons.forEach((btn, index) => {
            if (index === selectedSearchEngineIndex) {
                btn.classList.add('selected');
                btn.focus();
            } else {
                btn.classList.remove('selected');
            }
        });
    };
    
    const isValidUrl = (string) => {
        if (string.includes('.')) {
            try {
                const url = string.startsWith('http') ? string : `https://${string}`;
                new URL(url);
                return true;
            } catch (_) {
                return false;  
            }
        }
        return false;
    };

    const goToSelectedLink = () => {
        const query = searchInput.value.trim().toLowerCase();
        const selectedItem = document.querySelector('.suggestions li.selected');

        if (selectedItem) {
            window.open(selectedItem.dataset.url, '_blank');
        } else if (suggestionsList.querySelector('li')) {
            window.open(suggestionsList.querySelector('li').dataset.url, '_blank');
        } else if (isValidUrl(query)) {
            const url = query.startsWith('http') ? query : `https://${query}`;
            window.open(url, '_blank');
        } else if (noResultsMessage.style.display === 'block' && selectedSearchEngineIndex !== -1) {
            const selectedButton = searchEngineButtons[selectedSearchEngineIndex];
            const url = selectedButton.dataset.searchUrl + encodeURIComponent(query);
            window.open(url, '_blank');
        } else {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        }

        searchInput.value = '';
        filterSuggestions('');
        searchInput.focus();
    };

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            filterSuggestions(searchInput.value);
        }, 15);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (suggestionsList.children.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateSuggestions('down');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateSuggestions('up');
            }
        } else if (noResultsMessage.style.display === 'block' && searchEngineButtons.length > 0) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                searchEngineButtons[0].focus();
            }
        }
        
        if (e.key === 'Enter') {
            e.preventDefault();
            goToSelectedLink();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterSuggestions('');
            searchInput.blur();
        }
        if ((e.key === 'k' && (e.metaKey || e.ctrlKey))) {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Toggle help panel
        if ((e.key === '/' && (e.metaKey || e.ctrlKey))) {
            e.preventDefault();
            const shortcutsHeader = document.querySelector('[data-target="shortcuts"]');
            shortcutsHeader.click();
        }
        
        // Focus feedback form
        if ((e.key === 'f' && (e.metaKey || e.ctrlKey))) {
            e.preventDefault();
            const feedbackName = document.getElementById('feedback-name');
            if (feedbackName) feedbackName.focus();
        }
        
        // Focus suggestion form
        if ((e.key === 's' && (e.metaKey || e.ctrlKey))) {
            e.preventDefault();
            const suggestName = document.getElementById('suggest-name');
            if (suggestName) suggestName.focus();
        }
        
        // Tab navigation for category buttons
        if (e.key === 'Tab' && (document.activeElement === searchInput || categoryButtons.contains(document.activeElement))) {
            e.preventDefault();
            const buttons = Array.from(document.querySelectorAll('.category-btn'));
            const currentIndex = buttons.indexOf(document.activeElement);
            
            if (e.shiftKey) {
                // Shift+Tab - move backward
                const prevIndex = (currentIndex - 1 + buttons.length) % buttons.length;
                buttons[prevIndex].focus();
            } else {
                // Tab - move forward
                const nextIndex = (currentIndex + 1) % buttons.length;
                buttons[nextIndex].focus();
            }
        }
    });

    suggestionsList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li) {
            window.open(li.dataset.url, '_blank');
            searchInput.value = '';
            filterSuggestions('');
            searchInput.focus();
        }
    });

    searchEngineButtons.forEach((button, index) => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const query = searchInput.value;
            const url = button.dataset.searchUrl + encodeURIComponent(query);
            window.open(url, '_blank');
        });
        button.addEventListener('focus', () => {
            selectedSearchEngineIndex = index;
            searchEngineButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
        });
        button.addEventListener('blur', () => {
            button.classList.remove('selected');
        });
        button.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                navigateSearchEngines(e.key.replace('Arrow', '').toLowerCase());
            } else if (e.key === 'Enter') {
                e.preventDefault();
                goToSelectedLink();
            }
        });
    });

    if (suggestUrlInput) {
        suggestUrlInput.addEventListener('focus', () => {
            if (suggestUrlInput.value === '') {
                suggestUrlInput.value = 'https://';
            }
        });
    }

    if (suggestionForm) {
        suggestionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert("Your suggestion has been noted. We will update the list soon!");
            suggestionForm.reset();
        });
    }

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert("Thank you for your feedback!");
            feedbackForm.reset();
        });
    }

    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = document.getElementById(header.dataset.target);
            if (content) {
                document.querySelectorAll('.collapsible-header.active').forEach(activeHeader => {
                    if (activeHeader !== header) {
                        activeHeader.classList.remove('active');
                        document.getElementById(activeHeader.dataset.target).classList.remove('visible');
                    }
                });
                header.classList.toggle('active');
                content.classList.toggle('visible');
            }
        });
    });
});