(() => {
  const status = document.getElementById("station-copy-status");
  if (!status) return;

  function selectNickname(target) {
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    button.hidden = false;
    button.addEventListener("click", async () => {
      const nickname = target.textContent.trim();
      let copied = false;
      button.disabled = true;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(nickname);
          copied = true;
        }
      } catch {
        // Local file previews may deny the Clipboard API.
      }
      if (!copied) {
        try {
          if (selectNickname(target)) copied = document.execCommand("copy");
        } catch {
          copied = false;
        }
        if (copied) window.getSelection()?.removeAllRanges();
      }
      button.disabled = false;
      status.textContent = copied
        ? `已复制「${nickname}」，去对应平台找站长吧～`
        : `未能自动复制，请长按或选中昵称「${nickname}」手动复制。`;
      if (copied) button.focus({ preventScroll: true });
    });
  });
})();
