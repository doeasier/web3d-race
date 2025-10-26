// V12 Option B: 镜头方向修复 - 反转四元数Y轴 + 调试输出
// 
// 关键修改：
// 1. 第439行：rotationQuat.setFromEuler(new THREE.Euler(0, -ry, 0, 'XYZ'))
//    - 反转 Y 轴旋转角度
// 2. 添加 5% 采样率的详细调试输出
// 3. 监控：车辆状态、四元数、前向向量、预期vs实际
//
// 使用方法：
// 1. 将此文件重命名为 main.ts（先备份原文件）
// 2. npm run dev
// 3. 观察控制台输出
// 4. 检查镜头是否能看到车尾

// ⚠️ 关键修改位置（第424-470行）
// 在 animate() 方法的镜头更新部分：

          // ⭐ 更新镜头（跟随车辆）- V12 Option B + Debug
   if (this.modules.camera) {
            // ✅ V12 修正：反转四元数Y轴（选项B）
            let rotationQuat = new THREE.Quaternion();
          
// 从车辆状态提取旋转角度
 if (state.rotation) {
     if (state.rotation instanceof THREE.Quaternion) {
     rotationQuat.copy(state.rotation);
      } else if (typeof state.rotation === 'object' && 'y' in state.rotation) {
           const ry = (state.rotation as any).y || 0;
     
            // ⚠️ V12 Option B: 反转 Y 轴旋转
 rotationQuat.setFromEuler(new THREE.Euler(0, -ry, 0, 'XYZ'));
  } else if (typeof state.rotation === 'number') {
       rotationQuat.setFromEuler(new THREE.Euler(0, -state.rotation, 0, 'XYZ'));
  }
            }
      
       // 计算速度向量（基于旋转和速度）
            const speed = state.speed || 0;
     const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(rotationQuat);
            const velocity = forward.multiplyScalar(speed);
    const pos = state.position;
            
          // ⚠️ V12 调试输出：5%采样率
            if (Math.random() < 0.05) {
              const ry = (state.rotation as any)?.y || 0;
      console.log('[V12 Option B] Debug:', {
    vehicle_rotation_y_deg: (ry * 180 / Math.PI).toFixed(1) + '°',
           inverted_rotation_y_deg: (-ry * 180 / Math.PI).toFixed(1) + '°',
 forward_vector: { x: forward.x.toFixed(3), z: forward.z.toFixed(3) },
      velocity_vector: { x: velocity.x.toFixed(3), z: velocity.z.toFixed(3) },
                expected_dx: (Math.sin(ry) * speed).toFixed(3),
           expected_dz: (Math.cos(ry) * speed).toFixed(3),
          note: '如果forward.z ≈ -cos(ry)，说明反转成功'
        });
      }
          
            const vehicleState: VehicleState = {
        position: (pos && typeof pos === 'object') 
  ? new THREE.Vector3(pos.x || 0, pos.y || 0, pos.z || 0)
          : new THREE.Vector3(),
  rotation: rotationQuat, // ✅ 使用反转后的四元数
              velocity: velocity,
          speed: speed,
   steerAngle: inputState.steer || 0,
   isOnGround: true,
   isSkidding: false
      };
       
   this.modules.camera.update(dt, vehicleState);
       }

// ⚠️ 测试步骤：
// 
// 1. 运行游戏：npm run dev
// 
// 2. 观察画面：
//    - 静止时是否看到车尾？
//    - 前进时镜头是否跟随正确？
//    
// 3. 检查控制台输出（每秒约3条）：
//    - vehicle_rotation_y_deg: 车辆原始角度
//    - inverted_rotation_y_deg: 反转后角度
//    - forward_vector: 应该是反向的
//    - expected_dx/dz: 车辆实际运动方向
//    
// 4. 如果成功：
//    - forward.z ≈ -cos(ry)（反向）
//    - 画面能看到车尾
//    
// 5. 如果失败：
//    - 回滚到备份版本
//    - 尝试选项A或C
