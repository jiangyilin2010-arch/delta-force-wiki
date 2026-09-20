(function (root) {
  "use strict";
  const cases = typeof module !== "undefined" && module.exports ? require("./asala-ethics-data.js") : root.AsalaEthicsCases;
  const dimensions = [
    { id: "loyalty", name: "兄弟优先", color: "#8fdfa8", line: "背包可以再买，固定队得有人捞。" },
    { id: "wealth", name: "物资优先", color: "#ff7582", line: "先把损益算清楚，再讨论心情。" },
    { id: "principle", name: "公平守约", color: "#82d9ea", line: "陌生人的份额，和自己人的也一样算数。" },
    { id: "survival", name: "生存优先", color: "#eac782", line: "先活着撤离，才有下一把。" }
  ];
  function shuffled(items, rng = Math.random) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function createRun(rng = Math.random) {
    const middle = shuffled(cases.slice(2, -1), rng);
    // Cover each trade-off at least once so a random run cannot omit an entire value.
    const groups = [
      ["loyalty", "wealth"], ["loyalty", "principle"], ["loyalty", "survival"],
      ["wealth", "principle"], ["wealth", "survival"], ["principle", "survival"]
    ];
    const selected = groups.map(pair => middle.find(question => pair.every(id => question.options.some(item => (item.effect[id] || 0) >= 2))));
    selected.push(middle.find(question => !selected.includes(question)));
    const questions = [cases[0], cases[1], ...shuffled(selected, rng), cases[cases.length - 1]];
    return { questions: questions.map(item => ({ ...item, options: shuffled(item.options, rng) })), answers: [], complete: false, draft: null, reviewableCaseId: null, revisionsRemaining: 1 };
  }
  function stageChoice(run, caseId, optionId) {
    const current = run.questions[run.answers.length];
    if (run.complete || run.reviewableCaseId || !current || current.id !== caseId) throw new Error("请在当前未签字的案件中选择答案。");
    if (!current.options.some(item => item.id === optionId)) throw new Error("请选择本题中的一个选项。");
    run.draft = { caseId, optionId };
    return run.draft;
  }
  function confirmChoice(run) {
    if (!run.draft || run.reviewableCaseId) throw new Error("请先选择一个待确认的答案。");
    return answer(run, run.draft.caseId, run.draft.optionId);
  }
  function answer(run, caseId, optionId) {
    const current = run.questions[run.answers.length];
    if (run.complete || !current || current.id !== caseId) throw new Error("这道题已经签字，或还没有轮到它。");
    const selected = current.options.find(item => item.id === optionId);
    if (!selected) throw new Error("请选择本题中的一个选项。");
    const record = { question: current, selected };
    run.answers.push(record);
    run.draft = null;
    run.reviewableCaseId = current.id;
    return record;
  }
  function archiveAnswer(run) {
    if (!run.reviewableCaseId || run.complete) throw new Error("当前没有等待归档的签字。");
    run.reviewableCaseId = null;
  }
  function withdrawAnswer(run, caseId) {
    const last = run.answers[run.answers.length - 1];
    if (run.complete || !last || run.reviewableCaseId !== caseId || last.question.id !== caseId) throw new Error("只能撤回当前案件；已归档的签字不能修改。");
    if (!(run.revisionsRemaining > 0)) throw new Error("本局的撤回机会已经用完。");
    run.answers.pop();
    run.revisionsRemaining -= 1;
    run.reviewableCaseId = null;
    run.draft = null;
    return last;
  }
  function verdict(run) {
    if (run.answers.length !== run.questions.length) throw new Error("还有情境未完成，暂时不能出具判词。");
    const totals = Object.fromEntries(dimensions.map(item => [item.id, 0]));
    for (const { selected } of run.answers) for (const [key, value] of Object.entries(selected.effect)) totals[key] += value;
    // Normalize by opportunities in this particular run, not the size of the question pool.
    const scored = dimensions.map((item, index) => {
      const available = run.questions.reduce((sum, question) => sum + Math.max(...question.options.map(choice => choice.effect[item.id] || 0)), 0);
      return { ...item, index, score: totals[item.id], rate: available ? totals[item.id] / available : 0 };
    });
    const ranked = scored.slice().sort((a, b) => b.rate - a.rate || b.score - a.score || a.index - b.index);
    const picked = id => run.answers.find(item => item.question.id === id)?.selected.id;
    let result;
    if (picked("water") === "heart" && picked("trolley") === "stay" && totals.wealth >= 9 && ranked.slice(0, 2).some(item => item.id === "wealth")) {
      result = { title: "兄弟按市价结算", quote: "列车来了我救你，出红了咱们另议。", text: "没有报价时，你会选自己人；红货摆上桌时，关系就进入了重新估值。你不是没感情，只是委员会发现你的感情附带行情表。" };
    } else if (ranked[0].rate >= 0.85 && ranked[0].score >= 9 && ranked[0].rate - ranked[1].rate >= 0.12) {
      const specialists = {
        loyalty: ["固定队人形复活甲", "仓库可以空，队伍不能少一个。", "你反复把机会、补给和撤离时间留给身边的人。你的队友确实更容易等到接应，只是这份兜底常常要用你的收益和风险来结账。"],
        wealth: ["哈夫克财务总监", "感情先挂账，红货先入库。", "面对背包和关系的竞争，你大多先保收益。你很清楚每一件东西值多少钱；委员会建议下次算账时，把失去的信任也单列一行。"],
        principle: ["阿萨拉最后的合同", "红可以再摸，说过的话不能回收。", "你反复看重公平、承诺，以及不只对熟人有效的理由，即使这会让自己人不高兴、让眼前收益变少。你守住了原则，也承担了它不好受的那一面。"],
        survival: ["撤离按钮成精", "下把的故事，得活着才有。", "你多次选择止损、离场或减少不确定性。你给自己留了后路，也清楚这意味着某些救援、承诺和人情没能一起被带出去。"]
      };
      const [title, quote, text] = specialists[ranked[0].id];
      result = { title, quote, text };
    } else if (ranked[0].rate - ranked[3].rate <= 0.23) {
      result = { title: "阿萨拉端水大师", quote: "先别吵，给我看看这题的具体情况。", text: "你的选择没有让某一种理由一直赢：有时保人，有时认账，有时守约，有时先走。你愿意逐题权衡，代价是很难给自己写一句永远不变的原则。" };
    } else {
      const pairs = {
        "loyalty+wealth": ["带兄弟一起吃席", "红要装，兄弟也要算一份。", "你在自己人和物资之间反复权衡。发财最好有人一起分，救人又难免惦记包；关键时刻究竟放下哪一个，要看你这次签过的字。"],
        "loyalty+principle": ["固定队良心承包商", "自己人我护，说好的账我也认。", "你看重同行的人，也重视承诺有没有兑现。这两件事大多能并行；碰上朋友的要求伤到别人时，才是你最难签字的地方。"],
        "loyalty+survival": ["会算撤离时间的妈", "我来拉你，但别再往那条枪线跑了。", "你有回头救人的冲动，也不愿每次都陪全队一起白给。你会照顾队友，但这份照顾开始带上预算、时间和止损条件。"],
        "wealth+principle": ["先签合同再摸红", "账可以算得细，话不能说了不认。", "你想赚，也在意这钱是不是按规矩到手。收益与承诺冲突时，你并非每次都选同一边，委员会把这些取舍都留在了记录里。"],
        "wealth+survival": ["活着才有复利", "可以少打一队，不能少带一包。", "你喜欢收益，也偏爱能落袋的收益。值不值得多冒一次险，是你做决定时常用的秤；这杆秤未必给救援和关系留了足够位置。"],
        "principle+survival": ["有底线的撤离专家", "答应的事认账，额外的险别硬上。", "你希望守住约定，也守住自己的边界。能安全兑现的承诺最让你踏实；当二者冲突，你会认真算代价，而不会自动牺牲自己。"]
      };
      const key = dimensions.filter(item => ranked.slice(0, 2).some(top => top.id === item.id)).map(item => item.id).join("+");
      const [title, quote, text] = pairs[key];
      result = { title, quote, text };
    }
    const rateTotal = scored.reduce((sum, item) => sum + item.rate, 0);
    const percentages = scored.map(item => ({ ...item, exact: item.rate / rateTotal * 100, percent: Math.floor(item.rate / rateTotal * 100) }));
    const remainder = 100 - percentages.reduce((sum, item) => sum + item.percent, 0);
    percentages.slice().sort((a, b) => (b.exact - b.percent) - (a.exact - a.percent) || a.index - b.index).slice(0, remainder).forEach(item => { item.percent += 1; });
    return { ...result, dimensions: percentages.map(({ id, name, color, line, percent }) => ({ id, name, color, line, percent })) };
  }

  const api = { cases, dimensions, createRun, stageChoice, confirmChoice, answer, archiveAnswer, withdrawAnswer, verdict };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;
  root.AsalaEthics = api;
  let run = createRun();
  let pending = null;
  const $ = id => document.getElementById(id);
  const game = $("game");
  const results = $("results");
  if (!game || !results) return;
  const nextButton = $("next");
  const confirmButton = $("confirm");
  const withdrawButton = $("withdraw");
  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function renderQuestion(moveFocus = false) {
    const question = run.questions[run.answers.length];
    pending = null;
    run.draft = null;
    $("feedback").hidden = true;
    $("aftermath").textContent = "";
    $("committee-comment").textContent = "";
    $("choice-list").replaceChildren();
    $("case-title").textContent = question.title;
    $("case-number").textContent = String(run.answers.length + 1).padStart(2, "0");
    $("case-place").textContent = question.place;
    $("case-type").textContent = question.type;
    $("case-story").replaceChildren(...question.story.map(text => el("p", "", text)));
    $("case-constraint").textContent = question.constraint;
    $("evidence").replaceChildren(...question.evidence.map((item, index) => {
      const node = el("div", "evidence-item");
      node.append(el("span", "evidence-tag", `证物 ${index === 0 ? "A" : "B"}`), el("strong", "", item));
      return node;
    }));
    question.options.forEach((item, index) => {
      const button = el("button", "choice");
      button.type = "button";
      button.setAttribute("aria-pressed", "false");
      button.dataset.optionId = item.id;
      button.append(el("span", "choice-letter", String.fromCharCode(65 + index)));
      const copy = el("span", "choice-copy");
      copy.append(el("strong", "", item.title), el("span", "", item.detail));
      button.append(copy, el("span", "choice-state", ""));
      button.addEventListener("click", () => selectChoice(question.id, item.id));
      $("choice-list").append(button);
    });
    confirmButton.hidden = false;
    confirmButton.disabled = true;
    confirmButton.textContent = "签字确认";
    nextButton.hidden = true;
    nextButton.disabled = true;
    withdrawButton.hidden = true;
    $("signature-status").textContent = "本案尚未签字";
    updateProgress();
    if (moveFocus) $("case-title").focus();
  }
  function updateProgress() {
    $("progress-count").textContent = `${run.answers.length} / ${run.questions.length}`;
    $("progress").value = run.answers.length;
    $("progress").max = run.questions.length;
    $("session-status").textContent = run.complete ? "审议结束" : "审议进行中";
    $("revision-status").textContent = run.revisionsRemaining > 0 ? "撤回机会 1 / 1" : "本局撤回机会已用完";
  }
  function selectChoice(caseId, optionId) {
    if (pending || run.complete) throw new Error("本案已经签字，请先前往下一案。");
    stageChoice(run, caseId, optionId);
    for (const button of $("choice-list").children) {
      const selected = button.dataset.optionId === optionId;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.querySelector(".choice-state").textContent = selected ? "待确认" : "";
    }
    const selected = run.questions[run.answers.length].options.find(item => item.id === optionId);
    $("signature-status").textContent = `待确认：${selected.title}`;
    confirmButton.disabled = false;
    return publicState();
  }
  function signChoice() {
    if (pending || run.complete) throw new Error("本案已经签字。");
    pending = confirmChoice(run);
    confirmButton.disabled = true;
    confirmButton.hidden = true;
    for (const button of $("choice-list").children) {
      const selected = button.dataset.optionId === pending.selected.id;
      button.disabled = true;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.querySelector(".choice-state").textContent = selected ? "已签字" : "未选择";
    }
    $("aftermath").textContent = pending.selected.aftermath;
    $("committee-comment").textContent = pending.selected.comment;
    $("feedback").hidden = false;
    $("signature-status").textContent = "已签字；进入下一案后归档";
    nextButton.hidden = false;
    nextButton.disabled = false;
    nextButton.textContent = run.answers.length === run.questions.length ? "领取我的伦理判词" : "下一案";
    if (run.answers.length === run.questions.length) $("signature-status").textContent = "已签字；领取判词后归档";
    withdrawButton.hidden = run.revisionsRemaining === 0;
    updateProgress();
    $("feedback").focus({ preventScroll: true });
    $("feedback").scrollIntoView({ behavior: root.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
    return publicState();
  }
  function retractChoice(caseId) {
    if (!pending) throw new Error("本案尚未签字，无需撤回。");
    withdrawAnswer(run, caseId);
    renderQuestion(true);
    $("signature-status").textContent = "签字已撤回，请重新决定";
    return publicState();
  }
  function renderVerdict() {
    const result = verdict(run);
    run.complete = true;
    game.hidden = true;
    results.hidden = false;
    $("verdict-title").textContent = result.title;
    $("verdict-quote").textContent = `“${result.quote}”`;
    $("verdict-text").textContent = result.text;
    $("tendencies").replaceChildren(...result.dimensions.map(item => {
      const row = el("div", "tendency");
      row.style.setProperty("--bar-color", item.color);
      const heading = el("div", "tendency-heading");
      heading.append(el("strong", "", item.name), el("span", "", `${item.percent}%`));
      const meter = el("meter", "tendency-meter");
      meter.min = 0; meter.max = 100; meter.value = item.percent;
      meter.setAttribute("aria-label", item.name);
      row.append(heading, meter, el("p", "", item.line));
      return row;
    }));
    $("record-count").textContent = `${run.answers.length} 份签字记录`;
    $("records").replaceChildren(...run.answers.map(({ question, selected }, index) => {
      const detail = el("details", "record");
      const summary = el("summary", "");
      summary.append(el("span", "record-number", String(index + 1).padStart(2, "0")), el("span", "record-title", question.title));
      detail.append(summary, el("p", "record-choice", `你签的是：${selected.title}`), el("p", "", selected.aftermath), el("p", "record-comment", selected.comment));
      return detail;
    }));
    updateProgress();
    $("verdict-title").focus();
  }
  function advance() {
    if (!pending || run.complete) throw new Error("请先签下当前的决定。");
    archiveAnswer(run);
    if (run.answers.length === run.questions.length) renderVerdict();
    else renderQuestion(true);
    return publicState();
  }
  function restart() {
    run = createRun();
    game.hidden = false;
    results.hidden = true;
    renderQuestion(true);
    return publicState();
  }
  function publicState() {
    if (run.complete) return { status: "complete", result: verdict(run) };
    if (pending) return { status: "answered", caseId: pending.question.id, completed: run.answers.length, total: run.questions.length, choice: pending.selected.title, aftermath: pending.selected.aftermath, comment: pending.selected.comment, revisionsRemaining: run.revisionsRemaining, canWithdraw: run.revisionsRemaining > 0 };
    const current = run.questions[run.answers.length];
    return { status: run.draft ? "staged" : "choosing", draftOptionId: run.draft?.optionId || null, completed: run.answers.length, total: run.questions.length, revisionsRemaining: run.revisionsRemaining, question: { id: current.id, title: current.title, story: current.story, constraint: current.constraint, options: current.options.map(({ id, title, detail }) => ({ id, title, detail })) } };
  }
  confirmButton.addEventListener("click", signChoice);
  // A double-click on confirmation must not also activate the newly revealed next button.
  nextButton.addEventListener("click", event => { if (event.detail <= 1) advance(); });
  withdrawButton.addEventListener("click", () => retractChoice(pending?.question.id));
  $("replay").addEventListener("click", restart);
  renderQuestion();

  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    const registrations = [
      { name: "read_asala_ethics_case", description: "Read the current Asala ethics dilemma, visible choices, feedback or final verdict.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: publicState },
      { name: "stage_asala_ethics_choice", description: "Select or change an unconfirmed answer. No points or consequences are revealed until it is separately signed.", inputSchema: { type: "object", properties: { caseId: { type: "string" }, optionId: { type: "string" } }, required: ["caseId", "optionId"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) { if (!input || typeof input.caseId !== "string" || typeof input.optionId !== "string") throw new Error("需要当前案件和选项编号。"); return selectChoice(input.caseId, input.optionId); } },
      { name: "sign_asala_ethics_choice", description: "Confirm the currently staged answer and reveal its consequence. One withdrawal per run is available before advancing.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: signChoice },
      { name: "withdraw_asala_ethics_signature", description: "Spend the one withdrawal available per run to retract the current signed answer. Archived cases cannot be changed.", inputSchema: { type: "object", properties: { caseId: { type: "string" } }, required: ["caseId"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) { if (!input || typeof input.caseId !== "string") throw new Error("需要当前案件编号。"); return retractChoice(input.caseId); } },
      { name: "advance_asala_ethics_case", description: "Archive the current signed choice so it can no longer be withdrawn, then open the next case or final verdict.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: advance }
    ];
    for (const tool of registrations) {
      try { Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch (_) { /* Optional experimental registration must not interrupt play. */ }
    }
    root.addEventListener("pagehide", event => { if (!event.persisted) lifecycle.abort(); });
  }
})(typeof window === "undefined" ? globalThis : window);
