declare module 'three' {
  const THREE: any;
  export = THREE;
}

declare module 'three/examples/jsm/loaders/GLTFLoader' {
  const GLTFLoader: any;
  export { GLTFLoader };
}

declare module '@dimforge/rapier3d-compat' {
  const RAPIER: any;
  export = RAPIER;
}
