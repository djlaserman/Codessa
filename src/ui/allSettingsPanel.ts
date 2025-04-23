/**
 * Unified Settings Panel Entrypoint
 * ----------------------------------------------------
 * This file is the SINGLE source of truth for rendering
 * the entire Codessa settings UI. It imports and orchestrates
 * all modular settings section renderers, ensuring a cohesive
 * and maintainable settings experience.
 *
 * To add or modify settings UI, update this file and the relevant
 * section renderer in ./settings/sections/.
 *
 * There is NO legacy or compatibility code here—this is the main
 * entrypoint for all settings logic and rendering.
 */

// ----- Section Imports -----
import { renderAgentsSection } from './settings/sections/agentsSection';
import { renderWorkflowsSection } from './settings/sections/workflowsSection';
import { renderMemorySection } from './settings/sections/memorySection';
import { renderMemorySettingsSection } from './settings/sections/memorySettingsSection';
import { renderUIThemeSection } from './settings/sections/uiThemeSection';
import { renderGeneralSection } from './settings/sections/generalSection';
import { renderAdvancedSection } from './settings/sections/advancedSection';
import { renderPromptsSection } from './settings/sections/promptsSection';
import { renderKnowledgebaseSection } from './settings/sections/knowledgebaseSection';
import { renderWorkspaceSection } from './settings/sections/workspaceSection';
import { renderTTSSection } from './settings/sections/ttsSection';

// ----- Settings Source -----
// Uses VS Code API or global window settings
const settings = (window as any).settings || {};

// ----- Unified Panel Renderer -----
export function renderAllSettingsPanel(root: HTMLElement) {
    root.innerHTML = `
        <div class="settings-panel">
            <h1>Settings</h1>
            <div class="settings-tabs">
                <button class="settings-tab" data-tab="general">General</button>
                <button class="settings-tab" data-tab="ui-theme">UI Theme</button>
                <button class="settings-tab" data-tab="agents">Agents</button>
                <button class="settings-tab" data-tab="workflows">Workflows</button>
                <button class="settings-tab" data-tab="memory">Memory</button>
                <button class="settings-tab" data-tab="memory-settings">Memory Settings</button>
                <button class="settings-tab" data-tab="prompts">Prompts</button>
                <button class="settings-tab" data-tab="knowledgebase">Knowledgebase</button>
                <button class="settings-tab" data-tab="workspace">Workspace</button>
                <button class="settings-tab" data-tab="tts">TTS</button>
                <button class="settings-tab" data-tab="advanced">Advanced</button>
            </div>
            <div class="settings-tab-content" id="tab-general"></div>
            <div class="settings-tab-content" id="tab-ui-theme" style="display:none"></div>
            <div class="settings-tab-content" id="tab-agents" style="display:none"></div>
            <div class="settings-tab-content" id="tab-workflows" style="display:none"></div>
            <div class="settings-tab-content" id="tab-memory" style="display:none"></div>
            <div class="settings-tab-content" id="tab-memory-settings" style="display:none"></div>
            <div class="settings-tab-content" id="tab-prompts" style="display:none"></div>
            <div class="settings-tab-content" id="tab-knowledgebase" style="display:none"></div>
            <div class="settings-tab-content" id="tab-workspace" style="display:none"></div>
            <div class="settings-tab-content" id="tab-tts" style="display:none"></div>
            <div class="settings-tab-content" id="tab-advanced" style="display:none"></div>
        </div>
    `;
    // Render each section into its tab content pane
    renderGeneralSection(document.getElementById('tab-general')!, settings);
    renderUIThemeSection(document.getElementById('tab-ui-theme')!, settings);
    renderAgentsSection(document.getElementById('tab-agents')!, settings);
    renderWorkflowsSection(document.getElementById('tab-workflows')!, settings);
    renderMemorySection(document.getElementById('tab-memory')!, settings);
    renderMemorySettingsSection(document.getElementById('tab-memory-settings')!, settings);
    renderPromptsSection(document.getElementById('tab-prompts')!, settings);
    renderKnowledgebaseSection(document.getElementById('tab-knowledgebase')!, settings);
    renderWorkspaceSection(document.getElementById('tab-workspace')!, settings);
    renderTTSSection(document.getElementById('tab-tts')!, settings);
    renderAdvancedSection(document.getElementById('tab-advanced')!, settings);

    // Tab switching logic
    const tabButtons = Array.from(document.querySelectorAll('.settings-tab')) as HTMLButtonElement[];
    const tabContents = Array.from(document.querySelectorAll('.settings-tab-content')) as HTMLElement[];
    tabButtons.forEach(btn => {
        btn.onclick = () => {
            const selected = btn.getAttribute('data-tab');
            tabButtons.forEach(b => b.classList.toggle('active', b === btn));
            tabContents.forEach(tc => tc.style.display = tc.id === 'tab-' + selected ? '' : 'none');
        };
    });
    // Set first tab as active
    tabButtons[0].classList.add('active');
    tabContents[0].style.display = '';

}

// ----- Auto-render for Browser Contexts -----
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('codessa-settings-root') || document.body;
        renderAllSettingsPanel(root);
    });
}
