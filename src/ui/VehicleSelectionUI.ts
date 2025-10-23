/**
 * 车辆选择UI
 * 游戏开始前的车辆选择界面
 */

import type { VehicleManager } from '../core/VehicleManager';
import type { VehicleConfig, VehicleLoadState } from '../core/VehicleConfig';

export interface VehicleSelectionCallbacks {
  onVehicleSelected: (vehicleId: string) => void;
  onStartGame: () => void;
  onClose?: () => void;
}

export class VehicleSelectionUI {
  private container: HTMLElement;
  private vehicleManager: VehicleManager;
  private callbacks: VehicleSelectionCallbacks;
  private currentCategory: string = 'all';
  private selectedVehicleId: string | null = null;

  constructor(
    vehicleManager: VehicleManager,
    callbacks: VehicleSelectionCallbacks
) {
    this.vehicleManager = vehicleManager;
    this.callbacks = callbacks;
    this.container = this.createUI();
  }

  /**
   * 创建UI容器
   */
  private createUI(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'vehicle-selection-modal';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      z-index: 1000;
      font-family: Arial, sans-serif;
   color: white;
      overflow: hidden;
    `;

    // 标题栏
    const header = this.createHeader();
    container.appendChild(header);

    // 类别筛选
    const categoryFilter = this.createCategoryFilter();
    container.appendChild(categoryFilter);

    // 车辆网格
    const vehicleGrid = this.createVehicleGrid();
    container.appendChild(vehicleGrid);

    // 详情面板
    const detailsPanel = this.createDetailsPanel();
    container.appendChild(detailsPanel);

    // 底部按钮
    const footer = this.createFooter();
    container.appendChild(footer);

    return container;
  }

  /**
   * 创建标题栏
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px;
      text-align: center;
      background: linear-gradient(180deg, rgba(30,30,30,1) 0%, rgba(20,20,20,0.8) 100%);
      border-bottom: 2px solid #ff6b35;
    `;

    const title = document.createElement('h1');
    title.textContent = 'Select Your Vehicle';
    title.style.cssText = `
      margin: 0;
      font-size: 36px;
      font-weight: bold;
      color: #ff6b35;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  `;

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Choose your ride and hit the road!';
    subtitle.style.cssText = `
      margin: 10px 0 0 0;
      font-size: 16px;
      color: #ccc;
    `;

    header.appendChild(title);
    header.appendChild(subtitle);

    // 关闭按钮
  if (this.callbacks.onClose) {
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '?';
      closeBtn.style.cssText = `
   position: absolute;
        top: 20px;
    right: 20px;
        background: rgba(255,255,255,0.1);
 border: none;
        color: white;
        font-size: 24px;
      width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.3s;
      `;
      closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255,107,53,0.8)';
      closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(255,255,255,0.1)';
      closeBtn.onclick = () => this.callbacks.onClose?.();
      header.appendChild(closeBtn);
    }

    return header;
  }

  /**
   * 创建类别筛选器
   */
  private createCategoryFilter(): HTMLElement {
    const filter = document.createElement('div');
 filter.id = 'category-filter';
    filter.style.cssText = `
      display: flex;
      gap: 10px;
      padding: 20px;
      overflow-x: auto;
      background: rgba(20,20,20,0.6);
      border-bottom: 1px solid #333;
    `;

    const categories = [
      { id: 'all', name: 'All Vehicles', nameZh: '所有车辆' },
      ...Object.entries(this.vehicleManager.getAllCategories()).map(([id, info]) => ({
        id,
        name: info.name,
        nameZh: info.nameZh || info.name
      }))
    ];

    categories.forEach(cat => {
 const btn = document.createElement('button');
      btn.textContent = cat.name;
   btn.dataset.category = cat.id;
      btn.style.cssText = `
        padding: 10px 20px;
        background: ${cat.id === 'all' ? '#ff6b35' : 'rgba(255,255,255,0.1)'};
        border: 2px solid ${cat.id === 'all' ? '#ff6b35' : '#666'};
  color: white;
  border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
     font-weight: bold;
   white-space: nowrap;
        transition: all 0.3s;
      `;

      btn.onclick = () => this.filterByCategory(cat.id);
      filter.appendChild(btn);
    });

    return filter;
  }

  /**
   * 创建车辆网格
   */
  private createVehicleGrid(): HTMLElement {
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    `;

    const grid = document.createElement('div');
    grid.id = 'vehicle-grid';
    grid.style.cssText = `
      display: grid;
 grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
    `;

    this.populateVehicleGrid(grid);
    gridContainer.appendChild(grid);

return gridContainer;
  }

  /**
   * 填充车辆卡片
 */
  private populateVehicleGrid(grid: HTMLElement): void {
    const vehicles = this.currentCategory === 'all' 
      ? this.vehicleManager.getAllVehicles()
   : this.vehicleManager.getVehiclesByCategory(this.currentCategory);

    grid.innerHTML = '';

    vehicles.forEach(vehicleState => {
      const card = this.createVehicleCard(vehicleState);
      grid.appendChild(card);
  });
  }

  /**
   * 创建车辆卡片
   */
  private createVehicleCard(vehicleState: VehicleLoadState): HTMLElement {
    const { config, isUnlocked } = vehicleState;
const card = document.createElement('div');
    card.className = 'vehicle-card';
    card.dataset.vehicleId = config.id;
    
    const isSelected = this.selectedVehicleId === config.id;
    
    card.style.cssText = `
      background: ${isSelected ? 'rgba(255,107,53,0.2)' : 'rgba(30,30,30,0.8)'};
      border: 2px solid ${isSelected ? '#ff6b35' : '#444'};
      border-radius: 10px;
      padding: 15px;
      cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
      transition: all 0.3s;
      position: relative;
      opacity: ${isUnlocked ? 1 : 0.5};
    `;

    // 缩略图
    const thumbnail = document.createElement('div');
    thumbnail.style.cssText = `
 width: 100%;
  height: 150px;
   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      margin-bottom: 10px;
 display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 48px;
    background-image: url('${config.thumbnailPath || ''}');
      background-size: cover;
      background-position: center;
    `;
    if (!config.thumbnailPath) {
      thumbnail.textContent = '??';
    }

    // 锁定标记
    if (!isUnlocked) {
      const lockIcon = document.createElement('div');
      lockIcon.textContent = '??';
      lockIcon.style.cssText = `
        position: absolute;
  top: 10px;
        right: 10px;
      font-size: 24px;
        background: rgba(0,0,0,0.7);
  padding: 5px 10px;
        border-radius: 5px;
      `;
      thumbnail.appendChild(lockIcon);
    }

    card.appendChild(thumbnail);

    // 名称
    const name = document.createElement('h3');
    name.textContent = config.displayName;
    name.style.cssText = `
      margin: 0 0 5px 0;
 font-size: 18px;
   color: #ff6b35;
    `;
    card.appendChild(name);

    // 类别
    const category = document.createElement('p');
    category.textContent = config.category.toUpperCase();
    category.style.cssText = `
      margin: 0 0 10px 0;
    font-size: 12px;
      color: #999;
      text-transform: uppercase;
    `;
    card.appendChild(category);

    // 统计条
    if (config.stats) {
 const stats = this.createStatsBar(config.stats);
 card.appendChild(stats);
  }

    // 事件处理
    if (isUnlocked) {
      card.onmouseenter = () => {
        if (!isSelected) {
          card.style.borderColor = '#ff6b35';
          card.style.background = 'rgba(255,107,53,0.1)';
        }
      };
      card.onmouseleave = () => {
      if (!isSelected) {
 card.style.borderColor = '#444';
          card.style.background = 'rgba(30,30,30,0.8)';
    }
      };
    card.onclick = () => this.selectVehicle(config.id);
    }

return card;
  }

  /**
   * 创建统计条
   */
  private createStatsBar(stats: any): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      gap: 5px;
      margin-top: 10px;
    `;

 const statLabels = [
      { key: 'acceleration', icon: '?', color: '#ff6b35' },
      { key: 'topSpeed', icon: '??', color: '#4ecdc4' },
  { key: 'handling', icon: '??', color: '#ffe66d' },
      { key: 'braking', icon: '??', color: '#ff6b6b' }
    ];

    statLabels.forEach(stat => {
      const value = stats[stat.key] || 0;
      const bar = document.createElement('div');
      bar.style.cssText = `
        flex: 1;
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        overflow: hidden;
        position: relative;
      `;

 const fill = document.createElement('div');
      fill.style.cssText = `
        height: 100%;
        width: ${value}%;
        background: ${stat.color};
        transition: width 0.3s;
      `;
      bar.appendChild(fill);
      container.appendChild(bar);
    });

return container;
  }

  /**
   * 创建详情面板
   */
  private createDetailsPanel(): HTMLElement {
    const panel = document.createElement('div');
 panel.id = 'vehicle-details';
    panel.style.cssText = `
      padding: 20px;
      background: rgba(20,20,20,0.9);
      border-top: 2px solid #ff6b35;
      max-height: 200px;
      overflow-y: auto;
  `;

    panel.innerHTML = `
      <p style="color: #999; text-align: center;">Select a vehicle to see details</p>
    `;

    return panel;
  }

  /**
   * 创建底部按钮
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 20px;
      display: flex;
      gap: 20px;
justify-content: center;
      background: rgba(20,20,20,0.8);
      border-top: 1px solid #333;
    `;

    const startBtn = document.createElement('button');
    startBtn.id = 'start-game-btn';
    startBtn.textContent = 'Start Game';
    startBtn.disabled = true;
    startBtn.style.cssText = `
 padding: 15px 40px;
      background: #666;
      border: none;
      color: white;
      border-radius: 5px;
      cursor: not-allowed;
      font-size: 18px;
 font-weight: bold;
   transition: all 0.3s;
    `;
    startBtn.onclick = () => {
      if (this.selectedVehicleId) {
        this.callbacks.onStartGame();
      }
    };

    footer.appendChild(startBtn);

  return footer;
  }

  /**
   * 筛选类别
   */
  private filterByCategory(category: string): void {
    this.currentCategory = category;

    // 更新按钮样式
    const buttons = this.container.querySelectorAll('#category-filter button');
    buttons.forEach(btn => {
      const isActive = (btn as HTMLElement).dataset.category === category;
      (btn as HTMLElement).style.background = isActive ? '#ff6b35' : 'rgba(255,255,255,0.1)';
  (btn as HTMLElement).style.borderColor = isActive ? '#ff6b35' : '#666';
    });

    // 重新填充网格
    const grid = this.container.querySelector('#vehicle-grid') as HTMLElement;
    if (grid) {
      this.populateVehicleGrid(grid);
    }
  }

  /**
   * 选择车辆
   */
  private selectVehicle(vehicleId: string): void {
    const success = this.vehicleManager.selectVehicle(vehicleId);
  
    if (!success) return;

    this.selectedVehicleId = vehicleId;

    // 更新卡片样式
    const cards = this.container.querySelectorAll('.vehicle-card');
    cards.forEach(card => {
      const isSelected = (card as HTMLElement).dataset.vehicleId === vehicleId;
      (card as HTMLElement).style.background = isSelected 
  ? 'rgba(255,107,53,0.2)' 
        : 'rgba(30,30,30,0.8)';
      (card as HTMLElement).style.borderColor = isSelected ? '#ff6b35' : '#444';
    });

    // 更新详情面板
    this.updateDetailsPanel(vehicleId);

    // 启用开始按钮
  const startBtn = this.container.querySelector('#start-game-btn') as HTMLButtonElement;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.style.background = '#ff6b35';
      startBtn.style.cursor = 'pointer';
      startBtn.onmouseenter = () => startBtn.style.background = '#ff8555';
      startBtn.onmouseleave = () => startBtn.style.background = '#ff6b35';
    }

    // 通知回调
    this.callbacks.onVehicleSelected(vehicleId);
  }

  /**
   * 更新详情面板
   */
  private updateDetailsPanel(vehicleId: string): void {
    const config = this.vehicleManager.getVehicleConfig(vehicleId);
    if (!config) return;

    const panel = this.container.querySelector('#vehicle-details') as HTMLElement;
    if (!panel) return;

    panel.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="color: #ff6b35; margin: 0 0 10px 0;">${config.displayName}</h2>
        <p style="color: #ccc; margin: 0 0 15px 0;">${config.description || ''}</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div>
     <strong style="color: #ff6b35;">? Acceleration:</strong>
      <span style="color: white;"> ${config.stats?.acceleration || 'N/A'}/100</span>
          </div>
          <div>
       <strong style="color: #4ecdc4;">?? Top Speed:</strong>
  <span style="color: white;"> ${config.acceleration.maxSpeed} m/s</span>
  </div>
     <div>
       <strong style="color: #ffe66d;">?? Handling:</strong>
            <span style="color: white;"> ${config.stats?.handling || 'N/A'}/100</span>
       </div>
          <div>
      <strong style="color: #ff6b6b;">?? Braking:</strong>
      <span style="color: white;"> ${config.stats?.braking || 'N/A'}/100</span>
        </div>
      <div>
<strong style="color: #95e1d3;">?? Mass:</strong>
            <span style="color: white;"> ${config.physics.mass} kg</span>
</div>
          <div>
      <strong style="color: #f38181;">?? Category:</strong>
            <span style="color: white;"> ${config.category.toUpperCase()}</span>
   </div>
     </div>
      </div>
    `;
}

  /**
   * 显示UI
   */
  show(): void {
    document.body.appendChild(this.container);
  }

  /**
   * 隐藏UI
   */
  hide(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }

  /**
   * 销毁UI
   */
  destroy(): void {
    this.hide();
  }
}
