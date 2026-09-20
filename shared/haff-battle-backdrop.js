/* Optional scenery only: no combat state, input, timers or save access. */
(() => {
  'use strict';
  const key = 'haff-dam-battle-backdrop-v1';
  const scriptBase = document.currentScript?.src || document.baseURI || location.href;
  const source = new URL('../assets/haff-war/haff-dam-battle-backdrop-v1.png', scriptBase).href;
  let pending;
  let readyImage = null;
  function load() {
    if (!pending) pending = new Promise(resolve => {
      const image = new Image();
      image.onload = () => { readyImage = image; resolve(image); };
      image.onerror = () => resolve(null);
      image.src = source;
    });
    return pending;
  }
  function draw(scene, board, width, height) {
    if (!(width > 0 && height > 0)) return;
    // The slot precedes the existing grid and figures, even if loading is delayed.
    const slot = scene.add.container(0, 0);
    board.add(slot);
    function paint(image) {
      // layout() destroys its old board children; never paint into a stale slot.
      if (!image || !slot.scene || !scene.sys || !scene.sys.game) return;
      if (!scene.textures.exists(key)) scene.textures.addImage(key, image);
      // Use the upper scenery only: keep the foreground soldiers out of combat.
      const sceneryHeight = image.naturalHeight * .44;
      const scale = Math.max(width / image.naturalWidth, height / sceneryHeight);
      const cropWidth = width / scale, cropHeight = height / scale;
      const cropX = (image.naturalWidth - cropWidth) / 2;
      const cropY = (sceneryHeight - cropHeight) / 2;
      const art = scene.add.image(-cropX * scale, -cropY * scale, key);
      art.setOrigin(0).setScale(scale).setCrop(cropX, cropY, cropWidth, cropHeight);
      slot.add(art);
      // Calm the pavement behind labels without dimming units or their effects.
      slot.add(scene.add.rectangle(width / 2, height / 2, width, height, 0x08130e, .23));
      slot.add(scene.add.rectangle(width / 2, 23, width, 46, 0x08130e, .44));
      slot.add(scene.add.rectangle(width / 2, height * .54 + 10, width, 32, 0x08130e, .34));
    }
    // Resize/layout may happen inside Phaser's frame. A resolved Promise still
    // waits until after that frame, exposing the flat board for one render.
    if (readyImage) paint(readyImage);
    else load().then(paint);
  }
  window.HaffBattleBackdrop = Object.freeze({ draw });
})();
