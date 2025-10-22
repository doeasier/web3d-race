# PR-7: Post-Physics Sync for InstanceRenderer (RoadManager)

Summary
-------
This PR adds a deterministic post-physics synchronization point to ensure instance updates from `RoadsideSpawner` are applied to the `InstanceRenderer` only after the physics simulation step has completed. This reduces race conditions between physics and rendering, prevents visual mismatches, and provides a clear extension point for GPU culler results to be applied safely.

What changed
------------
- `src/world/RoadManager.ts`
 - `update()` now only collects descriptors from `RoadsideSpawner` and writes grouped instance lists into an internal buffer (`_plannedInstanceGroups`).
 - New method `postPhysicsSync()` which must be called after the physics step. This method:
 - Optionally triggers GPU culling (async) per-group via `GpuCuller.cullAsync()` and applies visibility sets via `InstanceRenderer.setGPUVisibility()`.
 - Calls `InstanceRenderer.setInstances(type, descs)` for each type and then `InstanceRenderer.update(camera)` to apply CPU frustum culling and upload instanceMatrix updates.
 - Clears the planned group buffer after application.

- `src/main.ts`
 - Calls `roadManager.postPhysicsSync()` in the main loop immediately after `physicsWorld.step(dt)`/vehicle `postPhysicsSync` (if present).

- `tests/__tests__/road_manager_instanceRenderer.test.ts`
 - Updated to call `postPhysicsSync()` after `update()` to reflect the new lifecycle.

Rationale
---------
- Prior to this change, `RoadManager.update()` directly invoked the `InstanceRenderer` which could cause instances to be updated while physics bodies were still being stepped or mutated, causing visual/physics inconsistencies and race conditions.
- Moving renderer application to `postPhysicsSync()` ensures consistent ordering: physics.step -> physics post-sync -> roadManager.postPhysicsSync -> instance update -> render.

Compatibility
-------------
- Backwards-compatible: If no `postPhysicsSync()` call is made, behavior is unchanged aside from `update()` no longer immediately mutating the `InstanceRenderer` (so rendering may lag until `postPhysicsSync()` is invoked). Call sites (main loop) should be updated to call `postPhysicsSync()` after physics step.

Testing
-------
- Unit tests updated: `tests/__tests__/road_manager_instanceRenderer.test.ts` now verifies that `setInstances` is called after `postPhysicsSync()`.
- Ran full test suite ¡ª all tests pass locally.

Notes / follow-ups
------------------
- Consider double-buffering `_plannedInstanceGroups` if `postPhysicsSync()` can be invoked concurrently in your runtime.
- Consider adding explicit ordering tests across different physics backends (Fake vs Rapier) to catch backend-specific timing.

Requested review
----------------
- Verify placement of `postPhysicsSync()` call in `src/main.ts` matches your engine loop ordering.
- Check GPU culler integration points (`GpuCuller.cullAsync`) for any environment-specific fallbacks.
