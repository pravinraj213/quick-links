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
                li.innerHTML = `<strong>${link.key}</strong> <span>(${link.category})</span>`;
                li.dataset.url = link.url;
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
        
        if (direction === 'down') {
            if (selectedSearchEngineIndex === -1) {
                selectedSearchEngineIndex = 0;
            }
        } else if (direction === 'right') {
            selectedSearchEngineIndex = (selectedSearchEngineIndex + 1) % searchEngineButtons.length;
        } else if (direction === 'left') {
            selectedSearchEngineIndex = (selectedSearchEngineIndex - 1 + searchEngineButtons.length) % searchEngineButtons.length;
        }

        searchEngineButtons.forEach((btn, index) => {
            if (index === selectedSearchEngineIndex) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    };
    
    // Updated function to validate URL
    const isValidUrl = (string) => {
        try {
            const url = string.startsWith('http') ? string : `https://${string}`;
            new URL(url);
            return true;
        } catch (_) {
            return false;  
        }
    };

    const goToSelectedLink = () => {
        const query = searchInput.value.trim();
        const selectedItem = document.querySelector('.suggestions li.selected');
        
        if (isValidUrl(query)) {
            const url = query.startsWith('http') ? query : `https://${query}`;
            window.open(url, '_blank');
        } else if (selectedItem) {
            window.open(selectedItem.dataset.url, '_blank');
        } else if (suggestionsList.querySelector('li')) {
            window.open(suggestionsList.querySelector('li').dataset.url, '_blank');
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
        } else if (noResultsMessage.style.display === 'block') {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateSearchEngines('down');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigateSearchEngines('right');
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateSearchEngines('left');
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
        // Change the shortcut key for focusing the search bar
        if ((e.key === 'k' && (e.metaKey || e.ctrlKey))) {
            e.preventDefault();
            searchInput.focus();
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
    });

    // Automatically fill the URL form with 'https://'
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