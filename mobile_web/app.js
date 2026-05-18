// Generate a session request ID
let currentRequestId = 'REQ-' + Math.floor(Math.random() * 1000000);
document.getElementById('current-request-id').textContent = currentRequestId;

// --- Navigation Logic ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update Active Nav
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // Switch Tab
        const targetId = e.currentTarget.getAttribute('data-target');
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        // Load data on tab switch
        if (targetId === 'tab-bookings') fetchBookings();
        if (targetId === 'tab-providers') fetchProviders();
        if (targetId === 'tab-logs') refreshLogs();
    });
});

// --- Chat Logic ---
const inputEl = document.getElementById('user-input');
const sendBtn = document.getElementById('btn-send');
const chatHistory = document.getElementById('chat-history');
const loadingOverlay = document.getElementById('loading-overlay');

function appendMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user' : 'system'}`;
    
    const avatarIcon = isUser ? 'person-outline' : 'hardware-chip-outline';
    
    msgDiv.innerHTML = `
        <div class="avatar"><ion-icon name="${avatarIcon}"></ion-icon></div>
        <div class="bubble"><p>${text}</p></div>
    `;
    
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendProviderCard(provider, pricing, intentData) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message system';
    
    msgDiv.innerHTML = `
        <div class="avatar"><ion-icon name="hardware-chip-outline"></ion-icon></div>
        <div class="bubble" style="width: 100%;">
            <p>I found the perfect match for you based on my multi-factor reasoning:</p>
            
            <div class="card" style="margin-top: 10px;">
                <div class="provider-header">
                    <img src="${provider.photoUrl}" class="provider-img" alt="Provider">
                    <div class="provider-info">
                        <h3>${provider.name}</h3>
                        <div class="provider-meta">
                            <span class="rating">⭐ ${provider.rating}</span>
                            <span>(${provider.reviewsCount} reviews)</span>
                        </div>
                        <div class="provider-meta">
                            <ion-icon name="location-outline"></ion-icon>
                            <span>${provider.distance} km away</span>
                        </div>
                    </div>
                </div>
                
                <div style="font-size: 12px; color: var(--accent-emerald); margin-bottom: 10px;">
                    ✓ ${provider.reliabilityScore}% On-time record
                </div>

                <div class="price-box">
                    <button class="price-tooltip-btn" onclick="togglePriceDetails(this)">
                        <ion-icon name="information-circle-outline"></ion-icon>
                    </button>
                    <div style="font-size: 13px; color: var(--text-secondary);">Estimated Price</div>
                    <div style="font-size: 20px; font-weight: 700; color: var(--accent-amber);">Rs. ${pricing.finalEstimatedPrice}</div>
                    
                    <div class="price-details">
                        <div class="price-row"><span>Base Rate:</span><span>Rs. ${pricing.baseRate}</span></div>
                        <div class="price-row"><span>Complexity (${intentData.complexity}):</span><span>x${pricing.complexityMultiplier}</span></div>
                        <div class="price-row"><span>Urgency Premium:</span><span>Rs. ${pricing.urgencyPremium}</span></div>
                        <div class="price-row"><span>Distance Surcharge:</span><span>Rs. ${pricing.distanceCost}</span></div>
                        <div style="margin-top: 8px; font-style: italic;">Note: ${pricing.partsEstimate}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

window.togglePriceDetails = function(btn) {
    const details = btn.nextElementSibling.nextElementSibling.nextElementSibling;
    details.classList.toggle('show');
}

async function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;

    appendMessage(text, true);
    inputEl.value = '';
    loadingOverlay.classList.remove('hidden');

    const result = await ApiService.sendRequest(text, currentRequestId);
    
    loadingOverlay.classList.add('hidden');

    if (result.status === 'SUCCESS') {
        appendProviderCard(result.provider, result.pricing, result.intent);
        setTimeout(() => {
            appendMessage(`✅ <b>Auto-Simulated Booking Complete!</b><br>Your slot is booked for: ${result.booking.scheduledTime}. Check the Bookings tab for details.`);
        }, 1000);
    } else {
        appendMessage(result.message);
    }
}

sendBtn.addEventListener('click', handleSend);
inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// --- Tab 2: Bookings ---
async function fetchBookings() {
    const list = document.getElementById('bookings-list');
    list.innerHTML = '<div class="empty-state">Loading...</div>';
    
    const bookings = await ApiService.getBookings();
    
    if (bookings.length === 0) {
        list.innerHTML = '<div class="empty-state">No bookings found.</div>';
        return;
    }
    
    list.innerHTML = '';
    bookings.forEach(b => {
        let priceBreakdownHTML = '';
        if (b.breakdown) {
            priceBreakdownHTML = `
                <div class="price-box" style="margin-top: 8px;">
                    <div style="font-size: 16px; font-weight: bold;">Rs. ${b.totalPrice}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        Base: Rs. ${b.breakdown.baseRate} | Dist: Rs. ${b.breakdown.distanceCost} | Urgency: Rs. ${b.breakdown.urgencyPremium}
                    </div>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-weight: 600;">${b.serviceType}</span>
                <span class="status-badge status-${b.status}">${b.status}</span>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">
                <ion-icon name="calendar-outline" style="vertical-align: middle;"></ion-icon> ${b.scheduledTime}
            </div>
            <div style="font-size: 13px; color: var(--text-secondary);">
                <ion-icon name="location-outline" style="vertical-align: middle;"></ion-icon> Sector: ${b.location}
            </div>
            ${priceBreakdownHTML}
            
            <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button class="btn btn-secondary" style="flex:1; padding: 8px; font-size: 13px;" onclick="simulateDispute('${b.id}', 'NO_SHOW')">Force No-Show</button>
                <button class="btn btn-danger" style="flex:1; padding: 8px; font-size: 13px;" onclick="simulateDispute('${b.id}', 'QUALITY_ISSUE')">Dispute Quality</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.simulateDispute = async function(bookingId, type) {
    loadingOverlay.classList.remove('hidden');
    const res = await ApiService.simulateDispute(bookingId, type);
    loadingOverlay.classList.add('hidden');
    
    if(res.success) {
        alert("Agent Dispute Resolution:\n\n" + res.resolution);
        fetchBookings();
    }
}

// --- Tab 3: Providers ---
async function fetchProviders() {
    const list = document.getElementById('providers-list');
    list.innerHTML = '<div class="empty-state">Loading...</div>';
    
    const providers = await ApiService.getProviders();
    const displayProviders = providers.slice(0, 15); // Show a subset to avoid huge lists
    
    list.innerHTML = '';
    displayProviders.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="provider-header" style="margin-bottom:0;">
                <img src="${p.photoUrl}" class="provider-img" alt="Provider">
                <div class="provider-info">
                    <h3>${p.name}</h3>
                    <div style="font-size: 12px; color: var(--accent-amber); margin-top:2px;">${p.category} • ${p.sector}</div>
                    <div class="provider-meta">
                        <span class="rating">⭐ ${p.rating}</span>
                        <span>(${p.reviewsCount})</span>
                        <span style="margin-left:8px; color:var(--accent-emerald);">Rel: ${p.reliabilityScore}%</span>
                    </div>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

// --- Tab 4: Agent Logs ---
async function refreshLogs() {
    const list = document.getElementById('logs-list');
    
    const logs = await ApiService.getLogs(currentRequestId);
    
    if (logs.length === 0) {
        list.innerHTML = '<div class="empty-state">No agent traces for current session. Make a request in the Chat tab first.</div>';
        return;
    }
    
    list.innerHTML = '';
    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        
        let detailsStr = "";
        try {
            detailsStr = JSON.stringify(log.details, null, 2);
        } catch(e) {
            detailsStr = String(log.details);
        }

        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-agent">${log.agent}</div>
            <div class="timeline-action">${log.action}</div>
            <div class="timeline-details">${detailsStr}</div>
        `;
        list.appendChild(item);
    });
}
