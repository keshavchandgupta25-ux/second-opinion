(function () {
  function start() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas || typeof THREE === "undefined") {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 18;

    const count = 140;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x7ee0ff,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
    });
    scene.add(new THREE.Points(geometry, material));

    function resize() {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }

    function tick(time) {
      scene.rotation.y = time * 0.00004;
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
