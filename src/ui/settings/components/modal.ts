// Reusable modal component for settings panel
export function showModal(options: { title: string; content: string; onConfirm: () => void; onCancel?: () => void; }) {
    // Remove any existing modal
    const prev = document.getElementById('settings-global-modal');
    if (prev) prev.remove();

    // Modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'settings-global-modal';
    overlay.tabIndex = -1;
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.32)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    // Modal dialog
    const modal = document.createElement('div');
    modal.className = 'settings-modal-dialog';
    modal.style.background = '#fff';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)';
    modal.style.padding = '32px 28px 22px 28px';
    modal.style.minWidth = '340px';
    modal.style.maxWidth = '98vw';
    modal.style.maxHeight = '90vh';
    modal.style.overflowY = 'auto';
    modal.style.position = 'relative';

    // Modal header
    const header = document.createElement('div');
    header.style.fontSize = '1.3em';
    header.style.fontWeight = '600';
    header.style.marginBottom = '18px';
    header.textContent = options.title;
    modal.appendChild(header);

    // Modal content
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = options.content;
    contentDiv.style.marginBottom = '18px';
    modal.appendChild(contentDiv);

    // Button row
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '12px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'modal-btn-cancel';
    cancelBtn.style.background = '#e5e7eb';
    cancelBtn.style.color = '#333';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '5px';
    cancelBtn.style.padding = '7px 20px';
    cancelBtn.style.fontSize = '1em';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.onclick = () => {
        overlay.remove();
        if (options.onCancel) options.onCancel();
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Save';
    confirmBtn.className = 'modal-btn-confirm';
    confirmBtn.style.background = '#2563eb';
    confirmBtn.style.color = '#fff';
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '5px';
    confirmBtn.style.padding = '7px 20px';
    confirmBtn.style.fontSize = '1em';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.onclick = () => {
        overlay.remove();
        options.onConfirm();
    };

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    modal.appendChild(btnRow);

    // Close on overlay click (but not modal click)
    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (options.onCancel) options.onCancel();
        }
    });

    // Close on Escape key
    overlay.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Escape') {
            overlay.remove();
            if (options.onCancel) options.onCancel();
        }
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    overlay.focus();
}

