// --- Data ---
const stores = [
    { id: 'woodart', name: 'Wood Art', category: 'jewelry', icon: 'fa-tree', door: {x: 160, y: 200}, path: 'M 400 355 L 240 355 L 240 200 L 160 200', desc: 'Handcrafted wooden art, puzzles, and unique gifts.', estTime: '1 min' },
    { id: 'restrooms', name: 'Restrooms', category: 'amenities', icon: 'fa-restroom', door: {x: 290, y: 200}, path: 'M 400 355 L 240 355 L 240 200 L 290 200', desc: 'Public restrooms, family facilities, and nursing rooms.', estTime: '1 min' },
    { id: 'foodcourt', name: 'Food Court', category: 'dining', icon: 'fa-utensils', door: {x: 450, y: 200}, path: 'M 400 355 L 560 355 L 560 200 L 450 200', desc: 'A variety of quick-service dining options to satisfy any craving.', estTime: '2 mins' },
    { id: 'imagination', name: 'Imagination Playground', category: 'entertainment', icon: 'fa-shapes', door: {x: 630, y: 200}, path: 'M 400 355 L 560 355 L 560 200 L 630 200', desc: 'Interactive children\'s play area with safe, foam building blocks.', estTime: '2 mins' },
    { id: 'helzberg', name: 'Helzberg Diamonds', category: 'jewelry', icon: 'fa-gem', door: {x: 170, y: 370}, path: 'M 400 355 L 170 355 L 170 370', desc: 'Fine jewelry, engagement rings, and luxury watches.', estTime: '1 min' },
    { id: 'francescas', name: 'francesca\'s', category: 'apparel', icon: 'fa-tshirt', door: {x: 310, y: 370}, path: 'M 400 355 L 310 355 L 310 370', desc: 'Trendy women\'s clothing, accessories, and gifts.', estTime: '< 1 min' },
    { id: 'sunglasshut', name: 'Sunglass Hut', category: 'accessories', icon: 'fa-glasses', door: {x: 430, y: 370}, path: 'M 400 355 L 430 355 L 430 370', desc: 'Top designer brands of sunglasses and eyewear.', estTime: '< 1 min' },
    { id: 'vans', name: 'Vans', category: 'shoes', icon: 'fa-shoe-prints', door: {x: 540, y: 370}, path: 'M 400 355 L 540 355 L 540 370', desc: 'Skate shoes, apparel, and accessories for men and women.', estTime: '1 min' },
    { id: 'brighton', name: 'Brighton', category: 'accessories', icon: 'fa-shopping-bag', door: {x: 650, y: 370}, path: 'M 400 355 L 650 355 L 650 370', desc: 'Charm bracelets, leather goods, and women\'s accessories.', estTime: '1.5 mins' }
];

// --- State ---
let currentCategory = 'all';
let searchQuery = '';
let selectedStoreId = null;
let zoomLevel = 1;
let mapPos = { x: 0, y: 0 };
let isDragging = false;
let startDragPos = { x: 0, y: 0 };

// Inactivity Timeout
let inactivityTimer;
const INACTIVITY_LIMIT = 60000; // 60 seconds back to idle

// --- DOM Elements ---
const screens = {
    idle: document.getElementById('idle-screen'),
    main: document.getElementById('main-screen')
};
const storeListEl = document.getElementById('store-list');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const categoryBtns = document.querySelectorAll('.category-btn');
const timeEl = document.getElementById('current-time');
const homeBtn = document.getElementById('home-btn');

// Details Panel
const detailsPanel = document.getElementById('store-details');
const btnBackList = document.getElementById('back-to-list');
const detailName = document.getElementById('detail-name');
const detailCat = document.getElementById('detail-category');
const detailDesc = document.getElementById('detail-desc');
const btnTakeMeThere = document.getElementById('take-me-there');

// Map Elements
const mapWrapper = document.getElementById('map-wrapper');
const routePath = document.getElementById('route-path');
const routeEnd = document.getElementById('route-end');
const mapStoreShapes = document.querySelectorAll('.store-shape');
const wayfindingCard = document.getElementById('wayfinding-card');
const routeDestName = document.getElementById('route-dest-name');
const routeTime = document.getElementById('route-time');
const endRouteBtn = document.getElementById('end-route-btn');
const mapContainer = document.querySelector('.map-container');


// --- Initialization ---
function init() {
    updateTime();
    setInterval(updateTime, 10000);
    renderStoreList();
    setupEventListeners();
    resetInactivityTimer();
}

function updateTime() {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// --- Interaction & State Management ---

function setupEventListeners() {
    // Screen transitions
    screens.idle.addEventListener('click', () => switchScreen('main'));
    homeBtn.addEventListener('click', () => switchScreen('idle'));

    // Reset timer on any interaction
    document.body.addEventListener('touchstart', resetInactivityTimer);
    document.body.addEventListener('click', resetInactivityTimer);
    document.body.addEventListener('mousemove', resetInactivityTimer);

    // Sidebar Search & Filter
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        clearSearchBtn.classList.toggle('hidden', searchQuery === '');
        renderStoreList();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        renderStoreList();
    });

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            renderStoreList();
        });
    });

    // Details Panel
    btnBackList.addEventListener('click', closeDetailsPanel);
    btnTakeMeThere.addEventListener('click', () => {
        if(selectedStoreId) drawRoute(selectedStoreId);
    });
    endRouteBtn.addEventListener('click', clearRoute);

    // Map Shapes Click
    mapStoreShapes.forEach(shape => {
        shape.addEventListener('click', (e) => {
            const id = shape.dataset.id;
            selectStore(id);
        });
    });

    // Map Zooming
    document.getElementById('zoom-in-btn').addEventListener('click', () => setZoom(zoomLevel + 0.2));
    document.getElementById('zoom-out-btn').addEventListener('click', () => setZoom(zoomLevel - 0.2));
    document.getElementById('reset-map-btn').addEventListener('click', resetMap);

    // Map Panning (Mouse/Touch Drag)
    mapContainer.addEventListener('mousedown', startDrag);
    mapContainer.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', endDrag);

    mapContainer.addEventListener('touchstart', (e) => startDrag(e.touches[0]));
    mapContainer.addEventListener('touchmove', (e) => drag(e.touches[0]));
    window.addEventListener('touchend', endDrag);
}

function switchScreen(screenName) {
    if (screenName === 'main') {
        screens.idle.classList.remove('active');
        screens.main.classList.add('active');
        resetInactivityTimer();
    } else {
        screens.main.classList.remove('active');
        screens.idle.classList.add('active');
        clearTimeout(inactivityTimer);
        // Reset app state
        clearRoute();
        closeDetailsPanel();
        resetMap();
        searchInput.value = '';
        searchQuery = '';
        categoryBtns[0].click(); // Reset to 'All'
    }
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (screens.main.classList.contains('active')) {
        inactivityTimer = setTimeout(() => switchScreen('idle'), INACTIVITY_LIMIT);
    }
}

// --- Directory Logic ---

function renderStoreList() {
    storeListEl.innerHTML = '';

    const filteredStores = stores.filter(store => {
        const matchesCategory = currentCategory === 'all' || store.category === currentCategory;
        const matchesSearch = store.name.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    if (filteredStores.length === 0) {
        storeListEl.innerHTML = '<li class="no-results">No places found.</li>';
        return;
    }

    // Sort alphabetically
    filteredStores.sort((a, b) => a.name.localeCompare(b.name)).forEach(store => {
        const li = document.createElement('li');
        li.className = `store-item ${store.id === selectedStoreId ? 'selected' : ''}`;
        li.dataset.id = store.id;
        li.innerHTML = `
            <div class="store-icon"><i class="fas ${store.icon}"></i></div>
            <div class="store-info" style="flex:1; margin-left: 15px;">
                <h3>${store.name}</h3>
                <p>${store.category}</p>
            </div>
            <i class="fas fa-chevron-right" style="color: var(--secondary); opacity: 0.5;"></i>
        `;
        li.addEventListener('click', () => selectStore(store.id));
        storeListEl.appendChild(li);
    });
}

function selectStore(id) {
    selectedStoreId = id;

    // Update map highlighting
    mapStoreShapes.forEach(shape => {
        shape.classList.toggle('selected', shape.dataset.id === id);
    });

    // Update list highlighting
    document.querySelectorAll('.store-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.id === id);
    });

    const store = stores.find(s => s.id === id);
    if (store) {
        openDetailsPanel(store);
        // Optional: auto-center map on store if we want
    }
}

function openDetailsPanel(store) {
    detailName.textContent = store.name;
    detailCat.textContent = store.category;
    detailDesc.textContent = store.desc;

    detailsPanel.classList.remove('hidden');
    clearRoute(); // Clear previous route if any
}

function closeDetailsPanel() {
    detailsPanel.classList.add('hidden');
    selectedStoreId = null;
    mapStoreShapes.forEach(shape => shape.classList.remove('selected'));
    renderStoreList();
    clearRoute();
}

// --- Map & Wayfinding ---

function drawRoute(storeId) {
    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    // Draw path
    routePath.setAttribute('d', store.path);
    routePath.classList.remove('hidden');

    // Animate path drawing (CSS technique)
    const length = routePath.getTotalLength();
    routePath.style.strokeDasharray = length;
    routePath.style.strokeDashoffset = length;

    // Force reflow
    routePath.getBoundingClientRect();

    routePath.style.transition = 'stroke-dashoffset 1.5s ease-in-out';
    routePath.style.strokeDashoffset = '0';

    // Show endpoint dot
    setTimeout(() => {
        routeEnd.setAttribute('cx', store.door.x);
        routeEnd.setAttribute('cy', store.door.y);
        routeEnd.classList.remove('hidden');
    }, 1500);

    // Show Card
    routeDestName.textContent = store.name;
    routeTime.textContent = `Est. ${store.estTime} walk`;
    wayfindingCard.classList.remove('hidden');
}

function clearRoute() {
    routePath.classList.add('hidden');
    routePath.style.transition = 'none'; // reset transition
    routeEnd.classList.add('hidden');
    wayfindingCard.classList.add('hidden');
}

// --- Map Panning and Zooming ---

function setZoom(level) {
    zoomLevel = Math.max(0.5, Math.min(level, 2.5));
    updateMapTransform();
}

function resetMap() {
    zoomLevel = 1;
    mapPos = { x: 0, y: 0 };
    updateMapTransform();
}

function updateMapTransform() {
    mapWrapper.style.transform = `translate(${mapPos.x}px, ${mapPos.y}px) scale(${zoomLevel})`;
}

function startDrag(e) {
    if (e.target.closest('.map-toolbar') || e.target.closest('.wayfinding-card')) return;
    isDragging = true;
    startDragPos = {
        x: e.clientX || e.pageX || e.screenX || 0,
        y: e.clientY || e.pageY || e.screenY || 0
    };
    // mapContainer.style.cursor = 'grabbing';
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const currentX = e.clientX || e.pageX || e.screenX || 0;
    const currentY = e.clientY || e.pageY || e.screenY || 0;

    const dx = currentX - startDragPos.x;
    const dy = currentY - startDragPos.y;

    mapPos.x += dx;
    mapPos.y += dy;

    startDragPos = { x: currentX, y: currentY };
    updateMapTransform();
}

function endDrag() {
    isDragging = false;
    // mapContainer.style.cursor = 'grab';
}

// Run init
init();
