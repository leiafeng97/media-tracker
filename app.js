const STORAGE_KEY = "personal-media-tracker.entries.v1";
const formats = ["Book", "Theatre", "Film", "TV Show", "Exhibition"];

const form = document.querySelector("#entry-form");
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-button");
const resetFormButton = document.querySelector("#reset-form");
const entriesList = document.querySelector("#entries-list");
const emptyState = document.querySelector("#empty-state");
const template = document.querySelector("#entry-template");
const searchInput = document.querySelector("#search");
const formatFilter = document.querySelector("#format-filter");
const entryCount = document.querySelector("#entry-count");
const favoriteFormat = document.querySelector("#favorite-format");

let entries = loadEntries();
let editingId = null;

form.dateConsumed.valueAsDate = new Date();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const entry = {
    id: editingId ?? crypto.randomUUID(),
    title: clean(formData.get("title")),
    format: clean(formData.get("format")),
    dateConsumed: formData.get("dateConsumed"),
    rating: Number(formData.get("rating")),
    vibe: clean(formData.get("vibe")),
    stayedWithMe: clean(formData.get("stayedWithMe")),
    recommendTo: clean(formData.get("recommendTo")),
    similarWorks: clean(formData.get("similarWorks")) || "None noted",
    contentIdea: clean(formData.get("contentIdea")) || "None yet",
    wouldRevisit: formData.get("wouldRevisit") === "on",
    createdAt: editingId ? entries.find((item) => item.id === editingId)?.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!entry.title || !entry.format || !entry.dateConsumed || !entry.rating || !entry.vibe || !entry.stayedWithMe || !entry.recommendTo) {
    form.reportValidity();
    return;
  }

  entries = editingId
    ? entries.map((item) => (item.id === editingId ? entry : item))
    : [entry, ...entries];

  saveEntries();
  resetForm();
  render();
});

resetFormButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", render);
formatFilter.addEventListener("change", render);

entriesList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const card = event.target.closest(".entry-card");
  const entry = entries.find((item) => item.id === card?.dataset.id);
  if (!entry) return;

  if (button.dataset.action === "edit") {
    startEdit(entry);
  }

  if (button.dataset.action === "delete") {
    entries = entries.filter((item) => item.id !== entry.id);
    saveEntries();
    if (editingId === entry.id) resetForm();
    render();
  }
});

function loadEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function render() {
  const visibleEntries = getVisibleEntries();

  entriesList.innerHTML = "";
  emptyState.classList.toggle("hidden", visibleEntries.length > 0);

  visibleEntries.forEach((entry) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.id = entry.id;
    card.querySelector("h3").textContent = entry.title;
    card.querySelector(".meta-line").textContent = `${entry.format} - ${formatDate(entry.dateConsumed)}`;
    card.querySelector(".rating-badge").textContent = `${entry.rating}/5`;
    card.querySelector(".vibe").textContent = entry.vibe;
    card.querySelector('[data-field="stayedWithMe"]').textContent = entry.stayedWithMe;
    card.querySelector('[data-field="recommendTo"]').textContent = entry.recommendTo;
    card.querySelector('[data-field="similarWorks"]').textContent = entry.similarWorks;
    card.querySelector('[data-field="contentIdea"]').textContent = entry.contentIdea;
    card.querySelector(".revisit-pill").textContent = entry.wouldRevisit ? "Would revisit" : "One-time encounter";
    entriesList.append(card);
  });

  entryCount.textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;
  favoriteFormat.textContent = getMostCommonFormat();
}

function getVisibleEntries() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedFormat = formatFilter.value;

  return entries
    .filter((entry) => selectedFormat === "All" || entry.format === selectedFormat)
    .filter((entry) => {
      if (!query) return true;
      return [
        entry.title,
        entry.format,
        entry.vibe,
        entry.stayedWithMe,
        entry.recommendTo,
        entry.similarWorks,
        entry.contentIdea
      ].some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((a, b) => new Date(b.dateConsumed) - new Date(a.dateConsumed));
}

function getMostCommonFormat() {
  if (!entries.length) return "No formats yet";

  const counts = formats.map((format) => ({
    format,
    count: entries.filter((entry) => entry.format === format).length
  }));
  const top = counts.sort((a, b) => b.count - a.count)[0];
  return top.count ? `Most saved: ${top.format}` : "No formats yet";
}

function startEdit(entry) {
  editingId = entry.id;
  formTitle.textContent = "Edit entry";
  submitButton.textContent = "Update entry";
  resetFormButton.classList.remove("hidden");

  form.title.value = entry.title;
  form.format.value = entry.format;
  form.dateConsumed.value = entry.dateConsumed;
  form.rating.value = String(entry.rating);
  form.vibe.value = entry.vibe;
  form.stayedWithMe.value = entry.stayedWithMe;
  form.recommendTo.value = entry.recommendTo;
  form.similarWorks.value = entry.similarWorks === "None noted" ? "" : entry.similarWorks;
  form.contentIdea.value = entry.contentIdea === "None yet" ? "" : entry.contentIdea;
  form.wouldRevisit.checked = entry.wouldRevisit;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  editingId = null;
  form.reset();
  form.dateConsumed.valueAsDate = new Date();
  formTitle.textContent = "Add an entry";
  submitButton.textContent = "Save entry";
  resetFormButton.classList.add("hidden");
}

function clean(value) {
  return String(value || "").trim();
}

function formatDate(value) {
  if (!value) return "Undated";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}
