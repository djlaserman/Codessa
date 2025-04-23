// Advanced section logic and rendering
export function renderAdvancedSection(container: HTMLElement, settings: any) {
    let html = `<style>
        .adv-section-title { font-size:1.18em; font-weight:600; margin-bottom:10px; color:#222; letter-spacing:0.01em; }
        .adv-group { margin-bottom:18px; padding:12px 14px; background:#f8fafc; border-radius:8px; }
        .adv-label { font-weight:500; margin-bottom:3px; display:block; color:#374151; }
        .adv-desc { color:#6b7280; font-size:0.97em; margin-bottom:6px; }
        .adv-btn { background:#2563eb; color:#fff; border:none; border-radius:5px; padding:4px 12px; margin:0 2px; font-size:1em; cursor:pointer; transition:background 0.15s; }
        .adv-btn:hover { background:#1d4ed8; }
        .adv-btn[disabled] { background:#e5e7eb; color:#888; cursor:not-allowed; }
        .adv-danger { background:#fee2e2; color:#b91c1c; border:none; border-radius:5px; padding:4px 12px; font-size:1em; cursor:pointer; transition:background 0.15s; margin-top:8px; }
        .adv-danger:hover { background:#fecaca; color:#dc2626; }
    </style>`;
    html += `<div class="adv-section-title">⚙️ Advanced Settings</div>`;

    // --- Data Sync Interval ---
    html += `<div class="adv-group">
        <span class="adv-label">Data Sync Interval</span>
        <span class="adv-desc">How often (in minutes) should your data be synced?</span>
        <span style="margin-right:12px;">${settings.syncInterval || 10} min</span>
        <button class="adv-btn" id="editSyncIntervalBtn">Edit</button>
    </div>`;

    // --- Verbose Logging ---
    html += `<div class="adv-group">
        <span class="adv-label">Verbose Logging</span>
        <span class="adv-desc">Enable detailed log output for debugging and diagnostics.</span>
        <div style="display:flex;align-items:center;gap:10px;">
            <span>${settings.verboseLogging ? '<b>Enabled</b>' : 'Disabled'}</span>
            <button class="adv-btn" id="editVerboseLoggingBtn">Edit</button>
        </div>
    </div>`;

    // --- Max Concurrent Tasks ---
    html += `<div class="adv-group">
        <span class="adv-label">Max Concurrent Tasks</span>
        <span class="adv-desc">Limit the number of tasks that can run at the same time.</span>
        <span style="margin-right:12px;">${typeof settings.maxConcurrentTasks === 'number' ? settings.maxConcurrentTasks : 4}</span>
        <button class="adv-btn" id="editMaxConcurrentTasksBtn">Edit</button>
    </div>`;

    // --- Danger Zone ---
    html += `<div class="adv-group" style="background:#fff0f0;border:1px solid #fecaca;">
        <span class="adv-label" style="color:#b91c1c;">Danger Zone</span>
        <span class="adv-desc">Clear all application data. This action cannot be undone!</span>
        <button class="adv-danger" id="clearAppDataBtn">Clear All Data</button>
    </div>`;

    container.innerHTML = html;


    // --- Modal logic for editing Sync Interval ---
    document.getElementById('editSyncIntervalBtn')?.addEventListener('click', () => {
        import('../components/modal').then(({ showModal }) => {
            showModal({
                title: 'Edit Data Sync Interval',
                content: `<label>Sync Interval (minutes): <input type='number' id='modalSyncInterval' min='1' max='120' value='${settings.syncInterval || 10}' style='width:60px;'></label>`,
                onConfirm: () => {
                    const val = parseInt((document.getElementById('modalSyncInterval') as HTMLInputElement).value, 10);
                    if (isNaN(val) || val < 1 || val > 120) {
                        alert('Sync interval must be between 1 and 120.');
                        return;
                    }
                    settings.syncInterval = val;
                    renderAdvancedSection(container, settings);
                }
            });
        });
    });

    // --- Modal logic for editing Verbose Logging ---
    document.getElementById('editVerboseLoggingBtn')?.addEventListener('click', () => {
        import('../components/modal').then(({ showModal }) => {
            showModal({
                title: 'Edit Verbose Logging',
                content: `<label style='display:flex;align-items:center;gap:8px;'><input type='checkbox' id='modalVerboseLogging' ${settings.verboseLogging ? 'checked' : ''}/> Enable Verbose Logging</label>`,
                onConfirm: () => {
                    const cb = document.getElementById('modalVerboseLogging') as HTMLInputElement;
                    settings.verboseLogging = !!cb?.checked;
                    renderAdvancedSection(container, settings);
                }
            });
        });
    });

    // --- Modal logic for editing Max Concurrent Tasks ---
    document.getElementById('editMaxConcurrentTasksBtn')?.addEventListener('click', () => {
        import('../components/modal').then(({ showModal }) => {
            showModal({
                title: 'Edit Max Concurrent Tasks',
                content: `<label>Max Concurrent Tasks: <input type='number' id='modalMaxConcurrentTasks' min='1' max='32' value='${typeof settings.maxConcurrentTasks === 'number' ? settings.maxConcurrentTasks : 4}' style='width:60px;'></label>`,
                onConfirm: () => {
                    const val = parseInt((document.getElementById('modalMaxConcurrentTasks') as HTMLInputElement).value, 10);
                    if (isNaN(val) || val < 1 || val > 32) {
                        alert('Max concurrent tasks must be between 1 and 32.');
                        return;
                    }
                    settings.maxConcurrentTasks = val;
                    renderAdvancedSection(container, settings);
                }
            });
        });
    });

    // --- Danger Zone: Clear All Data ---
    document.getElementById('clearAppDataBtn')?.addEventListener('click', () => {
        import('../components/modal').then(({ showModal }) => {
            showModal({
                title: 'Clear All Application Data',
                content: `<div style='color:#b91c1c;font-weight:600;'>This action will permanently delete all application data. This cannot be undone.<br><br>Are you sure you want to proceed?</div>`,
                onConfirm: () => {
                    // Clear all app data (production logic)
                    if (typeof window !== 'undefined') {
                        if (window.localStorage) window.localStorage.clear();
                        if (window.sessionStorage) window.sessionStorage.clear();
                        // Optionally, reset settings object
                        Object.keys(settings).forEach(k => { delete settings[k]; });
                        // Optionally reload
                        window.location.reload();
                    }
                }
            });
        });
    });
}

