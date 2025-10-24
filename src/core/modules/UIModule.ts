/**
 * UI系统模块 - 管理所有UI元素和交互
 */
import { InitModule } from '../InitializationManager';

export interface UICallbacks {
  onStart?: () => void;
  onPause?: () => void;
  onPrevLevel?: () => void;
  onNextLevel?: () => void;
  onModeChange?: (mode: string) => void;
  onPhysicsChange?: (backend: string) => void;
  onTrackChange?: (trackFile: string) => void;
  onExportTextures?: () => void;
  onChangeVehicle?: () => void;
}

export class UIModule implements InitModule {
  name = 'ui';
  phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';

  // HUD元素
  hud!: HTMLDivElement;
  
  // 控制面板
  ui!: HTMLDivElement;
  
  // 按钮
  startBtn!: HTMLButtonElement;
  pauseBtn!: HTMLButtonElement;
  prevLevelBtn!: HTMLButtonElement;
  nextLevelBtn!: HTMLButtonElement;
  exportTexturesBtn!: HTMLButtonElement;
  changeVehicleBtn!: HTMLButtonElement;

  // 选择器
  modeSelect!: HTMLSelectElement;
  physSelect!: HTMLSelectElement;
  trackSelect!: HTMLSelectElement;

  // 状态显示
  loadStatus!: HTMLDivElement;
  physStatus!: HTMLDivElement;
  webgpuStatus!: HTMLDivElement;
  bankLabel!: HTMLDivElement;

  // 警告容器
  warningsContainer!: HTMLDivElement;

  // 模态框
  modalOverlay!: HTMLDivElement;
  modalContent!: HTMLDivElement;
  webgpuModal!: HTMLDivElement;
  webgpuContent!: HTMLPreElement;

  private callbacks: UICallbacks = {};

  constructor(callbacks: UICallbacks = {}) {
    this.callbacks = callbacks;
  }

  async init(): Promise<void> {
    this.createHUD();
    this.createControlPanel();
this.createModals();
 this.wireCallbacks();

    console.log('UIModule: initialized');
  }

  private createHUD(): void {
    this.hud = document.createElement('div');
    this.hud.style.position = 'absolute';
    this.hud.style.left = '10px';
    this.hud.style.top = '10px';
    this.hud.style.color = 'white';
    this.hud.style.background = 'rgba(0,0,0,0.3)';
    this.hud.style.padding = '8px';
    this.hud.innerHTML = 'Speed: 0.0 m/s';
    document.body.appendChild(this.hud);
  }

  private createControlPanel(): void {
    this.ui = document.createElement('div');
    this.ui.style.position = 'absolute';
    this.ui.style.right = '10px';
    this.ui.style.top = '10px';
    this.ui.style.color = 'white';
    this.ui.style.background = 'rgba(0,0,0,0.3)';
    this.ui.style.padding = '8px';

    // 按钮
    this.startBtn = this.createButton('Start');
    this.pauseBtn = this.createButton('Pause');
    this.prevLevelBtn = this.createButton('Prev Level');
    this.nextLevelBtn = this.createButton('Next Level');
    this.exportTexturesBtn = this.createButton('Export Textures');
    this.changeVehicleBtn = this.createButton('Change Vehicle');
    this.changeVehicleBtn.style.backgroundColor = '#ff6b35';
    this.changeVehicleBtn.style.color = 'white';
    this.changeVehicleBtn.style.fontWeight = 'bold';
    this.changeVehicleBtn.style.marginTop = '8px';
    this.changeVehicleBtn.style.cursor = 'pointer';

    // 模式选择
    this.modeSelect = document.createElement('select');
    this.addOption(this.modeSelect, 'fast', 'Fast');
 this.addOption(this.modeSelect, 'precise', 'Precise');

    // 物理后端选择
    const physLabel = this.createLabel('Physics backend:');
    this.physSelect = document.createElement('select');
    this.addOption(this.physSelect, 'rapier', 'RapierPhysicsWorld');
    this.addOption(this.physSelect, 'fake', 'FakePhysicsWorld');
    this.physSelect.value = 'rapier';

// 物理状态
    this.physStatus = document.createElement('div');
    this.physStatus.style.marginTop = '6px';
  this.physStatus.style.fontSize = '12px';
    this.physStatus.style.opacity = '0.9';
    this.physStatus.textContent = 'Physics: initializing...';

    // WebGPU状态
    this.webgpuStatus = document.createElement('div');
    this.webgpuStatus.style.marginTop = '6px';
    this.webgpuStatus.style.fontSize = '12px';
    this.webgpuStatus.style.opacity = '0.95';
    this.webgpuStatus.textContent = 'WebGPU: checking...';

const webgpuDetailsBtn = this.createButton('WebGPU details');
    webgpuDetailsBtn.style.marginLeft = '6px';

    // Track选择
    const trackLabel = this.createLabel('Track:');
this.trackSelect = document.createElement('select');
    this.trackSelect.id = 'trackSelect';

    this.bankLabel = document.createElement('div');
    this.bankLabel.style.fontSize = '12px';
    this.bankLabel.style.marginTop = '4px';
    this.bankLabel.textContent = 'Avg bank: 0°';

    // 加载状态
    this.loadStatus = document.createElement('div');
    this.loadStatus.style.marginTop = '8px';
    this.loadStatus.style.fontSize = '12px';
    this.loadStatus.style.color = 'white';
    this.loadStatus.textContent = 'Level: idle';

    // 警告容器
  this.warningsContainer = document.createElement('div');
    this.warningsContainer.style.marginTop = '6px';
    this.warningsContainer.style.fontSize = '12px';
    this.warningsContainer.style.color = '#ffd966';
  this.warningsContainer.style.maxWidth = '320px';
    this.warningsContainer.style.overflowY = 'auto';
    this.warningsContainer.style.maxHeight = '200px';

    const showDetailsBtn = this.createButton('Show details');
    showDetailsBtn.style.marginLeft = '8px';

    // 组装UI
    this.ui.appendChild(this.startBtn);
    this.ui.appendChild(this.pauseBtn);
    this.ui.appendChild(this.changeVehicleBtn);
    this.ui.appendChild(this.prevLevelBtn);
    this.ui.appendChild(this.nextLevelBtn);
    this.ui.appendChild(this.modeSelect);
    this.ui.appendChild(this.exportTexturesBtn);
    this.ui.appendChild(this.loadStatus);
    this.ui.appendChild(this.warningsContainer);
    this.ui.appendChild(showDetailsBtn);
    this.ui.appendChild(physLabel);
    this.ui.appendChild(this.physSelect);
    this.ui.appendChild(this.physStatus);
    this.ui.appendChild(this.webgpuStatus);
    this.ui.appendChild(webgpuDetailsBtn);
    this.ui.appendChild(trackLabel);
    this.ui.appendChild(this.trackSelect);
    this.ui.appendChild(this.bankLabel);

    document.body.appendChild(this.ui);
  }

  private createModals(): void {
    // 警告模态框
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.style.position = 'fixed';
    this.modalOverlay.style.left = '0';
    this.modalOverlay.style.top = '0';
    this.modalOverlay.style.width = '100%';
    this.modalOverlay.style.height = '100%';
    this.modalOverlay.style.background = 'rgba(0,0,0,0.6)';
    this.modalOverlay.style.display = 'none';
    this.modalOverlay.style.alignItems = 'center';
    this.modalOverlay.style.justifyContent = 'center';
    this.modalOverlay.style.zIndex = '9999';

    const modalPanel = document.createElement('div');
    modalPanel.style.background = '#222';
    modalPanel.style.color = 'white';
    modalPanel.style.padding = '16px';
    modalPanel.style.borderRadius = '8px';
    modalPanel.style.maxWidth = '720px';
    modalPanel.style.maxHeight = '70%';
 modalPanel.style.overflowY = 'auto';

    const modalTitle = document.createElement('div');
    modalTitle.style.fontWeight = 'bold';
 modalTitle.style.marginBottom = '8px';
    modalTitle.textContent = 'Level load details';

    this.modalContent = document.createElement('div');
this.modalContent.style.fontSize = '13px';
    this.modalContent.style.lineHeight = '1.4';

    const modalControls = document.createElement('div');
    modalControls.style.marginTop = '12px';
    modalControls.style.textAlign = 'right';

    const clearWarningsBtn = this.createButton('Clear warnings');
    clearWarningsBtn.style.marginRight = '8px';

    const closeModalBtn = this.createButton('Close');

modalControls.appendChild(clearWarningsBtn);
    modalControls.appendChild(closeModalBtn);
    modalPanel.appendChild(modalTitle);
    modalPanel.appendChild(this.modalContent);
    modalPanel.appendChild(modalControls);
    this.modalOverlay.appendChild(modalPanel);
    document.body.appendChild(this.modalOverlay);

    // WebGPU模态框
    this.webgpuModal = document.createElement('div');
    this.webgpuModal.style.position = 'fixed';
    this.webgpuModal.style.left = '0';
    this.webgpuModal.style.top = '0';
    this.webgpuModal.style.width = '100%';
    this.webgpuModal.style.height = '100%';
    this.webgpuModal.style.background = 'rgba(0,0,0,0.6)';
    this.webgpuModal.style.display = 'none';
    this.webgpuModal.style.alignItems = 'center';
    this.webgpuModal.style.justifyContent = 'center';
    this.webgpuModal.style.zIndex = '10000';

    const webgpuPanel = document.createElement('div');
    webgpuPanel.style.background = '#222';
    webgpuPanel.style.color = 'white';
    webgpuPanel.style.padding = '14px';
    webgpuPanel.style.borderRadius = '8px';
    webgpuPanel.style.maxWidth = '720px';
    webgpuPanel.style.maxHeight = '70%';
    webgpuPanel.style.overflowY = 'auto';

    const webgpuTitle = document.createElement('div');
    webgpuTitle.style.fontWeight = 'bold';
    webgpuTitle.style.marginBottom = '8px';
  webgpuTitle.textContent = 'WebGPU adapter details';

    this.webgpuContent = document.createElement('pre');
    this.webgpuContent.style.fontSize = '12px';
    this.webgpuContent.style.whiteSpace = 'pre-wrap';
    this.webgpuContent.style.maxWidth = '680px';

    const webgpuClose = this.createButton('Close');
 webgpuClose.style.marginTop = '8px';

    webgpuPanel.appendChild(webgpuTitle);
    webgpuPanel.appendChild(this.webgpuContent);
    webgpuPanel.appendChild(webgpuClose);
    this.webgpuModal.appendChild(webgpuPanel);
    document.body.appendChild(this.webgpuModal);
  }

  private wireCallbacks(): void {
    this.startBtn.onclick = () => this.callbacks.onStart?.();
    this.pauseBtn.onclick = () => this.callbacks.onPause?.();
    this.changeVehicleBtn.onclick = () => this.callbacks.onChangeVehicle?.();
    this.prevLevelBtn.onclick = () => this.callbacks.onPrevLevel?.();
    this.nextLevelBtn.onclick = () => this.callbacks.onNextLevel?.();
    this.exportTexturesBtn.onclick = () => this.callbacks.onExportTextures?.();
    
    this.modeSelect.onchange = () => this.callbacks.onModeChange?.(this.modeSelect.value);
    this.physSelect.onchange = () => this.callbacks.onPhysicsChange?.(this.physSelect.value);
    this.trackSelect.onchange = () => this.callbacks.onTrackChange?.(this.trackSelect.value);
  }

  // 辅助方法
  private createButton(text: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    return btn;
  }

  private createLabel(text: string): HTMLLabelElement {
    const label = document.createElement('label');
    label.style.display = 'block';
    label.style.marginTop = '8px';
    label.textContent = text;
    return label;
  }

  private addOption(select: HTMLSelectElement, value: string, text: string): void {
    const opt = document.createElement('option');
    opt.value = value;
    opt.text = text;
    select.appendChild(opt);
  }

  /**
   * 更新HUD显示
   */
  updateHUD(speed: number): void {
    this.hud.innerHTML = `Speed: ${speed.toFixed(2)} m/s`;
  }

  /**
   * 显示/隐藏警告模态框
   */
  showWarningsModal(show: boolean): void {
    this.modalOverlay.style.display = show ? 'flex' : 'none';
  }

  /**
   * 显示/隐藏WebGPU模态框
   */
  showWebGpuModal(show: boolean): void {
    this.webgpuModal.style.display = show ? 'flex' : 'none';
  }

  cleanup(): void {
    this.hud?.remove();
    this.ui?.remove();
    this.modalOverlay?.remove();
 this.webgpuModal?.remove();
  }
}
