(function () {
  "use strict";
  const PREFIX = "delta-player-card:v1:";
  const definitions = [
    ["personality", "战术人格", "personality_test.html", "#resultDesc"],
    ["fortune", "每日运势", "daily_luck_draw.html", "#ticket"],
    ["map", "命定地图", "fate_wheel.html", "#mapLine"],
    ["operator", "命定干员", "fate_wheel.html", "#operatorLine"],
    ["style", "命定打法", "fate_wheel.html", "#styleLine"],
    ["budget", "出征战备", "budget_map_randomizer.html", "#story"],
    ["reaction", "反应评级", "reaction_speed_game.html", "#rankLine"],
    ["restart", "阿萨拉人生", "asala_restart_simulator.html", "#shareText"],
    ["grass", "草丛战绩", "grass_minesweeper.html", "#statusLine"],
    ["tile", "收纳战绩", "asala_tile_match.html", "#resultText"],
    ["parking", "停车场战绩", "parking_prep.html", null],
    ["odds", "爆率检测", "delta_force_wiki_home.html#drop-game", "#oddsLog"]
  ].map(([key, label, href, selector]) => ({ key, label, href, selector }));
  const candidates = new Map();
  const controls = new Map();
  const homeUrl = "delta_force_wiki_home.html#player-card";
  const traits = [["aggression", "激进"], ["greed", "贪婪"], ["stealth", "CS度"], ["teamwork", "团队"], ["tactics", "战术"], ["luxury", "豪"]];
  const clean = (value, max = 500) => String(value ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, max);
  const known = key => definitions.some(item => item.key === key);
  function day(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function normalize(value) {
    if (!value || typeof value !== "object" || !clean(value.title, 100).trim()) return null;
    const data = { title: clean(value.title, 100), lines: Array.isArray(value.lines) ? value.lines.slice(0, 8).map(line => clean(line)) : [], date: /^\d{4}-\d{2}-\d{2}$/.test(value.date) ? value.date : day() };
    if (value.scores && typeof value.scores === "object") data.scores = Object.fromEntries(traits.map(([key]) => [key, Math.max(0, Math.min(100, Number(value.scores[key]) || 0))]));
    return data;
  }
  function read(key) {
    if (!known(key)) return null;
    try { return normalize(JSON.parse(localStorage.getItem(PREFIX + key))); } catch (_) { return null; }
  }
  function snapshot() {
    return Object.fromEntries(definitions.map(({ key }) => [key, read(key)]));
  }
  function write(key, data) {
    const result = normalize(data);
    if (!known(key) || !result) throw new Error("先完成这一项，再保存结果。");
    localStorage.setItem(PREFIX + key, JSON.stringify(result));
    window.dispatchEvent(new Event("player-card-change"));
    return result;
  }
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function refreshControl(key) {
    const control = controls.get(key);
    if (!control) return;
    const candidate = candidates.get(key);
    const saved = read(key);
    const same = candidate && JSON.stringify(candidate) === JSON.stringify(saved);
    control.button.disabled = !candidate || same;
    control.button.textContent = same ? "已保存到身份卡 ✓" : saved ? "用这次结果替换" : "保存到身份卡";
    control.status.textContent = candidate ? same ? `已选：${saved.title}` : `当前：${candidate.title}${saved ? `；已选仍是「${saved.title}」` : "；喜欢就保存"}` : saved ? `已选：${saved.title}。新结果完成后可替换。` : "完成这一项后，保存喜欢的结果。";
  }
  function mount(key, target) {
    if (!known(key) || controls.has(key)) return;
    const anchor = typeof target === "string" ? document.querySelector(target) : target;
    if (!anchor) return;
    const box = node("div", undefined, "pc-save");
    box.dataset.playerSave = key;
    const button = node("button", "保存到身份卡");
    button.type = "button";
    const link = node("a", "回主页生成整张卡 →");
    link.href = homeUrl;
    const status = node("p");
    status.setAttribute("role", "status");
    box.append(button, link, status);
    anchor.after(box);
    controls.set(key, { box, button, status });
    button.addEventListener("click", () => {
      const candidate = candidates.get(key);
      if (!candidate) return;
      try { write(key, candidate); refreshControl(key); }
      catch (_) { status.textContent = "保存失败，请检查浏览器是否允许保存网站数据，然后重试。"; }
    });
    refreshControl(key);
  }
  function offer(key, data) {
    const value = normalize(data);
    if (!known(key) || !value) return;
    candidates.set(key, value);
    const def = definitions.find(item => item.key === key);
    if (def.selector) mount(key, def.selector);
    refreshControl(key);
  }
  function pending(key) { candidates.delete(key); refreshControl(key); }
  function stage(key, data) {
    // A completed parking run returns to prep; carry only an unsaved candidate.
    try { sessionStorage.setItem(PREFIX + "candidate:" + key, JSON.stringify(normalize(data))); } catch (_) { /* The game must still return normally. */ }
  }

  function initHome(root) {
    const nameInput = root.querySelector("#pc-name");
    const list = root.querySelector("#pc-collection");
    const canvas = root.querySelector("#pc-canvas");
    const message = root.querySelector("#pc-message");
    const progress = root.querySelector("#pc-progress");
    const download = root.querySelector("#pc-download");
    const preview = root.querySelector("#pc-image");
    let imageUrl = "";
    let previewRevision = 0;
    try { nameInput.value = clean(localStorage.getItem(PREFIX + "name") || "", 24); } catch (_) { /* Name is optional. */ }
    function hideImage() {
      previewRevision += 1;
      preview.hidden = true;
      preview.removeAttribute("src");
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = "";
    }
    function refresh() {
      hideImage();
      const data = snapshot();
      const count = definitions.filter(({ key }) => data[key]).length;
      progress.textContent = `${count} / ${definitions.length} 板块已保存`;
      download.disabled = !count;
      list.replaceChildren();
      definitions.forEach(def => {
        const saved = data[def.key];
        const row = node("article", undefined, "pc-entry" + (saved ? " is-saved" : ""));
        const label = node("h3", def.label);
        const title = node("p", saved ? saved.title : "待解锁");
        const actions = node("div", undefined, "pc-entry-actions");
        const go = node("a", saved ? "重新挑选 ↗" : "去玩并保存 ↗");
        go.href = def.href;
        actions.append(go);
        if (saved) {
          const remove = node("button", "移除");
          remove.type = "button";
          remove.setAttribute("aria-label", `从身份卡移除${def.label}`);
          remove.addEventListener("click", () => {
            try { localStorage.removeItem(PREFIX + def.key); window.dispatchEvent(new Event("player-card-change")); message.textContent = `已移除${def.label}，可回小游戏重新保存。`; }
            catch (_) { message.textContent = "未能移除，请重试。"; }
          });
          actions.append(remove);
        }
        row.append(label, title);
        if (saved && def.key === "fortune") row.append(node("small", `${saved.date}${saved.date !== day() ? " · 历史签，可重新抽取" : " · 今日保存"}`));
        row.append(actions);
        list.append(row);
      });
      drawCard(canvas, data, nameInput.value);
    }
    nameInput.addEventListener("input", () => {
      try { localStorage.setItem(PREFIX + "name", clean(nameInput.value, 24)); } catch (_) { message.textContent = "呼号暂时无法保存，仍可生成图片。"; }
      hideImage();
      drawCard(canvas, snapshot(), nameInput.value);
    });
    download.addEventListener("click", async () => {
      download.disabled = true;
      message.textContent = "正在生成完整身份卡…";
      const revision = ++previewRevision;
      try {
        if (document.fonts) await document.fonts.ready;
        if (revision !== previewRevision) return;
        drawCard(canvas, snapshot(), nameInput.value);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (revision !== previewRevision) return;
        if (!blob) throw new Error("图片未能生成");
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        imageUrl = URL.createObjectURL(blob);
        preview.src = imageUrl;
        preview.hidden = false;
        const link = node("a");
        link.href = imageUrl;
        link.download = `三角洲身份卡-${clean(nameInput.value || "无名摸金人", 24).replace(/[\\/:*?"<>|]/g, "_")}-${day()}.png`;
        document.body.append(link);
        link.click();
        link.remove();
        message.textContent = "图片已生成。若未自动下载，可长按下方图片保存。";
      } catch (_) { message.textContent = "图片生成失败，请重试。已保存的结果不会丢失。"; }
      finally { download.disabled = !Object.values(snapshot()).some(Boolean); }
    });
    window.addEventListener("player-card-change", refresh);
    window.addEventListener("storage", event => { if (!event.key || event.key.startsWith(PREFIX)) refresh(); });
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
    refresh();
    if (document.fonts) document.fonts.ready.then(() => drawCard(canvas, snapshot(), nameInput.value));
  }

  function drawCard(canvas, data, name) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const font = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
    const W = 1080, margin = 54, gap = 24, col = (W - margin * 2 - gap) / 2;
    function setFont(size, weight = 500) { ctx.font = `${weight} ${size}px ${font}`; }
    function wrap(text, width, size, weight = 500) {
      setFont(size, weight);
      const lines = []; let line = "";
      for (const letter of Array.from(text)) {
        if (line && ctx.measureText(line + letter).width > width) { lines.push(line); line = letter; }
        else line += letter;
      }
      if (line) lines.push(line);
      return lines;
    }
    const sections = definitions.filter(def => def.key !== "personality").map(def => {
      const result = data[def.key];
      const titleLines = wrap(result ? result.title : "待解锁", col - 44, 29, 800);
      const details = result ? result.lines.flatMap(line => wrap(line, col - 44, 22)) : ["去小游戏，留下你喜欢的结果。"];
      if (result && def.key === "fortune") details.push(...wrap(`抽签日期 ${result.date}${result.date !== day() ? " · 历史签" : ""}`, col - 44, 22));
      return { ...def, result, titleLines, details, height: 104 + titleLines.length * 39 + details.length * 32 };
    });
    let totalHeight = 620;
    for (let i = 0; i < sections.length; i += 2) totalHeight += Math.max(sections[i].height, sections[i + 1]?.height || 0) + gap;
    totalHeight += 150;
    canvas.width = W;
    canvas.height = totalHeight;
    function text(value, x, y, size = 24, color = "#e5f0e7", weight = 500) {
      setFont(size, weight); ctx.fillStyle = color; ctx.fillText(value, x, y);
    }
    function rect(x, y, w, h, color, border) {
      ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
      if (border) { ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h); }
    }
    rect(0, 0, W, totalHeight, "#07110d");
    for (let y = 0; y < totalHeight; y += 40) rect(0, y, W, 1, "#102219");
    rect(0, 0, W, 10, "#a5ef78");
    text("G.T.I.  /  PLAYER ARCHIVE", margin, 73, 23, "#a5ef78", 800);
    text("三角洲 · 玩家身份卡", margin, 136, 47, "#f3f8f2", 900);
    const nameLines = wrap(clean(name.trim() || "无名摸金人", 24), W - margin * 2, 35, 800);
    nameLines.forEach((line, i) => text(line, margin, 193 + i * 40, 35, "#c9deca", 800));
    text(`${day()}  /  已收集 ${Object.values(data).filter(Boolean).length} / ${definitions.length}`, margin, 261, 22, "#9bb49f");
    rect(margin, 292, W - margin * 2, 288, "#0e2017", "#34543e");
    const profile = data.personality;
    text("01 / 战术人格 · 六维档案", margin + 24, 332, 22, "#a5ef78", 800);
    const profileTitle = wrap(profile ? profile.title : "你的档案，等你来写", 510, 32, 800);
    profileTitle.forEach((line, i) => text(line, margin + 24, 385 + i * 40, 32, "#f3f8f2", 800));
    const quote = wrap(profile?.lines[0] || "完成人格测试，保存专属称号和六维图。", 490, 23);
    quote.slice(0, 4).forEach((line, i) => text(line, margin + 24, 456 + i * 31, 23, "#afc6b4"));
    const cx = 829, cy = 436, radius = 91;
    function point(i, scale) { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + Math.cos(a) * radius * scale, cy + Math.sin(a) * radius * scale]; }
    function polygon(scales) {
      ctx.beginPath(); scales.forEach((scale, i) => { const [x, y] = point(i, scale); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
    }
    for (const level of [.25, .5, .75, 1]) { polygon(traits.map(() => level)); ctx.strokeStyle = "#365640"; ctx.stroke(); }
    if (profile?.scores) {
      polygon(traits.map(([key]) => profile.scores[key] / 100));
      ctx.fillStyle = "rgba(165,239,120,.25)"; ctx.fill(); ctx.strokeStyle = "#a5ef78"; ctx.lineWidth = 3; ctx.stroke();
    }
    traits.forEach(([key, label], i) => { const [x, y] = point(i, 1.29); ctx.textAlign = "center"; text(`${label}${profile?.scores ? " " + Math.round(profile.scores[key]) : ""}`, x, y + 6, 18, "#c2d7c7"); });
    ctx.textAlign = "left";
    let y = 620;
    for (let i = 0; i < sections.length; i += 2) {
      const rowHeight = Math.max(sections[i].height, sections[i + 1]?.height || 0);
      sections.slice(i, i + 2).forEach((section, c) => {
        const x = margin + c * (col + gap);
        rect(x, y, col, rowHeight, section.result ? "#0d1c14" : "#0a1610", "#2c4534");
        rect(x, y, 4, 33, section.result ? "#a5ef78" : "#405847");
        text(`${String(i + c + 2).padStart(2, "0")} / ${section.label}`, x + 22, y + 40, 22, section.result ? "#a5ef78" : "#91a697", 800);
        let ty = y + 86;
        section.titleLines.forEach(line => { text(line, x + 22, ty, 29, section.result ? "#edf5ec" : "#8aa38e", 800); ty += 39; });
        ty += 10;
        section.details.forEach(line => { text(line, x + 22, ty, 22, "#a7bfae"); ty += 32; });
      });
      y += rowHeight + gap;
    }
    text("阿萨拉整活办  ·  玩出你的档案", margin, y + 34, 27, "#a5ef78", 800);
    text("非官方娱乐结果 · 自选收藏，不代表实际战斗力或游戏爆率", margin, y + 76, 21, "#9bb49f");
    text("delta-force-wiki.jiangyilin2010.chatgpt.site", margin, y + 112, 21, "#9bb49f");
    canvas.setAttribute("aria-label", `${name.trim() || "无名摸金人"}的身份卡。` + definitions.map(def => `${def.label}：${data[def.key]?.title || "待解锁"}`).join("；"));
  }
  window.PlayerCard = Object.freeze({ offer, pending, stage, mount, read, snapshot, write, day, definitions, drawCard });
  function init() {
    const page = location.pathname.split("/").pop() || "delta_force_wiki_home.html";
    definitions.forEach(def => { if (def.selector && def.href.split("#")[0].replace(/\.html$/, "") === page.replace(/\.html$/, "")) mount(def.key, def.selector); });
    if (location.pathname.endsWith("parking_prep.html")) {
      try {
        const draft = normalize(JSON.parse(sessionStorage.getItem(PREFIX + "candidate:parking")));
        if (draft) {
          const anchor = node("div");
          document.body.prepend(anchor);
          mount("parking", anchor);
          offer("parking", draft);
        }
      } catch (_) { /* An unavailable draft does not block prep. */ }
    }
    const root = document.querySelector("#player-card");
    if (root) initHome(root);
    window.addEventListener("player-card-change", () => controls.forEach((_, key) => refreshControl(key)));
    window.addEventListener("storage", () => controls.forEach((_, key) => refreshControl(key)));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
