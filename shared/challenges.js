(() => {
  "use strict";
  const challenges = window.DELTA_CHALLENGES;
  const list = document.querySelector("#challenge-list");
  const detail = document.querySelector("#challenge-detail");
  const escape = value => String(value).replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
  const draft = { budget: null, dish: "", appearance: 2, value: 8, service: 0, served: false, courses: false, arranged: false, chefLost: false, kitchenLost: false, fled: false, extraction: "", judged: false };
  let activeId = "";
  function selected() { return challenges.find(challenge => challenge.id === location.hash.slice(1)) || challenges[0]; }
  function ruleText(challenge) {
    const lines = [challenge.title, challenge.subtitle, `${challenge.players}｜${challenge.map}`, `创意：${challenge.label}`, "", "【分工】", ...challenge.roles.map(([title, text]) => `${title}：${text}`), "", "【开局前】", ...challenge.setup.map((text, index) => `${index + 1}. ${text}`), "", "【一局怎么玩】", ...challenge.flow.map(([title, text], index) => `${index + 1}. ${title}：${text}`), "", "【胜负判定】", ...challenge.verdicts.map(([title, text]) => `${title}：${text}`), "", "【收尾】", challenge.closing, "", "【整活灵感】", challenge.example];
    if (challenge.tools === "gourmet") {
      if (draft.budget) lines.push("", `本局食客额外采购预算：${draft.budget} 万哈夫币`);
      if (draft.dish.trim()) lines.push("", `菜品：${draft.dish.trim()}`, `卖相 ${draft.appearance}/10 · 价值 ${draft.value}/10 · 服务态度 ${draft.service}/10`);
      if (draft.judged) lines.push("", `本局自报结算：${settlement()}`);
    }
    lines.push("", "三角洲行动 WIKI · 玩家自定挑战");
    return lines.join("\n");
  }
  function settlement() {
    if (draft.chefLost || draft.kitchenLost || draft.fled) return "后厨爆炸：已发生翻车条件，本局挑战失败。";
    if (!draft.extraction) return "待结算：先填写两人的撤离结果。";
    if (draft.extraction !== "both") return "后厨爆炸：未能双人撤离，本局挑战失败。";
    if (!draft.served && !draft.courses) return "后厨爆炸：还没有端出一道菜，本局挑战失败。";
    if (draft.courses && draft.arranged) return "三星米其林：完整菜系、整齐摆盘、双人撤离。请食客买单并献上彩虹屁！";
    return "一星街头小吃：端出了菜，也带回了人。厨师领底薪，食客可以开始毒舌点评。";
  }
  function render() {
    const challenge = selected();
    activeId = challenge.id;
    document.title = `${challenge.title}｜玩法挑战｜三角洲行动 Wiki`;
    list.innerHTML = challenges.map(item => `<button type="button" class="challenge-choice" data-challenge="${item.id}" aria-pressed="${item.id === challenge.id}"><span class="number">${item.number}</span><span><strong>${escape(item.title)}</strong><small>${escape(item.players)} · ${escape(item.label)}</small></span></button>`).join("");
    list.querySelectorAll("button").forEach(button => button.addEventListener("click", () => choose(button.dataset.challenge)));
    detail.innerHTML = `
      <div class="challenge-cover">
        <p class="eyebrow">CHALLENGE ${challenge.number} / ${escape(challenge.label)}</p>
        <h2 id="challenge-title" tabindex="-1">${escape(challenge.title)}</h2>
        <p class="subtitle">${escape(challenge.subtitle)}</p>
        <div class="meta"><span>${escape(challenge.players)}</span><span>${escape(challenge.map)}</span><span>${escape(challenge.type)}</span></div>
        <p>${escape(challenge.hook)}</p>
        <div class="challenge-actions"><button type="button" class="button primary" id="copy-rules">复制规则给队友</button>${challenge.tools ? '<a class="button" href="#gourmet-tools" id="go-tools">开局抽预算 · 品鉴打分 ↓</a>' : '<a class="button" href="budget_map_randomizer.html">去抽本局战备 ↗</a>'}<p class="copy-status" id="copy-status" role="status"></p></div>
        <textarea class="copy-fallback" id="copy-fallback" aria-label="完整挑战规则，选中后复制" readonly hidden></textarea>
      </div>
      <div class="content">
        <section><h3>先把角色分好</h3><div class="roles">${challenge.roles.map(([title, text]) => `<div class="role"><strong>${escape(title)}</strong><p>${escape(text)}</p></div>`).join("")}</div></section>
        <section><h3>开局前，把规则说清</h3><ol class="rule-list">${challenge.setup.map(text => `<li>${escape(text)}</li>`).join("")}</ol></section>
        <section><h3>这一局，照着开演</h3><ol class="timeline">${challenge.flow.map(([title, text], index) => `<li><span class="step">${String(index + 1).padStart(2, "0")}</span><div><strong>${escape(title)}</strong><p>${escape(text)}</p></div></li>`).join("")}</ol></section>
        <section><h3>最后怎么判</h3><div class="verdict-grid">${challenge.verdicts.map(([title, text]) => `<div class="verdict"><strong>${escape(title)}</strong><p>${escape(text)}</p></div>`).join("")}</div></section>
        <section><h3>收尾也要有节目效果</h3><p class="closing">${escape(challenge.closing)}</p><p class="example">${escape(challenge.example)}</p></section>
      </div>
      ${challenge.tools === "gourmet" ? toolsHtml() : ""}`;
    document.querySelector("#copy-rules").addEventListener("click", async event => {
      const button = event.currentTarget;
      const status = document.querySelector("#copy-status");
      const fallback = document.querySelector("#copy-fallback");
      const text = ruleText(challenge);
      button.disabled = true;
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Manual copy needed");
        await navigator.clipboard.writeText(text);
        status.textContent = "已复制完整规则，发到开黑群就能开局。";
        fallback.hidden = true;
      } catch (_) {
        fallback.value = text;
        fallback.hidden = false;
        fallback.focus();
        fallback.select();
        status.textContent = "请复制下方已选中的规则；手机可长按全选复制。";
      } finally { button.disabled = false; }
    });
    if (challenge.tools) {
      document.querySelector("#go-tools").addEventListener("click", event => {
        event.preventDefault();
        document.querySelector("#gourmet-tools").scrollIntoView({behavior: reducedMotion() ? "instant" : "smooth", block: "start"});
        document.querySelector("#roll-budget").focus({preventScroll:true});
      });
      connectTools();
    }
  }
  function reducedMotion() { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; }
  function choose(id) {
    if (activeId === id) return;
    history.pushState(null, "", `#${id}`);
    render();
    document.querySelector("#challenge-title").focus({preventScroll:true});
    if (window.innerWidth <= 720) detail.scrollIntoView({behavior:reducedMotion() ? "instant" : "smooth",block:"start"});
  }
  function toolsHtml() {
    const checkbox = (id, text) => `<label><input type="checkbox" data-condition="${id}" ${draft[id] ? "checked" : ""}>${text}</label>`;
    return `<section class="gourmet-tools" id="gourmet-tools" aria-labelledby="tools-title">
      <h3 id="tools-title">本局餐厅小票</h3><p class="tools-note">开局抽预算，局中打菜分，最后按实际结果判星。菜分不会决定星级。</p>
      <div class="budget-row"><button type="button" class="button" id="roll-budget">抽食客采购预算</button><output class="budget-readout" id="budget-result" aria-live="polite">${draft.budget ? `${draft.budget} 万哈夫币` : "1～10 万，等你开签"}</output></div>
      <div class="tasting"><label for="dish-name">这道菜叫什么？</label><input type="text" id="dish-name" maxlength="40" value="${escape(draft.dish)}" placeholder="比如：主厨特选绷带刺身"><div class="scores">${[["appearance","卖相"],["value","价值"],["service","服务态度"]].map(([key,label]) => `<label for="score-${key}">${label}<output id="value-${key}">${draft[key]} / 10</output><input type="range" id="score-${key}" data-score="${key}" min="0" max="10" step="1" value="${draft[key]}"></label>`).join("")}</div><p class="review-line" id="review-line" aria-live="polite"></p></div>
      <div class="settlement"><h3>这家店，值几颗星？</h3>
        <fieldset><legend>出菜情况</legend>${checkbox("served","至少端出过一道菜")}${checkbox("courses","前菜、主菜、饮品三类齐全")}${checkbox("arranged","最终摆盘整齐")}</fieldset>
        <fieldset><legend>有没有发生翻车？（任一项直接失败）</legend>${checkbox("chefLost","厨师被“食材”反杀")}${checkbox("kitchenLost","食客没看好门，后厨被端")}${checkbox("fled","一道菜没上，就被迫逃跑")}</fieldset>
        <label for="extraction">两人的撤离结果</label><select id="extraction"><option value="">还没结算</option><option value="both">两人都成功撤离</option><option value="partial">只有一人撤离</option><option value="none">两人都没撤离</option></select>
        <button class="button primary" id="judge-stars" type="button">结算餐厅星级</button><p class="settlement-result" id="settlement-result" role="status">${draft.judged ? escape(settlement()) : "打完这一局，再来给餐厅挂牌。"}</p>
      </div>
    </section>`;
  }
  function connectTools() {
    const scoreLine = document.querySelector("#review-line");
    const result = document.querySelector("#settlement-result");
    function review() {
      const sum = draft.appearance + draft.value + draft.service;
      const comment = draft.service <= 2 ? "菜可以再点，主厨建议换一位。" : draft.appearance <= 2 ? "建议主厨把摆盘这门课补一下。" : sum >= 24 ? "这家店，我愿意再来一局。" : "能吃。下次希望不是最后一餐。";
      scoreLine.textContent = `${draft.dish.trim() || "本次品鉴"}：卖相 ${draft.appearance} 分，价值 ${draft.value} 分，服务态度 ${draft.service} 分。合计 ${sum}/30。${comment}`;
    }
    document.querySelector("#roll-budget").addEventListener("click", () => {
      draft.budget = Math.floor(Math.random() * 10) + 1;
      document.querySelector("#budget-result").textContent = `${draft.budget} 万哈夫币`;
    });
    document.querySelector("#dish-name").addEventListener("input", event => { draft.dish = event.target.value.slice(0,40); review(); });
    document.querySelectorAll("[data-score]").forEach(input => input.addEventListener("input", () => {
      const key = input.dataset.score;
      draft[key] = Math.min(10, Math.max(0, Math.round(Number(input.value) || 0)));
      document.querySelector(`#value-${key}`).textContent = `${draft[key]} / 10`;
      review();
    }));
    document.querySelectorAll("[data-condition]").forEach(input => input.addEventListener("change", () => { draft[input.dataset.condition] = input.checked; if (draft.judged) result.textContent = settlement(); }));
    const extraction = document.querySelector("#extraction");
    extraction.value = draft.extraction;
    extraction.addEventListener("change", () => { draft.extraction = extraction.value; if (draft.judged) result.textContent = settlement(); });
    document.querySelector("#judge-stars").addEventListener("click", () => { draft.judged = true; result.textContent = settlement(); });
    review();
  }
  document.querySelector("#random-challenge").addEventListener("click", () => {
    const others = challenges.filter(challenge => challenge.id !== activeId);
    choose(others[Math.floor(Math.random() * others.length)].id);
  });
  window.addEventListener("hashchange", render);
  window.addEventListener("popstate", render);
  render();
})();
