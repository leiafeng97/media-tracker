const STORAGE_KEY = "personal-media-tracker.entries.v1";
const formats = ["Book", "Theatre", "Film", "TV Show", "Exhibition"];
const formatLabels = {
  All: "All",
  Book: "Books",
  Theatre: "Theatre",
  Film: "Films",
  "TV Show": "TV",
  Exhibition: "Exhibitions"
};

const form = document.querySelector("#entry-form");
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-button");
const resetFormButton = document.querySelector("#reset-form");
const entriesList = document.querySelector("#entries-list");
const emptyState = document.querySelector("#empty-state");
const template = document.querySelector("#entry-template");
const searchInput = document.querySelector("#search");
const sortOrder = document.querySelector("#sort-order");
const formatTabs = document.querySelector("#format-tabs");
const entryCount = document.querySelector("#entry-count");
const favoriteFormat = document.querySelector("#favorite-format");
const averageRating = document.querySelector("#average-rating");
const revisitRate = document.querySelector("#revisit-rate");
const monthlyCount = document.querySelector("#monthly-count");
const featurePanel = document.querySelector("#feature-panel");
const featureTitle = document.querySelector("#feature-title");
const featureMeta = document.querySelector("#feature-meta");
const featureQuote = document.querySelector("#feature-quote");

let entries = loadEntries();
let editingId = null;
let activeFormat = "All";

form.dateConsumed.valueAsDate = new Date();
render();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const existingEntry = entries.find((item) => item.id === editingId);
  const uploadedPhoto = await getUploadedPhoto(formData.get("itemPhoto"));
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
    imageUrl: uploadedPhoto || existingEntry?.imageUrl || "",
    imageSource: uploadedPhoto ? "upload" : existingEntry?.imageSource || "",
    createdAt: editingId ? existingEntry?.createdAt : new Date().toISOString(),
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
sortOrder.addEventListener("change", render);

formatTabs.addEventListener("click", (event) => {
  const button = event.target.closest(".format-tab");
  if (!button) return;

  activeFormat = button.dataset.format;
  render();
});

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
    card.dataset.format = entry.format;
    renderEntryImage(card, entry);
    card.querySelector("h3").textContent = entry.title;
    card.querySelector(".meta-line").textContent = `${entry.format} - ${formatDate(entry.dateConsumed)}`;
    card.querySelector(".rating-badge").textContent = `${entry.rating}/5`;
    card.querySelector(".vibe").textContent = entry.vibe;
    card.querySelector('[data-field="stayedWithMe"]').textContent = entry.stayedWithMe;
    card.querySelector('[data-field="recommendTo"]').textContent = entry.recommendTo;
    card.querySelector('[data-field="similarWorks"]').textContent = entry.similarWorks;
    card.querySelector('[data-field="contentIdea"]').textContent = entry.contentIdea;
    card.querySelector(".revisit-pill").textContent = entry.wouldRevisit ? "Revisit shelf" : "One-time encounter";
    renderRatingMeter(card.querySelector(".rating-meter"), entry.rating);
    entriesList.append(card);
  });

  renderStats();
  renderFormatTabs();
  renderFeature();
}

function renderEntryImage(card, entry) {
  const media = card.querySelector(".entry-media");
  const image = card.querySelector(".entry-media img");
  const caption = card.querySelector(".entry-media figcaption");

  if (isStoredUpload(entry.imageUrl)) {
    media.classList.remove("generated");
    image.hidden = false;
    image.src = entry.imageUrl;
    image.alt = `${entry.title} ${entry.format} image`;
    caption.textContent = "Your photo";
    return;
  }

  media.classList.add("generated");
  media.dataset.initials = getInitials(entry.title);
  media.dataset.format = entry.format;
  image.hidden = true;
  image.removeAttribute("src");
  image.alt = "";
  caption.textContent = `${entry.format} poster`;
}

function renderRatingMeter(container, rating) {
  container.innerHTML = "";

  for (let index = 1; index <= 5; index += 1) {
    const segment = document.createElement("span");
    if (index <= rating) segment.classList.add("filled");
    container.append(segment);
  }
}

function renderStats() {
  const total = entries.length;
  const avg = total ? entries.reduce((sum, entry) => sum + entry.rating, 0) / total : 0;
  const revisits = total ? Math.round((entries.filter((entry) => entry.wouldRevisit).length / total) * 100) : 0;
  const now = new Date();
  const thisMonth = entries.filter((entry) => {
    const date = new Date(`${entry.dateConsumed}T00:00:00`);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  entryCount.textContent = String(total);
  averageRating.textContent = avg.toFixed(1);
  revisitRate.textContent = `${revisits}%`;
  monthlyCount.textContent = String(thisMonth);
  favoriteFormat.textContent = getMostCommonFormat();
}

function renderFormatTabs() {
  const counts = getFormatCounts();
  formatTabs.querySelectorAll(".format-tab").forEach((button) => {
    const format = button.dataset.format;
    button.classList.toggle("active", format === activeFormat);
    button.querySelector("span").textContent = counts[format] ?? 0;
  });
}

function renderFeature() {
  const latest = [...entries].sort((a, b) => new Date(b.dateConsumed) - new Date(a.dateConsumed))[0];
  featurePanel.classList.toggle("hidden", !latest);

  if (!latest) return;

  featureTitle.textContent = latest.title;
  featureMeta.textContent = `${latest.format} - ${formatDate(latest.dateConsumed)} - ${latest.rating}/5`;
  featureQuote.textContent = latest.stayedWithMe;
}

function getVisibleEntries() {
  const query = searchInput.value.trim().toLowerCase();

  return entries
    .filter((entry) => activeFormat === "All" || entry.format === activeFormat)
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
    .sort(sortEntries);
}

function sortEntries(a, b) {
  if (sortOrder.value === "oldest") return new Date(a.dateConsumed) - new Date(b.dateConsumed);
  if (sortOrder.value === "rating") return b.rating - a.rating || new Date(b.dateConsumed) - new Date(a.dateConsumed);
  if (sortOrder.value === "title") return a.title.localeCompare(b.title);
  return new Date(b.dateConsumed) - new Date(a.dateConsumed);
}

function getFormatCounts() {
  return ["All", ...formats].reduce((counts, format) => {
    counts[format] = format === "All"
      ? entries.length
      : entries.filter((entry) => entry.format === format).length;
    return counts;
  }, {});
}

function getMostCommonFormat() {
  if (!entries.length) return "Start your shelf.";

  const counts = formats.map((format) => ({
    format,
    count: entries.filter((entry) => entry.format === format).length
  }));
  const top = counts.sort((a, b) => b.count - a.count)[0];
  return top.count ? `Most saved: ${formatLabels[top.format]}` : "Start your shelf.";
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

function getUploadedPhoto(file) {
  if (!(file instanceof File) || !file.size) return Promise.resolve("");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function isStoredUpload(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function getInitials(title) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "Undated";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}
